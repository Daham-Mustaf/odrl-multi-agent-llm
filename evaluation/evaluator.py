from __future__ import annotations

import argparse
import ast
import csv
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from run_workflow import _load_default_custom_model, run_workflow

try:
    from rdflib import Graph, Namespace, RDF
except Exception:
    Graph = None
    Namespace = None
    RDF = None


ODRL_NAMESPACE = "http://www.w3.org/ns/odrl/2/"
ODRL = Namespace(ODRL_NAMESPACE) if Namespace else None
XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema#"


def _collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return _collapse_whitespace(value).lower()


def normalize_scalar_for_exact(value: Any) -> str:
    if isinstance(value, list):
        items = [normalize_text(v) for v in value if normalize_text(v)]
        return "||".join(sorted(items))
    return normalize_text(value)


def _coerce_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("[") or text.startswith("("):
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
        return [value]
    return [value]


def _normalize_triplet(triplet: Iterable[Any]) -> Tuple[str, str, str]:
    parts = list(triplet)
    while len(parts) < 3:
        parts.append("")
    return (
        normalize_text(parts[0]),
        normalize_text(parts[1]),
        normalize_text(parts[2]),
    )


def _coerce_triplets(value: Any) -> List[Tuple[str, str, str]]:
    triplets: List[Tuple[str, str, str]] = []
    if value is None:
        return triplets
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return triplets
        if text.startswith("[") or text.startswith("("):
            try:
                parsed = ast.literal_eval(text)
                value = parsed
            except Exception:
                return triplets
    if isinstance(value, dict):
        triplets.append(
            _normalize_triplet(
                (
                    value.get("leftOperand"),
                    value.get("operator"),
                    value.get("rightOperand"),
                )
            )
        )
        return triplets
    if isinstance(value, (list, tuple)):
        for item in value:
            if isinstance(item, dict):
                triplets.append(
                    _normalize_triplet(
                        (
                            item.get("leftOperand"),
                            item.get("operator"),
                            item.get("rightOperand"),
                        )
                    )
                )
            elif isinstance(item, (list, tuple)):
                triplets.append(_normalize_triplet(item))
            elif isinstance(item, str):
                try:
                    parsed = ast.literal_eval(item)
                    if isinstance(parsed, dict):
                        triplets.append(
                            _normalize_triplet(
                                (
                                    parsed.get("leftOperand"),
                                    parsed.get("operator"),
                                    parsed.get("rightOperand"),
                                )
                            )
                        )
                    elif isinstance(parsed, (list, tuple)):
                        triplets.append(_normalize_triplet(parsed))
                except Exception:
                    continue
    return triplets


