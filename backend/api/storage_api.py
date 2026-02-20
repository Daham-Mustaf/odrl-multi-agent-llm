# backend/api/storage_api.py
"""
Storage API for saving reasoning analyses and generated policies
FIXED for Windows path compatibility
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List, Dict, Any
import json
import csv
import re
import os
import time
from datetime import datetime
import logging
import subprocess
import threading
import uuid

logger = logging.getLogger(__name__)

# ============================================
# ROUTER SETUP
# ============================================
router = APIRouter(prefix="/api/storage", tags=["storage"])

# ============================================
# STORAGE CONFIGURATION
# ============================================
STORAGE_ROOT = Path("results")
REASONER_DIR = STORAGE_ROOT / "reasoner"
GENERATOR_DIR = STORAGE_ROOT / "generator"
VALIDATOR_DIR = STORAGE_ROOT / "validator"

# Create directories
for directory in [REASONER_DIR, GENERATOR_DIR, VALIDATOR_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

EVALUATOR_DIR = STORAGE_ROOT / "evaluator"
EVALUATOR_DIR.mkdir(parents=True, exist_ok=True)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EVALUATOR_SCRIPTS = {
    "workflow": PROJECT_ROOT / "evaluation" / "evaluator" / "workflow-evaluator.py",
    "reasoner": PROJECT_ROOT / "evaluation" / "evaluator" / "reasoner_evaluator.py",
}

_evaluator_runs: Dict[str, Dict[str, Any]] = {}
_evaluator_lock = threading.Lock()

# ============================================
# REQUEST MODELS
# ============================================
class SaveReasoningRequest(BaseModel):
    name: str
    description: Optional[str] = None
    reasoning_result: dict

class SaveGeneratorRequest(BaseModel):
    name: str
    description: Optional[str] = None
    odrl_turtle: str
    metadata: Optional[dict] = None


class EvaluatorRunRequest(BaseModel):
    evaluator: str  # workflow | reasoner
    limit: int = 5
    model: Optional[str] = None
    temperature: Optional[float] = None
    custom_model: Optional[Dict[str, Any]] = None

# ============================================
# HELPER FUNCTIONS
# ============================================
def create_safe_filename(name: str, timestamp: bool = True) -> str:
    """Create filesystem-safe filename"""
    safe_name = "".join(c for c in name if c.isalnum() or c in ('-', '_', ' '))
    safe_name = safe_name.replace(' ', '_')
    
    if timestamp:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{safe_name}_{ts}.json"
    return f"{safe_name}.json"


def _workflow_nodes_for(evaluator: str) -> List[str]:
    if evaluator == "workflow":
        return ["parser", "reasoner", "generator", "validator", "regeneration", "revalidation"]
    return ["parser", "reasoner"]


def _new_item(index: int, input_preview: str, nodes: List[str]) -> Dict[str, Any]:
    return {
        "index": index,
        "input_preview": input_preview,
        "status": "pending",
        "record_available": False,
        "stages": {node: "pending" for node in nodes},
        "stage_times": {
            node: {
                "started_at": None,
                "finished_at": None,
                "duration_ms": None,
            }
            for node in nodes
        },
        "tokens": {
            "parser_in": 0,
            "parser_out": 0,
            "reasoner_in": 0,
            "reasoner_out": 0,
            "generator_in": 0,
            "generator_out": 0,
            "validator_in": 0,
            "validator_out": 0,
            "total_in": 0,
            "total_out": 0,
        },
    }


def _set_batch_dir(run: Dict[str, Any], raw_path: str) -> None:
    candidate = Path((raw_path or "").strip())
    if not str(candidate):
        return
    if not candidate.is_absolute():
        candidate = (PROJECT_ROOT / candidate).resolve()
    run["batch_dir"] = candidate


def _record_path_for(run: Dict[str, Any], item_index: int) -> Optional[Path]:
    batch_dir = run.get("batch_dir")
    if not isinstance(batch_dir, Path):
        return None
    return batch_dir / f"record_{item_index:03d}.json"


def _refresh_item_record_status(run: Dict[str, Any], item_index: int) -> None:
    progress = run.get("progress", {})
    items: List[Dict[str, Any]] = progress.get("items", [])
    if not (1 <= item_index <= len(items)):
        return
    item = items[item_index - 1]
    record_path = _record_path_for(run, item_index)
    item["record_available"] = bool(record_path and record_path.exists())


def _refresh_record_statuses(run: Dict[str, Any]) -> None:
    progress = run.get("progress", {})
    items: List[Dict[str, Any]] = progress.get("items", [])
    for item in items:
        idx = int(item.get("index", 0) or 0)
        if idx > 0:
            _refresh_item_record_status(run, idx)


def _set_stage_running(item: Dict[str, Any], nodes: List[str], stage: str) -> None:
    for node in nodes:
        if item["stages"][node] == "running":
            item["stages"][node] = "pending"
    if stage in item["stages"]:
        item["stages"][stage] = "running"
        stage_time = item["stage_times"].get(stage)
        if stage_time and stage_time.get("started_at") is None:
            stage_time["started_at"] = time.time()


def _mark_stage_complete(item: Dict[str, Any], nodes: List[str], stage: str) -> None:
    if stage in item["stages"]:
        item["stages"][stage] = "complete"
        stage_time = item["stage_times"].get(stage)
        if stage_time:
            now = time.time()
            if stage_time.get("started_at") is None:
                stage_time["started_at"] = now
            stage_time["finished_at"] = now
            stage_time["duration_ms"] = int((now - stage_time["started_at"]) * 1000)
    # Auto-advance only for deterministic main chain.
    auto_next = {
        "parser": "reasoner",
        "reasoner": "generator",
        "generator": "validator",
    }
    nxt = auto_next.get(stage)
    if nxt and nxt in item["stages"] and item["stages"][nxt] == "pending":
        item["stages"][nxt] = "running"
        next_stage_time = item["stage_times"].get(nxt)
        if next_stage_time and next_stage_time.get("started_at") is None:
            next_stage_time["started_at"] = time.time()


def _mark_unstarted_as_skipped(item: Dict[str, Any], nodes: List[str]) -> None:
    for node in nodes:
        stage_time = item["stage_times"].get(node) or {}
        started = stage_time.get("started_at")
        finished = stage_time.get("finished_at")
        if started is None and finished is None and item["stages"].get(node) in {"pending", "running"}:
            item["stages"][node] = "skipped"


def _normalize_progress_items(progress: Dict[str, Any], evaluator: str) -> None:
    nodes = _workflow_nodes_for(evaluator)
    terminal_states = {"complete", "skipped", "cancelled"}
    items: List[Dict[str, Any]] = progress.get("items", [])

    for item in items:
        stages = item.get("stages", {})
        if not stages:
            continue
        if item.get("status") == "cancelled":
            continue
        # If all stages are terminal, force item into completed.
        if all(stages.get(node) in terminal_states for node in nodes if node in stages):
            item["status"] = "completed"

    # Keep active_index consistent with completed items.
    for item in items:
        if item.get("status") in {"pending", "running"}:
            progress["active_index"] = item.get("index")
            break
    else:
        progress["active_index"] = None


def _mark_active_item_cancelled(progress: Dict[str, Any], evaluator: str) -> None:
    nodes = _workflow_nodes_for(evaluator)
    items: List[Dict[str, Any]] = progress.get("items", [])
    active_idx = progress.get("active_index")

    target = None
    if isinstance(active_idx, int) and 1 <= active_idx <= len(items):
        target = items[active_idx - 1]
    else:
        for it in items:
            if it.get("status") == "running":
                target = it
                break

    if target is None:
        return

    target["status"] = "cancelled"

    cancelled_node = None
    for node in nodes:
        if target["stages"].get(node) == "running":
            cancelled_node = node
            break
    if cancelled_node is None:
        for node in nodes:
            if target["stages"].get(node) == "pending":
                cancelled_node = node
                break
    if cancelled_node is None:
        for node in reversed(nodes):
            if target["stages"].get(node) == "complete":
                cancelled_node = node
                break

    if cancelled_node is not None:
        target["stages"][cancelled_node] = "cancelled"
        stage_time = target.get("stage_times", {}).get(cancelled_node)
        if stage_time:
            now = time.time()
            if stage_time.get("started_at") is None:
                stage_time["started_at"] = now
            stage_time["finished_at"] = now
            stage_time["duration_ms"] = int((now - stage_time["started_at"]) * 1000)

    progress["active_index"] = None


def _parse_progress_line(run: Dict[str, Any], line: str) -> None:
    evaluator = run["evaluator"]
    nodes = _workflow_nodes_for(evaluator)
    progress = run["progress"]
    items: List[Dict[str, Any]] = progress["items"]
    stripped_line = line.strip()

    if stripped_line.startswith("EVAL_BATCH_DIR|"):
        fields = {}
        for part in stripped_line.split("|")[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                fields[k] = v
        _set_batch_dir(run, fields.get("path", ""))
        _refresh_record_statuses(run)
        return

    if stripped_line.startswith("Batch dir:"):
        _set_batch_dir(run, stripped_line.split("Batch dir:", 1)[1])
        _refresh_record_statuses(run)
        return

    if stripped_line.startswith("EVAL_ITEM_START|"):
        fields = {}
        for part in stripped_line.split("|")[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                fields[k] = v
        idx = int(fields.get("idx", "0"))
        total = int(fields.get("total", "0"))
        input_preview = fields.get("input", "").strip()[:180]
        progress["total"] = max(progress["total"], total)
        while len(items) < idx:
            items.append(_new_item(len(items) + 1, "", nodes))
        item = items[idx - 1]
        item["input_preview"] = input_preview or item["input_preview"]
        item["status"] = "running"
        _set_stage_running(item, nodes, nodes[0])
        progress["active_index"] = idx
        return

    if stripped_line.startswith("EVAL_ITEM_DONE|"):
        fields = {}
        for part in stripped_line.split("|")[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                fields[k] = v
        idx = int(fields.get("idx", "0"))
        if 0 < idx <= len(items):
            item = items[idx - 1]
            item["status"] = "completed"
            _mark_unstarted_as_skipped(item, nodes)
            for node in nodes:
                if item["stages"][node] == "running":
                    _mark_stage_complete(item, nodes, node)
            progress["active_index"] = idx + 1 if idx < progress["total"] else None
            _refresh_item_record_status(run, idx)
        return

    if stripped_line.startswith("EVAL_ITEM_TOKENS|"):
        fields = {}
        for part in stripped_line.split("|")[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                fields[k] = v
        idx = int(fields.get("idx", "0"))
        if 0 < idx <= len(items):
            item = items[idx - 1]
            tokens = item.get("tokens", {})
            for key in [
                "parser_in", "parser_out",
                "reasoner_in", "reasoner_out",
                "generator_in", "generator_out",
                "validator_in", "validator_out",
                "total_in", "total_out",
            ]:
                try:
                    tokens[key] = int(float(fields.get(key, "0") or 0))
                except Exception:
                    tokens[key] = 0
            item["tokens"] = tokens

            # Recompute cumulative tokens from available items.
            total_in = 0
            total_out = 0
            for it in items:
                t = it.get("tokens") or {}
                total_in += int(t.get("total_in", 0) or 0)
                total_out += int(t.get("total_out", 0) or 0)
            progress["tokens"] = {"total_in": total_in, "total_out": total_out}
        return

    if not items:
        return

    active_idx = progress.get("active_index") or len(items)
    if active_idx < 1 or active_idx > len(items):
        return
    item = items[active_idx - 1]
    if item["status"] != "running":
        item["status"] = "running"

    if "[Workflow] Parser complete" in line or "[ReasonerEval] Parser complete" in line:
        _mark_stage_complete(item, nodes, "parser")
    elif "[Workflow] Reasoner complete" in line or "[ReasonerEval] Reasoner complete" in line:
        _mark_stage_complete(item, nodes, "reasoner")
    elif "[Workflow] Generator complete" in line:
        _mark_stage_complete(item, nodes, "generator")
    elif "[Workflow] Validator complete" in line:
        _mark_stage_complete(item, nodes, "validator")
    elif "[Workflow] Regeneration start" in line:
        _set_stage_running(item, nodes, "regeneration")
    elif "[Workflow] Regeneration complete" in line:
        _mark_stage_complete(item, nodes, "regeneration")
    elif "[Workflow] Revalidation start" in line:
        _set_stage_running(item, nodes, "revalidation")
    elif "[Workflow] Revalidation complete" in line:
        _mark_stage_complete(item, nodes, "revalidation")


def _extract_metrics_path(logs: str) -> Optional[Path]:
    matches = re.findall(r"Metrics saved:\s*(.+)", logs)
    if not matches:
        return None
    path = Path(matches[-1].strip())
    return path if path.exists() else None


def _load_metrics_table(evaluator: str, metrics_path: Path) -> Optional[Dict[str, Any]]:
    try:
        if evaluator == "reasoner":
            with open(metrics_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            rows = [
                ["decision_accuracy", data.get("decision_accuracy", 0.0)],
                ["issues.precision", data.get("issues", {}).get("precision", 0.0)],
                ["issues.recall", data.get("issues", {}).get("recall", 0.0)],
                ["issues.f1", data.get("issues", {}).get("f1", 0.0)],
                ["conflict_types.precision", data.get("conflict_types", {}).get("precision", 0.0)],
                ["conflict_types.recall", data.get("conflict_types", {}).get("recall", 0.0)],
                ["conflict_types.f1", data.get("conflict_types", {}).get("f1", 0.0)],
            ]
            return {"columns": ["Metric", "Value"], "rows": rows}

        with open(metrics_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            rows = [[r.get("Field", ""), r.get("Metric", ""), r.get("Parsed Data", ""), r.get("Turtle Final Output", ""), r.get("Delta (Final - Parser)", "")] for r in reader]
        return {
            "columns": ["Field", "Metric", "Parsed Data", "Turtle Final Output", "Delta"],
            "rows": rows,
        }
    except Exception:
        logger.exception("Failed to load metrics table from %s", metrics_path)
        return None


def _append_run_log(run_id: str, message: str) -> None:
    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            return
        run["logs"] += message
        log_path: Path = run["log_path"]
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(message)
    except Exception:
        logger.exception("Failed writing evaluator log for %s", run_id)


def _start_evaluator_runner(run_id: str) -> None:
    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            return
        process: subprocess.Popen = run["process"]

    assert process.stdout is not None
    for line in process.stdout:
        with _evaluator_lock:
            run = _evaluator_runs.get(run_id)
            if run is not None:
                _parse_progress_line(run, line)
        _append_run_log(run_id, line)

    exit_code = process.wait()
    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            return
        if run.get("status") == "cancelled":
            run["exit_code"] = exit_code
            run["finished_at"] = datetime.utcnow().isoformat() + "Z"
            return
        run["status"] = "completed" if exit_code == 0 else "failed"
        run["exit_code"] = exit_code
        run["finished_at"] = datetime.utcnow().isoformat() + "Z"
        if run["status"] == "completed":
            # Final cleanup to prevent last item lingering as pending/running.
            progress = run.get("progress", {})
            items = progress.get("items", [])
            nodes = _workflow_nodes_for(run.get("evaluator", "reasoner"))
            for item in items:
                _mark_unstarted_as_skipped(item, nodes)
                if item.get("status") in {"pending", "running"}:
                    item["status"] = "completed"
            _normalize_progress_items(progress, run.get("evaluator", "reasoner"))
        metrics_path = _extract_metrics_path(run["logs"])
        run["metrics_table"] = _load_metrics_table(run["evaluator"], metrics_path) if metrics_path else None

# ============================================
# REASONING STORAGE
# ============================================
@router.post("/reasoning/save")
async def save_reasoning_analysis(request: SaveReasoningRequest):
    """Save reasoning analysis to results/reasoner/"""
    try:
        filename = create_safe_filename(request.name)
        filepath = REASONER_DIR / filename
        
        data = {
            "name": request.name,
            "description": request.description,
            "saved_at": datetime.now().isoformat(),
            "reasoning_result": request.reasoning_result
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved reasoning: {filename}")
        
        return {
            "success": True,
            "message": f"Analysis '{request.name}' saved successfully",
            "filename": filename,
            "path": f"results/reasoner/{filename}"
        }
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

# @router.get("/reasoning/list")
# async def list_reasoning_analyses():
#     """List all saved reasoning analyses"""
#     try:
#         analyses = []
#         for filepath in sorted(REASONER_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
#             with open(filepath, 'r', encoding='utf-8') as f:
#                 data = json.load(f)
            
#             result = data.get("reasoning_result", {})
#             analyses.append({
#                 "filename": filepath.name,
#                 "name": data.get("name"),
#                 "description": data.get("description"),
#                 "saved_at": data.get("saved_at"),
#                 "overall_status": result.get("overall_status"),
#                 "num_policies": len(result.get("policies", [])),
#                 "model_used": result.get("model_used")
#             })
        
#         return {"total": len(analyses), "analyses": analyses}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/reasoning/{filename}")
# async def get_reasoning_analysis(filename: str):
#     """Get specific reasoning analysis"""
#     try:
#         filepath = REASONER_DIR / filename
#         if not filepath.exists():
#             raise HTTPException(status_code=404, detail="Not found")
        
#         with open(filepath, 'r', encoding='utf-8') as f:
#             return json.load(f)
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.delete("/reasoning/{filename}")
# async def delete_reasoning_analysis(filename: str):
#     """Delete reasoning analysis"""
#     try:
#         filepath = REASONER_DIR / filename
#         if not filepath.exists():
#             raise HTTPException(status_code=404, detail="Not found")
        
#         filepath.unlink()
#         return {"success": True, "message": "Deleted successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GENERATOR STORAGE - FIXED
# ============================================
@router.post("/generator/save")
async def save_generated_policy(request: SaveGeneratorRequest):
    """Save generated ODRL policy"""
    try:
        filename = create_safe_filename(request.name)
        filepath = GENERATOR_DIR / filename
        
        data = {
            "name": request.name,
            "description": request.description,
            "saved_at": datetime.now().isoformat(),
            "odrl_turtle": request.odrl_turtle,
            "metadata": request.metadata
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved policy: {filename}")
        
        return {
            "success": True,
            "message": f"Policy '{request.name}' saved successfully",
            "filename": filename,
            "path": f"results/generator/{filename}"
        }
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")


@router.post("/evaluators/run")
async def run_evaluator(request: EvaluatorRunRequest):
    evaluator = request.evaluator.strip().lower()
    if evaluator not in EVALUATOR_SCRIPTS:
        raise HTTPException(status_code=400, detail="evaluator must be 'workflow' or 'reasoner'")
    if request.limit < 1 or request.limit > 50:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 50")

    script_path = EVALUATOR_SCRIPTS[evaluator]
    if not script_path.exists():
        raise HTTPException(status_code=500, detail=f"Evaluator script not found: {script_path}")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    run_id = f"{evaluator}_{timestamp}_{uuid.uuid4().hex[:8]}"
    log_path = EVALUATOR_DIR / f"{run_id}.log"

    cmd = ["uv", "run", "--project", "backend", "python", "-u", str(script_path), "--limit", str(request.limit)]
    if request.model:
        cmd.extend(["--model", request.model])
    if request.temperature is not None:
        cmd.extend(["--temperature", str(request.temperature)])
    if request.custom_model:
        cmd.extend(["--custom-config-json", json.dumps(request.custom_model)])

    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        process = subprocess.Popen(
            cmd,
            cwd=str(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start evaluator: {exc}") from exc

    with _evaluator_lock:
        _evaluator_runs[run_id] = {
            "run_id": run_id,
            "evaluator": evaluator,
            "limit": request.limit,
            "model": request.model or "default-from-custom-models",
            "status": "running",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": None,
            "exit_code": None,
            "process": process,
            "logs": "",
            "log_path": log_path,
            "progress": {"total": request.limit, "active_index": None, "items": []},
            "metrics_table": None,
            "tokens": {"total_in": 0, "total_out": 0},
            "batch_dir": None,
        }

    _append_run_log(run_id, f"[Evaluator] Started {evaluator} with limit={request.limit}\n")
    thread = threading.Thread(target=_start_evaluator_runner, args=(run_id,), daemon=True)
    thread.start()

    return {"run_id": run_id, "status": "running"}


@router.get("/evaluators/run/{run_id}")
async def get_evaluator_run(run_id: str, offset: int = 0):
    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="run_id not found")

        logs: str = run["logs"]
        safe_offset = max(0, min(offset, len(logs)))
        new_logs = logs[safe_offset:]
        new_offset = len(logs)
        _normalize_progress_items(run.get("progress", {}), run.get("evaluator", "reasoner"))
        _refresh_record_statuses(run)

        response = {
            "run_id": run_id,
            "evaluator": run["evaluator"],
            "status": run["status"],
            "exit_code": run["exit_code"],
            "created_at": run["created_at"],
            "finished_at": run["finished_at"],
            "logs": new_logs,
            "offset": new_offset,
            "progress": run["progress"],
            "metrics_table": run["metrics_table"],
        }
    return response


@router.post("/evaluators/run/{run_id}/stop")
async def stop_evaluator_run(run_id: str):
    response_payload: Dict[str, Any]
    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="run_id not found")
        process: subprocess.Popen = run["process"]
        current_status = run.get("status")
        if current_status in {"completed", "failed", "cancelled"}:
            _normalize_progress_items(run.get("progress", {}), run.get("evaluator", "reasoner"))
            return {
                "run_id": run_id,
                "status": current_status,
                "progress": run.get("progress"),
                "metrics_table": run.get("metrics_table"),
            }
        run["status"] = "cancelled"
        run["finished_at"] = datetime.utcnow().isoformat() + "Z"
        _mark_active_item_cancelled(run.get("progress", {}), run.get("evaluator", "reasoner"))
        _normalize_progress_items(run.get("progress", {}), run.get("evaluator", "reasoner"))
        response_payload = {
            "run_id": run_id,
            "status": "cancelled",
            "progress": run.get("progress"),
            "metrics_table": run.get("metrics_table"),
        }

    try:
        process.terminate()
    except Exception:
        logger.exception("Failed to terminate evaluator run %s", run_id)

    return response_payload


@router.get("/evaluators/run/{run_id}/record/{item_index}")
async def get_evaluator_record(run_id: str, item_index: int):
    if item_index < 1:
        raise HTTPException(status_code=400, detail="item_index must be >= 1")

    with _evaluator_lock:
        run = _evaluator_runs.get(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="run_id not found")
        _refresh_item_record_status(run, item_index)
        record_path = _record_path_for(run, item_index)
        if not record_path:
            raise HTTPException(status_code=404, detail="Record directory not available yet")
        if not record_path.exists() or not record_path.is_file():
            raise HTTPException(status_code=404, detail=f"Record for input {item_index} not found")

    try:
        with open(record_path, "r", encoding="utf-8") as f:
            content = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read record file: {exc}") from exc

    return {
        "run_id": run_id,
        "item_index": item_index,
        "filename": record_path.name,
        "content": content,
    }

# @router.get("/generator/list")
# async def list_generated_policies():
#     """List all saved generated policies"""
#     try:
#         policies = []
#         for filepath in sorted(GENERATOR_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
#             with open(filepath, 'r', encoding='utf-8') as f:
#                 data = json.load(f)
            
#             policies.append({
#                 "filename": filepath.name,
#                 "name": data.get("name"),
#                 "description": data.get("description"),
#                 "saved_at": data.get("saved_at"),
#                 "metadata": data.get("metadata", {})
#             })
        
#         return {"total": len(policies), "policies": policies}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # ============================================
# # EXPORT ALL
# # ============================================
# @router.get("/export/all")
# async def export_all_analyses():
#     """Export all analyses for evaluation"""
#     try:
#         all_data = {
#             "export_date": datetime.now().isoformat(),
#             "reasoning_analyses": [],
#             "generated_policies": []
#         }
        
#         # Collect reasoning analyses
#         for filepath in REASONER_DIR.glob("*.json"):
#             with open(filepath, 'r') as f:
#                 all_data["reasoning_analyses"].append(json.load(f))
        
#         # Collect generated policies
#         for filepath in GENERATOR_DIR.glob("*.json"):
#             with open(filepath, 'r') as f:
#                 all_data["generated_policies"].append(json.load(f))
        
#         all_data["totals"] = {
#             "reasoning": len(all_data["reasoning_analyses"]),
#             "generated": len(all_data["generated_policies"])
#         }
        
#         return all_data
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/stats")
# async def get_storage_stats():
#     """Get storage statistics"""
#     try:
#         return {
#             "storage_root": str(STORAGE_ROOT.absolute()),
#             "directories": {
#                 "reasoner": {
#                     "path": str(REASONER_DIR),
#                     "count": len(list(REASONER_DIR.glob("*.json")))
#                 },
#                 "generator": {
#                     "path": str(GENERATOR_DIR),
#                     "count": len(list(GENERATOR_DIR.glob("*.json")))
#                 },
#                 "validator": {
#                     "path": str(VALIDATOR_DIR),
#                     "count": len(list(VALIDATOR_DIR.glob("*.json")))
#                 }
#             }
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
