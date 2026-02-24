from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
WORKFLOW_EVALUATOR_PATH = os.path.join(PROJECT_ROOT, "evaluation", "evaluator", "workflow-evaluator.py")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from agents.generator.generator import Generator


def _resolve_project_path(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.join(PROJECT_ROOT, path)


def _load_workflow_evaluator_module():
    spec = importlib.util.spec_from_file_location("workflow_evaluator", WORKFLOW_EVALUATOR_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load workflow evaluator module from: {WORKFLOW_EVALUATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_wf = _load_workflow_evaluator_module()
extract_gold_row = _wf.extract_gold_row
extract_from_parsed_data = _wf.extract_from_parsed_data
extract_from_turtle = _wf.extract_from_turtle
evaluate_predictions = _wf.evaluate_predictions
DATASET_FIELDS = _wf.DATASET_FIELDS
_load_default_custom_model = _wf._load_default_custom_model
_load_rows_from_json = _wf._load_rows_from_json
_load_dataset_rows = _wf._load_dataset_rows
_is_model_runtime_error = _wf._is_model_runtime_error


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


def run_generator_only(
    user_text: str,
    model: str,
    custom_config: Dict[str, Any],
    temperature: float,
) -> Dict[str, Any]:
    generator = Generator(model=model, temperature=temperature, custom_config=custom_config)

    total_start = time.time()
    parsed_data: Dict[str, Any] = {}

    generator_start = time.time()
    generation = generator.generate(
        parsed_data=parsed_data,
        original_text=user_text,
        reasoning=None,
        attempt_number=1,
    )
    generator_elapsed = int((time.time() - generator_start) * 1000)
    print("[GeneratorEval] Generator complete", flush=True)

    generator_input_tokens = _count_tokens(
        _safe_json_dumps({"parsed_data": parsed_data, "original_text": user_text}),
        model,
    )
    generator_output_tokens = _count_tokens(_safe_json_dumps(generation), model)

    total_elapsed_ms = int((time.time() - total_start) * 1000)
    total_input_tokens = generator_input_tokens
    total_output_tokens = generator_output_tokens

    return {
        "generation": generation,
        "stage_times": {
            "generator_time_ms": generator_elapsed,
        },
        "metrics": {
            "generator": {
                "time_ms": generator_elapsed,
                "input_tokens": generator_input_tokens,
                "output_tokens": generator_output_tokens,
            },
            "total": {
                "time_ms": total_elapsed_ms,
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
            },
        },
    }


def _format_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _format_metric(value: Any) -> str:
    try:
        if value is None or value == "":
            return ""
        return f"{float(value):.4f}"
    except Exception:
        return str(value)


def _compute_delta(parsed_value: Any, generation_value: Any) -> str:
    try:
        if parsed_value is None or generation_value is None:
            return ""
        return _format_metric(float(generation_value) - float(parsed_value))
    except Exception:
        return ""


def _format_seconds(value: Any) -> str:
    try:
        if value is None or value == "":
            return ""
        return f"{float(value):.2f}"
    except Exception:
        return str(value)


def _display_seconds(value: Any) -> str:
    formatted = _format_seconds(value)
    return formatted if formatted else "-"


def _compute_cost(input_tokens: Any, output_tokens: Any, rate_key: str) -> str:
    rates = {
        "gpt-4.1": {"input": 2.0, "output": 8.0},
        "gpt-5.1": {"input": 1.25, "output": 10.0},
        "gpt-5.2": {"input": 1.75, "output": 14.0},
        "deepseek-chat": {"input": 0.28, "output": 0.42},
    }.get(rate_key, {})
    if not rates:
        return ""
    try:
        input_cost = (float(input_tokens) / 1_000_000.0) * float(rates.get("input", 0.0))
        output_cost = (float(output_tokens) / 1_000_000.0) * float(rates.get("output", 0.0))
        return f"{(input_cost + output_cost):.4f}"
    except Exception:
        return ""


def _write_record_file(
    output_path: str,
    gold_rows: List[Dict[str, Any]],
    generation_preds: List[Dict[str, Any]],
) -> None:
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "Record",
                "Column",
                "Input",
                "Gold",
                "Generation Output",
            ]
        )
        for idx, (gold, generation) in enumerate(zip(gold_rows, generation_preds), 1):
            writer.writerow([idx, "Input", _format_value(gold.get("input")), "", ""])
            for label, key in DATASET_FIELDS:
                writer.writerow(
                    [
                        idx,
                        label,
                        "",
                        _format_value(gold.get(key)),
                        _format_value(generation.get(key)),
                    ]
                )
            writer.writerow([])


def _write_metrics_file(output_path: str, metrics: Dict[str, Any]) -> None:
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Field", "Metric", "Generation Output"])

        generation = metrics.get("generation_output", {})
        generation_scalar = generation.get("scalar_accuracy", {})
        writer.writerow(["Scalar (Exact Match)", "", ""])
        for field in ["policy_type"]:
            if field not in generation_scalar:
                continue
            g_val = generation_scalar.get(field, "")
            writer.writerow([field, "accuracy", _format_metric(g_val)])
        writer.writerow([])

        generation_lists = generation.get("list_metrics", {})
        writer.writerow(["List Metrics (P/R/F1)", "", ""])
        for field in ["permission_actions", "permission_triplets", "prohibition_actions", "prohibition_triplets"]:
            if field not in generation_lists:
                continue
            g_metrics = generation_lists.get(field, {})
            for metric_name in ("precision", "recall", "f1"):
                writer.writerow([field, metric_name, _format_metric(g_metrics.get(metric_name))])
        writer.writerow([])

        writer.writerow(["End-to-End (Exact Match)", "", ""])
        writer.writerow(
            [
                "end_to_end_accuracy",
                "accuracy",
                _format_metric(generation.get("end_to_end_accuracy", "")),
            ]
        )
        writer.writerow([])

        avg_stage_times = metrics.get("avg_stage_times_seconds", {})
        writer.writerow(["Average Runtime (s)", "", ""])
        writer.writerow(["generator_avg_time_s", "seconds", _format_seconds(avg_stage_times.get("generator", ""))])


def _write_time_metrics_file(output_path: str, runtime_rows: List[Dict[str, Any]]) -> None:
    if not runtime_rows:
        return
    fieldnames = [
        "record",
        "input",
        "generator_time_ms",
        "total_time_ms",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in runtime_rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def _write_token_metrics_file(output_path: str, runtime_rows: List[Dict[str, Any]]) -> None:
    if not runtime_rows:
        return
    fieldnames = [
        "record",
        "input",
        "generator_input_tokens",
        "generator_output_tokens",
        "total_input_tokens",
        "total_output_tokens",
        "cost_gpt-4.1_usd",
        "cost_gpt-5.1_usd",
        "cost_gpt-5.2_usd",
        "cost_deepseek-chat_usd",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in runtime_rows:
            total_input = row.get("total_input_tokens", "")
            total_output = row.get("total_output_tokens", "")
            row_with_costs = {key: row.get(key, "") for key in fieldnames}
            row_with_costs["cost_gpt-4.1_usd"] = _compute_cost(total_input, total_output, "gpt-4.1")
            row_with_costs["cost_gpt-5.1_usd"] = _compute_cost(total_input, total_output, "gpt-5.1")
            row_with_costs["cost_gpt-5.2_usd"] = _compute_cost(total_input, total_output, "gpt-5.2")
            row_with_costs["cost_deepseek-chat_usd"] = _compute_cost(total_input, total_output, "deepseek-chat")
            writer.writerow(row_with_costs)


def _save_evaluation_record(
    batch_dir: str,
    record_idx: int,
    user_text: str,
    gold_row: Dict[str, Any],
    result: Dict[str, Any],
    model: str,
    temperature: float,
    generation_pred: Dict[str, Any],
    runtime_row: Dict[str, Any],
    run_error: str = "",
) -> str:
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
        "gold": gold_row,
        "generation": result.get("generation"),
        "final_output": (result.get("generation") or {}).get("odrl_turtle"),
        "metrics": result.get("metrics"),
        "extracted_generation_pred": generation_pred,
        "runtime": runtime_row,
        "run_error": run_error,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate ODRL generator outputs")
    parser.add_argument("--dataset", type=str, default="KleinPenny/ODRL_Policies_Bench")
    parser.add_argument("--split", type=str, default="test")
    parser.add_argument("--limit", type=int, default=5, help="Number of rows when --end is not set (from --start)")
    parser.add_argument("--start", type=int, default=0, help="0-based start index (inclusive)")
    parser.add_argument("--end", type=int, default=None, help="0-based end index (inclusive). If set, overrides --limit.")
    parser.add_argument(
        "--dataset-json",
        type=str,
        default=os.path.join("evaluation", "data", "text2policy", "Ground_Truth", "text2ttl_GT.jsonl"),
        help="Path to text2policy ground truth JSON/JSONL",
    )
    parser.add_argument(
        "--models",
        type=str,
        default=os.path.join("backend", "config", "custom_models.json"),
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

    if args.dataset_json:
        rows = _load_rows_from_json(
            _resolve_project_path(args.dataset_json),
            start=args.start,
            end=args.end,
            limit=args.limit,
        )
    else:
        rows = _load_dataset_rows(
            args.dataset,
            args.split,
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
    results_dir = _resolve_project_path(os.path.join("evaluation", "evaluator", "results", "generator_evaluation"))
    batch_dir = os.path.join(results_dir, f"batch_{timestamp}")
    os.makedirs(batch_dir, exist_ok=True)
    print(f"EVAL_BATCH_DIR|path={os.path.relpath(batch_dir)}", flush=True)

    gold_rows: List[Dict[str, Any]] = []
    generation_preds: List[Dict[str, Any]] = []
    runtime_rows: List[Dict[str, Any]] = []
    failed_records = 0

    total_rows = len(rows)
    for idx, row in enumerate(rows, 1):
        gold = extract_gold_row(row)
        user_text = gold.get("input") or ""
        preview = (user_text or "").replace("\n", " ").replace("|", "/")[:160]
        print(f"EVAL_ITEM_START|idx={idx}|total={total_rows}|input={preview}", flush=True)
        row_error = ""
        result: Dict[str, Any] = {}
        generation_pred: Dict[str, Any] = {}
        runtime_row: Dict[str, Any] = {
            "record": idx,
            "input": user_text,
            "generator_time_ms": "",
            "total_time_ms": "",
            "generator_input_tokens": "",
            "generator_output_tokens": "",
            "total_input_tokens": "",
            "total_output_tokens": "",
        }

        try:
            if not user_text:
                raise ValueError(f"Row {idx} is missing Input text")

            result = run_generator_only(
                user_text=user_text,
                model=model,
                custom_config=custom_config,
                temperature=temperature,
            )
            generation_turtle = (result.get("generation") or {}).get("odrl_turtle")
            generation_pred = extract_from_turtle(generation_turtle) if generation_turtle else None
            generation_pred = generation_pred or {}

            metrics = result.get("metrics", {})
            stage_times = result.get("stage_times", {})
            generator_metrics = metrics.get("generator", {})
            total_metrics = metrics.get("total", {})
            runtime_row = {
                "record": idx,
                "input": user_text,
                "generator_time_ms": stage_times.get("generator_time_ms", generator_metrics.get("time_ms", "")),
                "total_time_ms": total_metrics.get("time_ms", ""),
                "generator_input_tokens": generator_metrics.get("input_tokens", ""),
                "generator_output_tokens": generator_metrics.get("output_tokens", ""),
                "total_input_tokens": total_metrics.get("input_tokens", ""),
                "total_output_tokens": total_metrics.get("output_tokens", ""),
            }
        except Exception as exc:
            row_error = str(exc).replace("\n", " ")[:1000]
            failed_records += 1
            print(f"EVAL_ITEM_ERROR|idx={idx}|error={row_error}", flush=True)
            if _is_model_runtime_error(exc):
                print(f"EVAL_ATTEMPT_MODEL_ERROR|idx={idx}|error={row_error}", flush=True)
                raise SystemExit(2)
            print(f"EVAL_ATTEMPT_FATAL|idx={idx}|error={row_error}", flush=True)
            raise SystemExit(1)

        gold_rows.append(gold)
        generation_preds.append(generation_pred)
        runtime_rows.append(runtime_row)
        print(
            "EVAL_ITEM_TOKENS|"
            f"idx={idx}|"
            "parser_in=0|"
            "parser_out=0|"
            "reasoner_in=0|"
            "reasoner_out=0|"
            f"generator_in={runtime_row['generator_input_tokens']}|"
            f"generator_out={runtime_row['generator_output_tokens']}|"
            "validator_in=0|validator_out=0|"
            f"total_in={runtime_row['total_input_tokens']}|"
            f"total_out={runtime_row['total_output_tokens']}",
            flush=True,
        )

        _save_evaluation_record(
            batch_dir=batch_dir,
            record_idx=idx,
            user_text=user_text,
            gold_row=gold,
            result=result,
            model=model,
            temperature=temperature,
            generation_pred=generation_pred,
            runtime_row=runtime_row,
            run_error=row_error,
        )
        print(f"EVAL_ITEM_DONE|idx={idx}", flush=True)

    record_path = os.path.join(batch_dir, "records.csv")
    metrics_path = os.path.join(batch_dir, "metrics.csv")
    time_path = os.path.join(batch_dir, "time.csv")
    tokens_path = os.path.join(batch_dir, "tokens.csv")

    _write_record_file(record_path, gold_rows, generation_preds)

    generation_metrics = evaluate_predictions(gold_rows, generation_preds)

    def _avg_stage_seconds(key: str) -> Optional[float]:
        values: List[float] = []
        for row in runtime_rows:
            raw = row.get(key)
            if raw in ("", None):
                continue
            try:
                values.append(float(raw))
            except Exception:
                continue
        if not values:
            return None
        return round((sum(values) / len(values)) / 1000.0, 2)

    avg_stage_times_seconds = {
        "generator": _avg_stage_seconds("generator_time_ms"),
    }

    print("\n=== Generation Output Evaluation ===", flush=True)
    print(json.dumps(generation_metrics, ensure_ascii=False, indent=2), flush=True)
    print("\n=== Average Runtime (s) ===", flush=True)
    print(
        json.dumps(
            {
                "generator_avg_time_s": _display_seconds(avg_stage_times_seconds.get("generator")),
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )

    combined_metrics = {
        "generation_output": generation_metrics,
        "failed_records": failed_records,
        "total_records": len(gold_rows),
        "avg_stage_times_seconds": avg_stage_times_seconds,
    }
    _write_metrics_file(metrics_path, combined_metrics)
    _write_time_metrics_file(time_path, runtime_rows)
    _write_token_metrics_file(tokens_path, runtime_rows)

    avg_runtime_path = os.path.join(batch_dir, "avg_runtime.json")
    with open(avg_runtime_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generator_avg_time_s": avg_stage_times_seconds.get("generator"),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"\nBatch dir: {os.path.relpath(batch_dir)}", flush=True)
    print(f"Records saved: {os.path.relpath(record_path)}", flush=True)
    print(f"Metrics saved: {os.path.relpath(metrics_path)}", flush=True)
    print(f"Time saved: {os.path.relpath(time_path)}", flush=True)
    print(f"Tokens saved: {os.path.relpath(tokens_path)}", flush=True)
    print(f"Average runtime saved: {os.path.relpath(avg_runtime_path)}", flush=True)


if __name__ == "__main__":
    main()
