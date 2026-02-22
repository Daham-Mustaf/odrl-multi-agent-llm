"""
Reasoner Evaluator
Evaluates the performance of the ODRL Reasoner Agent by comparing predictions against groundtruth.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from agents.reasoner.reasoner import Reasoner
from agents.text_parser.parser import TextParser


def _resolve_project_path(path: str) -> str:
    """Resolve relative paths from project root."""
    if os.path.isabs(path):
        return path
    return os.path.join(PROJECT_ROOT, path)


_MODEL_ERROR_HINTS = (
    "502",
    "503",
    "504",
    "bad gateway",
    "service unavailable",
    "gateway timeout",
    "connection error",
    "connection refused",
    "connection reset",
    "read timeout",
    "timed out",
    "rate limit",
    "api key",
    "unauthorized",
    "forbidden",
    "authentication",
    "invalid_request_error",
    "model_not_found",
    "provider",
    "litellm",
    "openai",
    "anthropic",
)


def _is_model_runtime_error(exc: Exception) -> bool:
    text = normalize_text(str(exc))
    if not text:
        return False
    return any(hint in text for hint in _MODEL_ERROR_HINTS)


def normalize_text(value: Any) -> str:
    """Normalize text for comparison"""
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip().lower()


def normalize_conflict_type(conflict_type: Any) -> Optional[str]:
    """Normalize conflict type"""
    if conflict_type is None or conflict_type == "":
        return None
    return normalize_text(conflict_type)


def _pick_first(row: Dict[str, Any], keys: List[str]) -> Any:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


def _to_gold_reasoning_from_row(row: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(row.get("gold_reasoning"), dict):
        return row["gold_reasoning"]

    expected_outcome = normalize_text(_pick_first(row, ["expected_outcome", "Expected Outcome", "outcome"]) or "")
    decision = "reject" if "reject" in expected_outcome else "approve"

    conflict_type = _pick_first(
        row,
        [
            "conflict",
            "conflict_type",
            "rejection_category",
            "rejection_category_description",
            "acceptance_category",
        ],
    )
    contradiction = _pick_first(
        row,
        [
            "specific_contradiction",
            "contradiction",
            "reason",
            "rejection_reason_detailed",
            "acceptance_reasoning_detailed",
        ],
    )

    issues: List[Dict[str, Any]] = []
    if decision == "reject":
        issues.append(
            {
                "category": "conflict",
                "severity": "high",
                "field": "policy_text",
                "policy_id": str(row.get("policy_id", "")),
                "message": str(contradiction or conflict_type or "Potential policy contradiction"),
                "conflict_type": str(conflict_type or ""),
            }
        )

    return {
        "decision": decision,
        "issues": issues,
        "recommendations": _pick_first(row, ["recommendation"]) or [],
        "reasoning": str(contradiction or ""),
        "risk_level": "high" if decision == "reject" else "low",
        "policies_analyzed": 1,
    }


def _normalize_eval_row(row: Dict[str, Any]) -> Dict[str, Any]:
    user_text = _pick_first(row, ["input", "Input", "policy_text", "text"])
    gold_reasoning = _to_gold_reasoning_from_row(row)
    gold_conflict = _pick_first(
        row,
        [
            "conflict",
            "conflict_type",
            "rejection_category",
            "rejection_category_description",
            "acceptance_category",
        ],
    )
    if not gold_conflict:
        for issue in gold_reasoning.get("issues", []) or []:
            conflict = (issue or {}).get("conflict_type")
            if conflict:
                gold_conflict = conflict
                break
    return {
        "input": user_text or "",
        "gold_conflict": normalize_conflict_type(gold_conflict) or "",
        "gold_reasoning": gold_reasoning,
    }


def _load_default_custom_model(config_path: str) -> Tuple[str, Dict[str, Any], float]:
    """Load the first model entry from custom_models.json."""
    config_path = _resolve_project_path(config_path)
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"custom_models.json not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list) or not data:
        raise ValueError("custom_models.json must be a non-empty list")

    first = data[0]
    model = first.get("value")
    if not model:
        raise ValueError("First custom model entry is missing 'value'")

    temperature = float(first.get("temperature_default", 0.3))
    return model, first, temperature


def _safe_json_dumps(payload: Any) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False, sort_keys=True)
    except Exception:
        return str(payload)


def _count_tokens(text: str, model: str) -> int:
    try:
        import tiktoken
    except Exception:
        return max(1, len(text) // 4) if text else 0

    try:
        encoding = tiktoken.encoding_for_model(model)
    except Exception:
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
        except Exception:
            return max(1, len(text) // 4) if text else 0
    return len(encoding.encode(text)) if text else 0


def run_reasoner_only(
    user_text: str,
    model: str,
    custom_config: Dict[str, Any],
    temperature: float,
) -> Dict[str, Any]:
    """
    Run parse -> reason only (no generator/validator).
    """
    parser = TextParser(model=model, temperature=temperature, custom_config=custom_config)
    reasoner = Reasoner(model=model, temperature=temperature, custom_config=custom_config)

    parser_start = time.time()
    parsed_data = parser.parse(user_text)
    parser_elapsed = int((time.time() - parser_start) * 1000)
    print("[ReasonerEval] Parser complete", flush=True)
    reasoner_start = time.time()
    reasoning = reasoner.reason(parsed_data, user_text)
    reasoner_elapsed = int((time.time() - reasoner_start) * 1000)
    print("[ReasonerEval] Reasoner complete", flush=True)

    parser_input_tokens = _count_tokens(user_text, model)
    parser_output_tokens = _count_tokens(_safe_json_dumps(parsed_data), model)
    reasoner_input_tokens = _count_tokens(
        _safe_json_dumps({"parsed_data": parsed_data, "original_text": user_text}), model
    )
    reasoner_output_tokens = _count_tokens(_safe_json_dumps(reasoning), model)
    total_input_tokens = parser_input_tokens + reasoner_input_tokens
    total_output_tokens = parser_output_tokens + reasoner_output_tokens

    return {
        "parsed_data": parsed_data,
        "reasoning": reasoning,
        "metrics": {
            "parser_input_tokens": parser_input_tokens,
            "parser_output_tokens": parser_output_tokens,
            "reasoner_input_tokens": reasoner_input_tokens,
            "reasoner_output_tokens": reasoner_output_tokens,
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "parser_time_ms": parser_elapsed,
            "reasoner_time_ms": reasoner_elapsed,
        },
    }


def extract_reasoner_output(result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract reasoner output from workflow result"""
    reasoning = result.get("reasoning", {})
    return {
        "decision": reasoning.get("decision", ""),
        "confidence": reasoning.get("confidence", 0.0),
        "issues": reasoning.get("issues", []),
        "recommendations": reasoning.get("recommendations", []),
        "reasoning": reasoning.get("reasoning", ""),
        "risk_level": reasoning.get("risk_level", ""),
        "policies_analyzed": reasoning.get("policies_analyzed", 0),
    }


