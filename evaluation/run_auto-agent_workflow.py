"""
End-to-end workflow: user input -> parser -> reasoner -> generator -> validator.
If validation fails, provide LLM explanation and regenerate once.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
import uuid

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from agents.text_parser.parser import TextParser
from agents.reasoner.reasoner import Reasoner
from agents.generator.generator import Generator
from agents.validator.validator import Validator


DEFAULT_INPUT = (
    "The dataset may only be used for commercial purposes. "
    "Non-commercial research use is required for all applications of this dataset."
)


def _load_default_custom_model(config_path: str) -> Tuple[str, Dict[str, Any], float]:
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


def _read_input_text(text: Optional[str], file_path: Optional[str]) -> str:
    if file_path:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    if text:
        return text.strip()
    return DEFAULT_INPUT


def _format_turtle(turtle_str: str) -> str:
    try:
        from rdflib import Graph
    except Exception:
        return turtle_str.strip()

    try:
        graph = Graph()
        graph.parse(data=turtle_str, format="turtle")
        formatted = graph.serialize(format="turtle")
        return formatted.strip()
    except Exception:
        return turtle_str.strip()


def _quiet_validate(validator: Validator, odrl_turtle: str, original_text: str) -> Dict[str, Any]:
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        return validator.validate(odrl_turtle, original_text=original_text)


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


def _accumulate_metrics(metrics: Dict[str, Any], agent: str, input_text: str, output_text: str, model: str, elapsed_ms: int) -> None:
    agent_metrics = metrics.setdefault(agent, {"time_ms": 0, "input_tokens": 0, "output_tokens": 0})
    agent_metrics["time_ms"] += elapsed_ms
    agent_metrics["input_tokens"] += _count_tokens(input_text, model)
    agent_metrics["output_tokens"] += _count_tokens(output_text, model)


def run_workflow(
    user_text: str,
    model: str,
    custom_config: Dict[str, Any],
    temperature: float,
) -> Dict[str, Any]:
    parser = TextParser(model=model, temperature=temperature, custom_config=custom_config)
    reasoner = Reasoner(model=model, temperature=temperature, custom_config=custom_config)
    generator = Generator(model=model, temperature=temperature, custom_config=custom_config)
    validator = Validator(model=model, temperature=temperature, custom_config=custom_config)

    metrics: Dict[str, Any] = {}
    total_start = time.time()

    parser_start = time.time()
    parsed_data = parser.parse(user_text)
    parser_elapsed = int((time.time() - parser_start) * 1000)
    _accumulate_metrics(
        metrics,
        "parser",
        user_text,
        _safe_json_dumps(parsed_data),
        model,
        parser_elapsed,
    )
    print("[Workflow] Parser complete", flush=True)

    reasoner_start = time.time()
    reasoning = reasoner.reason(parsed_data, user_text)
    reasoner_elapsed = int((time.time() - reasoner_start) * 1000)
    _accumulate_metrics(
        metrics,
        "reasoner",
        _safe_json_dumps({"parsed_data": parsed_data, "original_text": user_text}),
        _safe_json_dumps(reasoning),
        model,
        reasoner_elapsed,
    )
    print("[Workflow] Reasoner complete", flush=True)

    generator_start = time.time()
    generation = generator.generate(
        parsed_data=parsed_data,
        original_text=user_text,
        reasoning=reasoning,
        attempt_number=1,
    )
    generator_elapsed = int((time.time() - generator_start) * 1000)
    _accumulate_metrics(
        metrics,
        "generator",
        _safe_json_dumps({"parsed_data": parsed_data, "original_text": user_text, "reasoning": reasoning}),
        _safe_json_dumps(generation),
        model,
        generator_elapsed,
    )
    print("[Workflow] Generator complete", flush=True)
    odrl_turtle = generation["odrl_turtle"]

    validator_start = time.time()
    validation = _quiet_validate(validator, odrl_turtle, user_text)
    validator_elapsed = int((time.time() - validator_start) * 1000)
    _accumulate_metrics(
        metrics,
        "validator",
        _safe_json_dumps({"odrl_turtle": odrl_turtle, "original_text": user_text}),
        _safe_json_dumps(validation),
        model,
        validator_elapsed,
    )
    print("[Workflow] Validator complete", flush=True)

    result: Dict[str, Any] = {
        "parsed_data": parsed_data,
        "reasoning": reasoning,
        "generation": generation,
        "validation": validation,
    }

    if not validation.get("is_valid", False):
        print("[Workflow] Regeneration start", flush=True)
        regeneration_start = time.time()
        regeneration = generator.generate(
            parsed_data=parsed_data,
            original_text=user_text,
            reasoning=reasoning,
            validation_errors=validation,
            previous_odrl=odrl_turtle,
            attempt_number=2,
        )
        regeneration_elapsed = int((time.time() - regeneration_start) * 1000)
        _accumulate_metrics(
            metrics,
            "generator",
            _safe_json_dumps(
                {
                    "parsed_data": parsed_data,
                    "original_text": user_text,
                    "reasoning": reasoning,
                    "validation_errors": validation,
                    "previous_odrl": odrl_turtle,
                }
            ),
            _safe_json_dumps(regeneration),
            model,
            regeneration_elapsed,
        )
        print("[Workflow] Regeneration complete", flush=True)
        regenerated_turtle = regeneration["odrl_turtle"]
        print("[Workflow] Revalidation start", flush=True)
        revalidation_start = time.time()
        revalidation = _quiet_validate(validator, regenerated_turtle, user_text)
        revalidation_elapsed = int((time.time() - revalidation_start) * 1000)
        _accumulate_metrics(
            metrics,
            "validator",
            _safe_json_dumps({"odrl_turtle": regenerated_turtle, "original_text": user_text}),
            _safe_json_dumps(revalidation),
            model,
            revalidation_elapsed,
        )
        print("[Workflow] Revalidation complete", flush=True)

        result["regeneration"] = regeneration
        result["revalidation"] = revalidation
        result["final_output"] = _format_turtle(regenerated_turtle)
    else:
        result["final_output"] = _format_turtle(odrl_turtle)

    total_elapsed_ms = int((time.time() - total_start) * 1000)
    total_input_tokens = sum(agent["input_tokens"] for agent in metrics.values())
    total_output_tokens = sum(agent["output_tokens"] for agent in metrics.values())
    metrics["total"] = {
        "time_ms": total_elapsed_ms,
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
    }
    result["metrics"] = metrics

    return result


def _save_session_result(
    base_dir: str,
    user_text: str,
    model: str,
    temperature: float,
    result: Dict[str, Any],
) -> str:
    os.makedirs(base_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    session_id = uuid.uuid4().hex[:8]
    filename = f"session_{timestamp}_{session_id}.json"
    path = os.path.join(base_dir, filename)

    payload = {
        "session": {
            "id": session_id,
            "timestamp_utc": timestamp,
            "model": model,
            "temperature": temperature,
        },
        "user_input": user_text,
        "parsed_data": result.get("parsed_data"),
        "reasoning": result.get("reasoning"),
        "generation": result.get("generation"),
        "validation": result.get("validation"),
        "regeneration": result.get("regeneration"),
        "revalidation": result.get("revalidation"),
        "final_output": result.get("final_output"),
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


def main() -> None:
    logging.getLogger().setLevel(logging.WARNING)
    parser = argparse.ArgumentParser(
        description="Run full ODRL workflow: parse -> reason -> generate -> validate."
    )
    parser.add_argument("--text", type=str, help="User input text")
    parser.add_argument("--file", type=str, help="Path to a text file input")
    parser.add_argument(
        "--models",
        type=str,
        default=os.path.join(BACKEND_DIR, "config", "custom_models.json"),
        help="Path to custom_models.json (first entry used)",
    )

    args = parser.parse_args()
    user_text = _read_input_text(args.text, args.file)

    model, custom_config, temperature = _load_default_custom_model(args.models)
    print(f"[Workflow] Using model: {model}", flush=True)

    result = run_workflow(
        user_text=user_text,
        model=model,
        custom_config=custom_config,
        temperature=temperature,
    )

    results_dir = os.path.join(os.path.dirname(__file__), "results", "workflow")
    saved_path = _save_session_result(
        base_dir=results_dir,
        user_text=user_text,
        model=model,
        temperature=temperature,
        result=result,
    )

    print("\n[Workflow] Completed.", flush=True)
    print(f"[Workflow] Session saved: {saved_path}", flush=True)
    if result.get("validation", {}).get("is_valid"):
        print("[Workflow] Initial validation: PASS", flush=True)
    else:
        print("[Workflow] Initial validation: FAIL", flush=True)
        if result.get("revalidation", {}).get("is_valid"):
            print("[Workflow] Revalidation after regeneration: PASS", flush=True)
        else:
            print("[Workflow] Revalidation after regeneration: FAIL", flush=True)


if __name__ == "__main__":
    main()