def _normalize_uri(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    if text.startswith(ODRL_NAMESPACE):
        return f"odrl:{text.split(ODRL_NAMESPACE)[-1]}"
    if text.startswith(XSD_NAMESPACE):
        return f"xsd:{text.split(XSD_NAMESPACE)[-1]}"
    if "#" in text:
        return text.split("#")[-1]
    if "/" in text:
        return text.split("/")[-1]
    return text


def _literal_to_turtle_form(value: Any) -> str:
    """Turn RDF rightOperand into the form as in turtle (e.g. \"1000\"^^xsd:integer).
    str(Literal) in RDFLib drops the datatype; use this so extracted content matches final_output.
    """
    if value is None:
        return ""
    if getattr(value, "datatype", None) is not None:
        return str(value) + "^^" + _normalize_uri(value.datatype)
    if hasattr(value, "n3"):
        return _normalize_uri(value)
    return str(value)


def _extract_policy(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    policies = parsed_data.get("policies") or []
    if not policies:
        return {}
    return policies[0] or {}


def extract_from_parsed_data(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    policy = _extract_policy(parsed_data)
    temporal = policy.get("temporal") or {}
    rules = policy.get("rules") or []

    perm_actions: List[str] = []
    perm_triplets: List[Tuple[str, str, str]] = []
    perm_duties: List[str] = []
    proh_actions: List[str] = []
    proh_triplets: List[Tuple[str, str, str]] = []
    proh_duties: List[str] = []

    for rule in rules:
        rule_type = (rule.get("rule_type") or "").lower()
        actions = rule.get("actions") or []
        constraints = rule.get("constraints") or []
        duties = rule.get("duties") or []

        if rule_type == "permission":
            perm_actions.extend(actions)
            for c in constraints:
                perm_triplets.append(
                    _normalize_triplet(
                        (
                            c.get("leftOperand"),
                            c.get("operator"),
                            c.get("rightOperand"),
                        )
                    )
                )
            for duty in duties:
                perm_duties.append(duty.get("action"))
        elif rule_type == "prohibition":
            proh_actions.extend(actions)
            for c in constraints:
                proh_triplets.append(
                    _normalize_triplet(
                        (
                            c.get("leftOperand"),
                            c.get("operator"),
                            c.get("rightOperand"),
                        )
                    )
                )
            for duty in duties:
                proh_duties.append(duty.get("action"))

    return {
        "policy_type": policy.get("policy_type"),
        "assigner": policy.get("assigner"),
        "assignee": policy.get("assignee") or [],
        "targets": policy.get("targets") or [],
        "start_date": temporal.get("start_date"),
        "end_date": temporal.get("end_date"),
        "duration": temporal.get("duration"),
        "permission_actions": perm_actions,
        "permission_triplets": perm_triplets,
        "permission_duties": perm_duties,
        "prohibition_actions": proh_actions,
        "prohibition_triplets": proh_triplets,
        "prohibition_duties": proh_duties,
    }


def extract_from_turtle(turtle_str: str) -> Optional[Dict[str, Any]]:
    if Graph is None:
        return None
    try:
        graph = Graph()
        graph.parse(data=turtle_str, format="turtle")
    except Exception:
        return None

    policy_nodes = list(graph.subjects(RDF.type, ODRL.Policy))
    if not policy_nodes:
        return None
    policy_node = policy_nodes[0]

    permission_nodes = list(graph.objects(policy_node, ODRL.permission))
    prohibition_nodes = list(graph.objects(policy_node, ODRL.prohibition))

    def collect_actions(nodes: List[Any]) -> List[str]:
        actions: List[str] = []
        for node in nodes:
            for action in graph.objects(node, ODRL.action):
                actions.append(_normalize_uri(action))
        return actions

    def collect_constraints(nodes: List[Any]) -> List[Tuple[str, str, str]]:
        triplets: List[Tuple[str, str, str]] = []
        for node in nodes:
            for constraint in graph.objects(node, ODRL.constraint):
                left_operand = None
                operator = None
                right_operand = None
                for value in graph.objects(constraint, ODRL.leftOperand):
                    left_operand = _normalize_uri(value)
                for value in graph.objects(constraint, ODRL.operator):
                    operator = _normalize_uri(value)
                for value in graph.objects(constraint, ODRL.rightOperand):
                    right_operand = value
                for value in graph.objects(constraint, ODRL.rightOperandReference):
                    right_operand = value
                # Preserve Literal as in turtle (e.g. 1000^^xsd:integer), not str(Literal) -> "1000"
                right_operand_str = _literal_to_turtle_form(right_operand)
                triplets.append(
                    _normalize_triplet(
                        (
                            left_operand,
                            operator,
                            right_operand_str,
                        )
                    )
                )
        return triplets

    def collect_duties(nodes: List[Any]) -> List[str]:
        duties: List[str] = []
        for node in nodes:
            for duty in graph.objects(node, ODRL.duty):
                for action in graph.objects(duty, ODRL.action):
                    duties.append(_normalize_uri(action))
        return duties

    policy_types: List[str] = []
    for policy_type in graph.objects(policy_node, RDF.type):
        if policy_type != ODRL.Policy:
            policy_types.append(_normalize_uri(policy_type))

    assigners: List[str] = []
    assignees: List[str] = []
    targets: List[str] = []
    for assigner in graph.objects(policy_node, ODRL.assigner):
        assigners.append(_normalize_uri(assigner))
    for assignee in graph.objects(policy_node, ODRL.assignee):
        assignees.append(_normalize_uri(assignee))
    for target in graph.objects(policy_node, ODRL.target):
        targets.append(_normalize_uri(target))
    for node in permission_nodes + prohibition_nodes:
        for assigner in graph.objects(node, ODRL.assigner):
            assigners.append(_normalize_uri(assigner))
        for assignee in graph.objects(node, ODRL.assignee):
            assignees.append(_normalize_uri(assignee))
        for target in graph.objects(node, ODRL.target):
            targets.append(_normalize_uri(target))

    start_date = ""
    end_date = ""
    duration = ""
    temporal_nodes = permission_nodes + prohibition_nodes
    for node in temporal_nodes:
        for constraint in graph.objects(node, ODRL.constraint):
            left_operand = None
            operator = None
            right_operand = None
            for value in graph.objects(constraint, ODRL.leftOperand):
                left_operand = _normalize_uri(value)
            for value in graph.objects(constraint, ODRL.operator):
                operator = _normalize_uri(value)
            for value in graph.objects(constraint, ODRL.rightOperand):
                right_operand = str(value)
            if not left_operand or not operator or right_operand is None:
                continue
            if left_operand == "odrl:elapsedTime":
                duration = right_operand
            if left_operand == "odrl:dateTime":
                if operator in {"odrl:gteq", "odrl:gt"}:
                    start_date = start_date or right_operand
                elif operator in {"odrl:lteq", "odrl:lt"}:
                    end_date = end_date or right_operand
                elif operator == "odrl:eq" and not (start_date or end_date):
                    start_date = right_operand
                    end_date = right_operand

    return {
        "policy_type": policy_types[0] if policy_types else None,
        "assigner": assigners,
        "assignee": assignees,
        "targets": targets,
        "start_date": start_date,
        "end_date": end_date,
        "duration": duration,
        "permission_actions": collect_actions(permission_nodes),
        "permission_triplets": collect_constraints(permission_nodes),
        "permission_duties": collect_duties(permission_nodes),
        "prohibition_actions": collect_actions(prohibition_nodes),
        "prohibition_triplets": collect_constraints(prohibition_nodes),
        "prohibition_duties": collect_duties(prohibition_nodes),
    }


def _match_first_key(row: Dict[str, Any], candidates: List[str]) -> Any:
    row_keys = {normalize_text(k): k for k in row.keys()}
    for candidate in candidates:
        key = row_keys.get(normalize_text(candidate))
        if key is not None:
            return row.get(key)
    return None


def extract_gold_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "input": _match_first_key(row, ["Input", "input", "text", "policy_text"]),
        "policy_type": _match_first_key(row, ["policy_type", "Policy Type"]),
        "assigner": _match_first_key(row, ["assigner"]),
        "assignee": _match_first_key(row, ["assignee"]),
        "targets": _match_first_key(row, ["targets"]),
        "start_date": _match_first_key(row, ["start_date", "startDate"]),
        "end_date": _match_first_key(row, ["end_date", "endDate"]),
        "duration": _match_first_key(row, ["duration"]),
        "permission_actions": _match_first_key(
            row,
            ["Permission.actions", "permission.actions", "permission_actions"],
        ),
        "permission_triplets": _match_first_key(
            row,
            [
                "Permission.Constraints.Triplets",
                "Permission.constraints.triplets",
                "permission_triplets",
            ],
        ),
        "permission_duties": _match_first_key(
            row,
            ["Permission.duties", "permission.duties", "permission_duties"],
        ),
        "prohibition_actions": _match_first_key(
            row,
            ["Prohibition.actions", "prohibition.actions", "prohibition_actions"],
        ),
        "prohibition_triplets": _match_first_key(
            row,
            [
                "Prohibition.Constraints.Triplets",
                "Prohibition.constraints.triplets",
                "prohibition_triplets",
            ],
        ),
        "prohibition_duties": _match_first_key(
            row,
            ["Prohibition.duties", "prohibition.duties", "prohibition_duties"],
        ),
    }


def _set_from_list(values: Any) -> set:
    items = _coerce_list(values)
    return {normalize_text(item) for item in items if normalize_text(item)}


def _set_from_triplets(values: Any) -> set:
    return {t for t in _coerce_triplets(values) if any(t)}


def _calc_prf(tp: int, fp: int, fn: int) -> Tuple[float, float, float]:
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    return precision, recall, f1


def _row_prf(gold_set: set, pred_set: set) -> Tuple[float, float, float]:
    if not gold_set and not pred_set:
        return 1.0, 1.0, 1.0
    tp = len(gold_set & pred_set)
    fp = len(pred_set - gold_set)
    fn = len(gold_set - pred_set)
    return _calc_prf(tp, fp, fn)


def evaluate_predictions(gold_rows: List[Dict[str, Any]], pred_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    scalar_fields = ["policy_type", "assigner", "assignee", "targets", "start_date", "end_date", "duration"]
    list_fields = [
        "permission_actions",
        "permission_triplets",
        "permission_duties",
        "prohibition_actions",
        "prohibition_triplets",
        "prohibition_duties",
    ]

    scalar_accuracy: Dict[str, float] = {}
    for field in scalar_fields:
        correct = 0
        for gold, pred in zip(gold_rows, pred_rows):
            gold_value = normalize_scalar_for_exact(gold.get(field))
            pred_value = normalize_scalar_for_exact(pred.get(field))
            if gold_value == pred_value:
                correct += 1
        scalar_accuracy[field] = correct / len(gold_rows) if gold_rows else 0.0

    list_metrics: Dict[str, Dict[str, float]] = {}
    for field in list_fields:
        precisions: List[float] = []
        recalls: List[float] = []
        f1s: List[float] = []

        for gold, pred in zip(gold_rows, pred_rows):
            if "triplets" in field:
                gold_set = _set_from_triplets(gold.get(field))
                pred_set = _set_from_triplets(pred.get(field))
            else:
                gold_set = _set_from_list(gold.get(field))
                pred_set = _set_from_list(pred.get(field))

            precision, recall, f1 = _row_prf(gold_set, pred_set)
            precisions.append(precision)
            recalls.append(recall)
            f1s.append(f1)

        list_metrics[field] = {
            "precision": sum(precisions) / len(precisions) if precisions else 0.0,
            "recall": sum(recalls) / len(recalls) if recalls else 0.0,
            "f1": sum(f1s) / len(f1s) if f1s else 0.0,
        }

    end_to_end_correct = 0
    for gold, pred in zip(gold_rows, pred_rows):
        scalar_ok = all(
            normalize_scalar_for_exact(gold.get(field)) == normalize_scalar_for_exact(pred.get(field))
            for field in scalar_fields
        )
        list_ok = True
        for field in list_fields:
            if "triplets" in field:
                gold_set = _set_from_triplets(gold.get(field))
                pred_set = _set_from_triplets(pred.get(field))
            else:
                gold_set = _set_from_list(gold.get(field))
                pred_set = _set_from_list(pred.get(field))
            if gold_set != pred_set:
                list_ok = False
                break
        if scalar_ok and list_ok:
            end_to_end_correct += 1
    end_to_end_accuracy = end_to_end_correct / len(gold_rows) if gold_rows else 0.0

    return {
        "scalar_accuracy": scalar_accuracy,
        "list_metrics": list_metrics,
        "end_to_end_accuracy": end_to_end_accuracy,
    }


def _load_dataset_rows(
    dataset_name: str,
    split: str,
    start: int = 0,
    end: Optional[int] = None,
    limit: Optional[int] = 5,
) -> List[Dict[str, Any]]:
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
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON dataset must be a list of objects")
    if end is not None:
        slice_end = min(end + 1, len(data))
        return [dict(row) for row in data[start:slice_end]]
    return [dict(row) for row in data[start : start + (limit or 5)]]


DATASET_FIELDS: List[Tuple[str, str]] = [
    ("policy_type", "policy_type"),
    ("assigner", "assigner"),
    ("assignee", "assignee"),
    ("targets", "targets"),
    ("Permission.actions", "permission_actions"),
    ("Permission.Constraints.Triplets", "permission_triplets"),
    ("Permission.duties", "permission_duties"),
    ("Prohibition.actions", "prohibition_actions"),
    ("Prohibition.Constraints.Triplets", "prohibition_triplets"),
    ("Prohibition.duties", "prohibition_duties"),
    ("start_date", "start_date"),
    ("end_date", "end_date"),
    ("duration", "duration"),
]

COST_RATES_PER_1M = {
    "gpt-4.1": {"input": 2.0, "output": 8.0},
    "gpt-5.1": {"input": 1.25, "output": 10.0},
    "gpt-5.2": {"input": 1.75, "output": 14.0},
    "deepseek-chat": {"input": 0.28, "output": 0.42},
}


def _format_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _format_cost(value: Any) -> str:
    try:
        if value is None or value == "":
            return ""
        return f"{float(value):.4f}"
    except Exception:
        return str(value)


def _write_record_file(
    output_path: str,
    gold_rows: List[Dict[str, Any]],
    parsed_preds: List[Dict[str, Any]],
    turtle_preds: List[Dict[str, Any]],
) -> None:
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["Record", "Column", "Input", "Gold", "Parsed Data", "Turtle Final Output"]
        )
        for idx, (gold, parsed, turtle) in enumerate(
            zip(gold_rows, parsed_preds, turtle_preds), 1
        ):
            writer.writerow(
                [idx, "Input", _format_value(gold.get("input")), "", "", ""]
            )
            for label, key in DATASET_FIELDS:
                gold_value = _format_value(gold.get(key))
                writer.writerow(
                    [
                        idx,
                        label,
                        "",
                        gold_value,
                        _format_value(parsed.get(key)),
                        _format_value(turtle.get(key)),
                    ]
                )
            writer.writerow([])


def _format_metric(value: Any) -> str:
    try:
        if value is None or value == "":
            return ""
        return f"{float(value):.4f}"
    except Exception:
        return str(value)


def _compute_delta(parsed_value: Any, turtle_value: Any) -> str:
    try:
        if parsed_value is None or turtle_value is None:
            return ""
        return _format_metric(float(turtle_value) - float(parsed_value))
    except Exception:
        return ""


def _write_metrics_file(output_path: str, metrics: Dict[str, Any]) -> None:
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Field", "Metric", "Parsed Data", "Turtle Final Output", "Delta (Final - Parser)"])

        parsed = metrics.get("parsed_data", {})
        turtle = metrics.get("turtle_final_output", {})

        parsed_scalar = parsed.get("scalar_accuracy", {})
        turtle_scalar = turtle.get("scalar_accuracy", {})
        scalar_order = [
            "policy_type",
            "assigner",
            "assignee",
            "targets",
            "start_date",
            "end_date",
            "duration",
        ]
        writer.writerow(["Scalar (Exact Match)", "", "", ""])
        for field in scalar_order:
            if field in parsed_scalar or field in turtle_scalar:
                parsed_value = parsed_scalar.get(field, "")
                turtle_value = turtle_scalar.get(field, "")
                writer.writerow(
                    [
                        field,
                        "accuracy",
                        _format_metric(parsed_value),
                        _format_metric(turtle_value),
                        _compute_delta(parsed_value, turtle_value),
                    ]
                )
        writer.writerow([])

        parsed_lists = parsed.get("list_metrics", {})
        turtle_lists = turtle.get("list_metrics", {})
        list_order = [
            "permission_actions",
            "permission_triplets",
            "permission_duties",
            "prohibition_actions",
            "prohibition_triplets",
            "prohibition_duties",
        ]
        writer.writerow(["List Metrics (P/R/F1)", "", "", ""])
        for field in list_order:
            if field not in parsed_lists and field not in turtle_lists:
                continue
            parsed_metrics = parsed_lists.get(field, {})
            turtle_metrics = turtle_lists.get(field, {})
            parsed_precision = parsed_metrics.get("precision")
            turtle_precision = turtle_metrics.get("precision")
            parsed_recall = parsed_metrics.get("recall")
            turtle_recall = turtle_metrics.get("recall")
            parsed_f1 = parsed_metrics.get("f1")
            turtle_f1 = turtle_metrics.get("f1")
            writer.writerow(
                [
                    field,
                    "precision",
                    _format_metric(parsed_precision),
                    _format_metric(turtle_precision),
                    _compute_delta(parsed_precision, turtle_precision),
                ]
            )
            writer.writerow(
                [
                    field,
                    "recall",
                    _format_metric(parsed_recall),
                    _format_metric(turtle_recall),
                    _compute_delta(parsed_recall, turtle_recall),
                ]
            )
            writer.writerow(
                [
                    field,
                    "f1",
                    _format_metric(parsed_f1),
                    _format_metric(turtle_f1),
                    _compute_delta(parsed_f1, turtle_f1),
                ]
            )
        writer.writerow([])

        writer.writerow(["End-to-End (Exact Match)", "", "", ""])
        parsed_end = parsed.get("end_to_end_accuracy", "")
        turtle_end = turtle.get("end_to_end_accuracy", "")
        writer.writerow(
            [
                "end_to_end_accuracy",
                "accuracy",
                _format_metric(parsed_end),
                _format_metric(turtle_end),
                _compute_delta(parsed_end, turtle_end),
            ]
        )

def _save_evaluation_record(
    batch_dir: str,
    record_idx: int,
    user_text: str,
    gold_row: Dict[str, Any],
    result: Dict[str, Any],
    model: str,
    temperature: float,
    parsed_pred: Dict[str, Any],
    turtle_pred: Dict[str, Any],
    runtime_row: Dict[str, Any],
    last_generator_turtle: Optional[str] = None,
) -> str:
    """Save one evaluation record to a JSON file under the batch directory.
    last_generator_turtle: raw turtle from the last generator run (regeneration if any, else generation).
    This is written as final_output so the record reflects the actual last run, not rdflib-formatted output.
    """
    os.makedirs(batch_dir, exist_ok=True)
    filename = f"record_{record_idx:03d}.json"
    path = os.path.join(batch_dir, filename)

    final_output = last_generator_turtle if last_generator_turtle is not None else result.get("final_output")

    payload = {
        "record_index": record_idx,
        "session": {
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "model": model,
            "temperature": temperature,
        },
        "user_input": user_text,
        "gold": gold_row,
        "parsed_data": result.get("parsed_data"),
        "reasoning": result.get("reasoning"),
        "generation": result.get("generation"),
        "validation": result.get("validation"),
        "regeneration": result.get("regeneration"),
        "revalidation": result.get("revalidation"),
        "final_output": final_output,
        "metrics": result.get("metrics"),
        "extracted_parsed_pred": parsed_pred,
        "extracted_turtle_pred": turtle_pred,
        "runtime": runtime_row,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


def _compute_cost(input_tokens: Any, output_tokens: Any, rate_key: str) -> str:
    rates = COST_RATES_PER_1M.get(rate_key, {})
    if not rates:
        return ""
    try:
        input_cost = (float(input_tokens) / 1_000_000.0) * float(rates.get("input", 0.0))
        output_cost = (float(output_tokens) / 1_000_000.0) * float(rates.get("output", 0.0))
        return _format_cost(input_cost + output_cost)
    except Exception:
        return ""


def _write_time_metrics_file(output_path: str, runtime_rows: List[Dict[str, Any]]) -> None:
    if not runtime_rows:
        return
    fieldnames = [
        "record",
        "input",
        "parser_time_ms",
        "reasoner_time_ms",
        "generator_time_ms",
        "validator_time_ms",
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
        "parser_input_tokens",
        "parser_output_tokens",
        "reasoner_input_tokens",
        "reasoner_output_tokens",
        "generator_input_tokens",
        "generator_output_tokens",
        "validator_input_tokens",
        "validator_output_tokens",
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate ODRL pipeline outputs")
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
    parser.add_argument("--dataset-json", type=str, default=None)
    parser.add_argument(
        "--models",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "..", "backend", "config", "custom_models.json"),
    )
    args = parser.parse_args()

    if args.dataset_json:
        rows = _load_rows_from_json(
            args.dataset_json,
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

    model, custom_config, temperature = _load_default_custom_model(args.models)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    results_dir = os.path.join(os.path.dirname(__file__), "results", "evaluation")
    batch_dir = os.path.join(results_dir, f"batch_{timestamp}")
    os.makedirs(batch_dir, exist_ok=True)

    gold_rows: List[Dict[str, Any]] = []
    parsed_preds: List[Dict[str, Any]] = []
    turtle_preds: List[Dict[str, Any]] = []
    runtime_rows: List[Dict[str, Any]] = []

    for idx, row in enumerate(rows, 1):
        gold = extract_gold_row(row)
        user_text = gold.get("input") or ""
        if not user_text:
            raise ValueError(f"Row {idx} is missing Input text")

        result = run_workflow(
            user_text=user_text,
            model=model,
            custom_config=custom_config,
            temperature=temperature,
        )

        gold_rows.append(gold)
        parsed_pred = extract_from_parsed_data(result.get("parsed_data") or {})
        parsed_preds.append(parsed_pred)

        # Use the actual last generator output: regeneration if present, else first generation.
        # run_workflow's final_output is rdflib-formatted; we want the raw last run for evaluation and recording.
        last_turtle = (result.get("regeneration") or {}).get("odrl_turtle") or (result.get("generation") or {}).get("odrl_turtle") or result.get("final_output")
        turtle_pred = extract_from_turtle(last_turtle) if last_turtle else None
        turtle_pred = turtle_pred or {}
        turtle_preds.append(turtle_pred)

        metrics = result.get("metrics", {})
        parser_metrics = metrics.get("parser", {})
        reasoner_metrics = metrics.get("reasoner", {})
        generator_metrics = metrics.get("generator", {})
        validator_metrics = metrics.get("validator", {})
        total_metrics = metrics.get("total", {})
        runtime_row = {
            "record": idx,
            "input": user_text,
            "parser_time_ms": parser_metrics.get("time_ms", ""),
            "reasoner_time_ms": reasoner_metrics.get("time_ms", ""),
            "generator_time_ms": generator_metrics.get("time_ms", ""),
            "validator_time_ms": validator_metrics.get("time_ms", ""),
            "total_time_ms": total_metrics.get("time_ms", ""),
            "parser_input_tokens": parser_metrics.get("input_tokens", ""),
            "parser_output_tokens": parser_metrics.get("output_tokens", ""),
            "reasoner_input_tokens": reasoner_metrics.get("input_tokens", ""),
            "reasoner_output_tokens": reasoner_metrics.get("output_tokens", ""),
            "generator_input_tokens": generator_metrics.get("input_tokens", ""),
            "generator_output_tokens": generator_metrics.get("output_tokens", ""),
            "validator_input_tokens": validator_metrics.get("input_tokens", ""),
            "validator_output_tokens": validator_metrics.get("output_tokens", ""),
            "total_input_tokens": total_metrics.get("input_tokens", ""),
            "total_output_tokens": total_metrics.get("output_tokens", ""),
        }
        runtime_rows.append(runtime_row)

        _save_evaluation_record(
            batch_dir=batch_dir,
            record_idx=idx,
            user_text=user_text,
            gold_row=gold,
            result=result,
            model=model,
            temperature=temperature,
            parsed_pred=parsed_pred,
            turtle_pred=turtle_pred,
            runtime_row=runtime_row,
            last_generator_turtle=last_turtle,
        )

    record_path = os.path.join(batch_dir, "records.csv")
    metrics_path = os.path.join(batch_dir, "metrics.csv")
    time_path = os.path.join(batch_dir, "time.csv")
    tokens_path = os.path.join(batch_dir, "tokens.csv")

    # 1) Generate records CSV first (same content used for metrics)
    _write_record_file(record_path, gold_rows, parsed_preds, turtle_preds)

    # 2) Then compute performance from those records (normalize then compare)
    parsed_metrics = evaluate_predictions(gold_rows, parsed_preds)
    turtle_metrics = evaluate_predictions(gold_rows, turtle_preds)

    print("\n=== Parsed Data Evaluation ===")
    print(json.dumps(parsed_metrics, ensure_ascii=False, indent=2))
    print("\n=== Turtle Final Output Evaluation ===")
    print(json.dumps(turtle_metrics, ensure_ascii=False, indent=2))

    combined_metrics = {
        "parsed_data": parsed_metrics,
        "turtle_final_output": turtle_metrics,
    }
    _write_metrics_file(metrics_path, combined_metrics)
    _write_time_metrics_file(time_path, runtime_rows)
    _write_token_metrics_file(tokens_path, runtime_rows)
    print(f"\nBatch dir: {batch_dir}")
    print(f"Records saved: {record_path}")
    print(f"Metrics saved: {metrics_path}")
    print(f"Time saved: {time_path}")
    print(f"Tokens saved: {tokens_path}")


if __name__ == "__main__":
    main()