def extract_primary_conflict(pred_reasoning: Dict[str, Any]) -> str:
    """Extract a single conflict label from reasoner output."""
    issues = pred_reasoning.get("issues", []) or []
    for issue in issues:
        conflict = normalize_conflict_type((issue or {}).get("conflict_type"))
        if conflict:
            return conflict
    return ""


def normalize_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize an issue for comparison"""
    return {
        "category": normalize_text(issue.get("category", "")),
        "severity": normalize_text(issue.get("severity", "")),
        "field": normalize_text(issue.get("field", "")),
        "policy_id": normalize_text(issue.get("policy_id", "")),
        "message": normalize_text(issue.get("message", "")),
        "conflict_type": normalize_conflict_type(issue.get("conflict_type")),
    }


def issues_to_set(issues: List[Dict[str, Any]]) -> set:
    """Convert issues list to a set of normalized tuples for comparison"""
    normalized_issues = [normalize_issue(issue) for issue in issues]
    # Create tuples based on key identifying fields
    issue_tuples = set()
    for issue in normalized_issues:
        # Use category, severity, field, and conflict_type as key identifiers
        key = (
            issue["category"],
            issue["severity"],
            issue["field"],
            issue["conflict_type"],
        )
        issue_tuples.add(key)
    return issue_tuples


def evaluate_decision(gold_decision: str, pred_decision: str) -> bool:
    """Evaluate if decision matches"""
    return normalize_text(gold_decision) == normalize_text(pred_decision)


def evaluate_issues(
    gold_issues: List[Dict[str, Any]], pred_issues: List[Dict[str, Any]]
) -> Dict[str, float]:
    """Evaluate issues detection performance"""
    gold_set = issues_to_set(gold_issues)
    pred_set = issues_to_set(pred_issues)

    if not gold_set and not pred_set:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "tp": 0, "fp": 0, "fn": 0}

    tp = len(gold_set & pred_set)
    fp = len(pred_set - gold_set)
    fn = len(gold_set - pred_set)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def evaluate_conflict_types(
    gold_issues: List[Dict[str, Any]], pred_issues: List[Dict[str, Any]]
) -> Dict[str, float]:
    """Evaluate conflict type detection performance"""
    gold_types = set()
    for issue in gold_issues:
        ct = normalize_conflict_type(issue.get("conflict_type"))
        if ct:
            gold_types.add(ct)

    pred_types = set()
    for issue in pred_issues:
        ct = normalize_conflict_type(issue.get("conflict_type"))
        if ct:
            pred_types.add(ct)

    if not gold_types and not pred_types:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "tp": 0, "fp": 0, "fn": 0}

    tp = len(gold_types & pred_types)
    fp = len(pred_types - gold_types)
    fn = len(gold_types - pred_types)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def evaluate_reasoner(
    gold_reasoning: Dict[str, Any], pred_reasoning: Dict[str, Any]
) -> Dict[str, Any]:
    """Evaluate reasoner output against groundtruth"""
    gold_decision = gold_reasoning.get("decision", "")
    pred_decision = pred_reasoning.get("decision", "")
    gold_issues = gold_reasoning.get("issues", [])
    pred_issues = pred_reasoning.get("issues", [])

    decision_correct = evaluate_decision(gold_decision, pred_decision)
    issues_metrics = evaluate_issues(gold_issues, pred_issues)
    conflict_types_metrics = evaluate_conflict_types(gold_issues, pred_issues)

    return {
        "decision_accuracy": 1.0 if decision_correct else 0.0,
        "decision_gold": gold_decision,
        "decision_pred": pred_decision,
        "issues": issues_metrics,
        "conflict_types": conflict_types_metrics,
        "gold_issues_count": len(gold_issues),
        "pred_issues_count": len(pred_issues),
    }


def evaluate_conflict_accuracy(gold_conflict: str, pred_conflict: str) -> Dict[str, Any]:
    """Evaluate only conflict label accuracy."""
    gold = normalize_conflict_type(gold_conflict) or ""
    pred = normalize_conflict_type(pred_conflict) or ""
    return {
        "conflict_accuracy": 1.0 if gold == pred else 0.0,
        "conflict_gold": gold,
        "conflict_pred": pred,
    }


def _load_dataset_rows(
    dataset_name: str,
    split: str,
    start: int = 0,
    end: Optional[int] = None,
    limit: Optional[int] = 5,
) -> List[Dict[str, Any]]:
    """Load rows from HuggingFace dataset"""
    try:
        from datasets import load_dataset
    except Exception as exc:
        raise RuntimeError(
            "Missing dependency: install 'datasets' to load HuggingFace datasets."
        ) from exc

    dataset = load_dataset(dataset_name)
    n = len(dataset[split])
    if end is not None:
        indices = range(start, min(end + 1, n))
    else:
        indices = range(start, min(start + (limit or 5), n))
    rows = dataset[split].select(indices)
    return [dict(row) for row in rows]


def _load_rows_from_json(
    path: str,
    start: int = 0,
    end: Optional[int] = None,
    limit: Optional[int] = 5,
) -> List[Dict[str, Any]]:
    """Load rows from JSON file"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows: List[Dict[str, Any]]
    if isinstance(data, list):
        rows = [dict(row) for row in data]
    elif isinstance(data, dict) and "policies" in data:
        # Support reasoner_GT.json format:
        # { "policies": [ { "policy_text": "...", "conflict": "...", ... } ] }
        policies = data.get("policies", [])
        if not isinstance(policies, list):
            raise ValueError("'policies' must be a list in reasoner GT JSON")

        rows = []
        for policy in policies:
            if not isinstance(policy, dict):
                continue

            policy_text = policy.get("policy_text", "")
            conflict = policy.get("conflict", "")
            conflict_primary = policy.get("conflict_primary", "")
            policy_id = policy.get("policy_id")

            # Build evaluator-compatible row schema.
            decision = "reject" if conflict else "approve"
            issues: List[Dict[str, Any]] = []
            if conflict:
                issues.append(
                    {
                        "category": "conflict",
                        "severity": "high",
                        "field": "policy_text",
                        "policy_id": str(policy_id) if policy_id is not None else "",
                        "message": f"Conflict detected: {conflict}",
                        "conflict_type": conflict,
                    }
                )

            rows.append(
                {
                    "input": policy_text,
                    "gold_reasoning": {
                        "decision": decision,
                        "issues": issues,
                        "recommendations": [],
                        "reasoning": conflict_primary or "",
                        "risk_level": "high" if conflict else "low",
                        "policies_analyzed": 1,
                    },
                }
            )
    else:
        raise ValueError(
            "JSON dataset must be either a list of evaluator rows or a dict containing 'policies'"
        )

    if end is not None:
        slice_end = min(end + 1, len(rows))
        return rows[start:slice_end]
    return rows[start : start + (limit or 5)]


def _save_evaluation_record(
    batch_dir: str,
    record_idx: int,
    user_text: str,
    gold_reasoning: Dict[str, Any],
    pred_reasoning: Dict[str, Any],
    evaluation: Dict[str, Any],
    model: str,
    temperature: float,
) -> str:
    """Save one evaluation record to a JSON file"""
    os.makedirs(batch_dir, exist_ok=True)
    filename = f"record_{record_idx:03d}.json"
    path = os.path.join(batch_dir, filename)

    payload = {
        "record_index": record_idx,
        "session": {
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "model": model,
            "temperature": temperature,
        },
        "user_input": user_text,
        "gold_reasoning": gold_reasoning,
        "predicted_reasoning": pred_reasoning,
        "evaluation": evaluation,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate ODRL Reasoner outputs")
    parser.add_argument("--dataset", type=str, default="KleinPenny/ODRL_Policies_Bench")
    parser.add_argument("--split", type=str, default="test")
    parser.add_argument("--limit", type=int, default=5, help="Number of rows when --end is not set (from --start)")
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="0-based start index of the range to evaluate (inclusive)",
    )
    parser.add_argument(
        "--end",
        type=int,
        default=None,
        help="0-based end index of the range (inclusive). If set, overrides --limit.",
    )
    parser.add_argument(
        "--dataset-json",
        type=str,
        default=os.path.join(
            "evaluation", "data", "reasoner", "Ground_Truth", "reasoner_GT.json"
        ),
        help="Path to reasoner ground truth JSON file.",
    )
    parser.add_argument(
        "--models",
        type=str,
        default=os.path.join("backend", "config", "custom_models.json"),
        help="Path to custom_models.json (first entry used when --model is not provided)",
    )
    parser.add_argument("--model", type=str, default=None, help="Override model value (e.g., custom:deepseek-chat)")
    parser.add_argument("--temperature", type=float, default=None, help="Override temperature")
    parser.add_argument(
        "--custom-config-json",
        type=str,
        default=None,
        help="Custom model config as JSON string (used when --model is provided)",
    )
    args = parser.parse_args()

    rows = _load_rows_from_json(
        _resolve_project_path(args.dataset_json),
        start=args.start,
        end=args.end,
        limit=args.limit,
    )

    if args.model:
        model = args.model
        temperature = args.temperature if args.temperature is not None else 0.3
        if args.custom_config_json:
            try:
                custom_config = json.loads(args.custom_config_json)
                if not isinstance(custom_config, dict):
                    raise ValueError("custom config must be a JSON object")
            except Exception as exc:
                raise ValueError(f"Invalid --custom-config-json: {exc}") from exc
        else:
            custom_config = {}
    else:
        model, custom_config, default_temperature = _load_default_custom_model(
            _resolve_project_path(args.models)
        )
        temperature = args.temperature if args.temperature is not None else default_temperature

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    results_dir = _resolve_project_path(
        os.path.join("evaluation", "evaluator", "results", "reasoner_evaluation")
    )
    batch_dir = os.path.join(results_dir, f"batch_{timestamp}")
    os.makedirs(batch_dir, exist_ok=True)
    print(f"EVAL_BATCH_DIR|path={os.path.relpath(batch_dir)}", flush=True)

    evaluations: List[Dict[str, Any]] = []
    conflict_correct_count = 0
    failed_records = 0
    reasoner_times_ms: List[float] = []

    total_rows = len(rows)
    for idx, row in enumerate(rows, 1):
        normalized = _normalize_eval_row(row)
        user_text = normalized.get("input") or ""
        gold_reasoning = normalized.get("gold_reasoning", {})
        gold_conflict = normalized.get("gold_conflict", "")
        row_error = ""
        result: Dict[str, Any] = {"metrics": {}}

        preview = (user_text or "").replace("\n", " ").replace("|", "/")[:160]
        print(f"EVAL_ITEM_START|idx={idx}|total={total_rows}|input={preview}", flush=True)

        if not user_text:
            available = ", ".join(sorted(row.keys()))
            row_error = (
                f"Row {idx} is missing input text. Expected one of: input, Input, policy_text, text. "
                f"Available keys: {available}"
            )
            failed_records += 1
            print(f"EVAL_ITEM_ERROR|idx={idx}|error={row_error}", flush=True)
            print(
                f"EVAL_ATTEMPT_FATAL|idx={idx}|error={row_error}",
                flush=True,
            )
            raise SystemExit(1)
        else:
            # Run parse -> reason only (stop after reasoner)
            try:
                result = run_reasoner_only(
                    user_text=user_text,
                    model=model,
                    custom_config=custom_config,
                    temperature=temperature,
                )
            except Exception as exc:
                row_error = str(exc).replace("\n", " ")[:1000]
                failed_records += 1
                print(f"EVAL_ITEM_ERROR|idx={idx}|error={row_error}", flush=True)
                if _is_model_runtime_error(exc):
                    print(
                        f"EVAL_ATTEMPT_MODEL_ERROR|idx={idx}|error={row_error}",
                        flush=True,
                    )
                    raise SystemExit(2)
                print(
                    f"EVAL_ATTEMPT_FATAL|idx={idx}|error={row_error}",
                    flush=True,
                )
                raise SystemExit(1)

        token_metrics = result.get("metrics", {})
        try:
            rt = token_metrics.get("reasoner_time_ms")
            if rt not in (None, ""):
                reasoner_times_ms.append(float(rt))
        except Exception:
            pass
        print(
            "EVAL_ITEM_TOKENS|"
            f"idx={idx}|"
            f"parser_in={token_metrics.get('parser_input_tokens', 0)}|"
            f"parser_out={token_metrics.get('parser_output_tokens', 0)}|"
            f"reasoner_in={token_metrics.get('reasoner_input_tokens', 0)}|"
            f"reasoner_out={token_metrics.get('reasoner_output_tokens', 0)}|"
            "generator_in=0|generator_out=0|validator_in=0|validator_out=0|"
            f"total_in={token_metrics.get('total_input_tokens', 0)}|"
            f"total_out={token_metrics.get('total_output_tokens', 0)}",
            flush=True,
        )

        pred_reasoning = extract_reasoner_output(result)
        if row_error:
            pred_reasoning["error"] = row_error

        # Evaluate only conflict label accuracy.
        pred_conflict = extract_primary_conflict(pred_reasoning)
        evaluation = evaluate_conflict_accuracy(gold_conflict, pred_conflict)
        if row_error:
            evaluation["conflict_accuracy"] = 0.0
            evaluation["conflict_pred"] = "__error__"
            evaluation["run_error"] = row_error
        evaluations.append(evaluation)

        if evaluation["conflict_accuracy"] > 0:
            conflict_correct_count += 1

        # Save individual record
        _save_evaluation_record(
            batch_dir=batch_dir,
            record_idx=idx,
            user_text=user_text,
            gold_reasoning=gold_reasoning,
            pred_reasoning=pred_reasoning,
            evaluation=evaluation,
            model=model,
            temperature=temperature,
        )
        print(f"EVAL_ITEM_DONE|idx={idx}", flush=True)

    # Compute aggregate metrics
    n = len(evaluations)
    aggregate_metrics = {
        "conflict_accuracy": conflict_correct_count / n if n > 0 else 0.0,
        "total_records": n,
        "failed_records": failed_records,
        "reasoner_avg_time_s": round(
            (sum(reasoner_times_ms) / len(reasoner_times_ms)) / 1000.0, 2
        ) if reasoner_times_ms else None,
    }

    # Save aggregate metrics
    metrics_path = os.path.join(batch_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(aggregate_metrics, f, ensure_ascii=False, indent=2)

    print("\n=== Reasoner Evaluation Results ===", flush=True)
    print(json.dumps(aggregate_metrics, ensure_ascii=False, indent=2), flush=True)
    print(f"\nBatch dir: {os.path.relpath(batch_dir)}", flush=True)
    print(f"Metrics saved: {os.path.relpath(metrics_path)}", flush=True)

if __name__ == "__main__":
    main()
