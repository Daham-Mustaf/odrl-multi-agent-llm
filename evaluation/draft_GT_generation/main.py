import argparse
import json
import os
from datetime import datetime
from typing import Dict
import re

from langchain_core.prompts import PromptTemplate

from scripts.correction_report import (
    AGREEMENT_CORRECTION_REPORT,
    OFFER_CORRECTION_REPORT,
    SET_CORRECTION_REPORT,
    odrl_corrector,
)
from scripts.final_to_benchmark_jsonl import build_benchmark_jsonl
from scripts.file_paths import AGREEMENT_TEMPLATE, OFFER_TEMPLATE, RULE_TEMPLATE
from scripts.util import (
    comment_and_keep_codes,
    initialize_language_model,
    load_odrl_template_PDF,
    setup_llm_chain,
)


DEFAULT_MODELS_CONFIG = (
    "/home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm/backend/config/custom_models.json"
)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
EVALUATION_ROOT = os.path.dirname(PROJECT_ROOT)
DEFAULT_TASKS_DIR = os.path.join(EVALUATION_ROOT, "data", "text2policy", "inputs")
DEFAULT_RESULTS_DIR = os.path.join(EVALUATION_ROOT, "data", "text2policy", "draft_GT")

SUPPORTED_MODELS = ("azure-gpt-4.1", "deepseek-chat", "gpt-5.1")
SUPPORTED_TYPES = ("agreement", "offer", "rule", "all")


def normalize_model_name(name: str) -> str:
    raw = (name or "").strip()
    for prefix in ("custom:", "RWTHLLM:"):
        if raw.startswith(prefix):
            raw = raw[len(prefix) :]
    return raw


def sanitize_name(text: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in text)


def load_model_config(models_config_path: str, model_name: str) -> Dict:
    with open(models_config_path, "r", encoding="utf-8") as f:
        configs = json.load(f)

    target = normalize_model_name(model_name)
    for item in configs:
        value_name = normalize_model_name(item.get("value", ""))
        model_id_name = normalize_model_name(item.get("model_id", ""))
        if target in (value_name, model_id_name):
            return normalize_model_config(item)

    available = [normalize_model_name(c.get("model_id", c.get("value", ""))) for c in configs]
    raise ValueError(f"Model '{model_name}' not found in config. Available: {available}")


def normalize_model_config(item: Dict) -> Dict:
    """
    Normalize openai-compatible base URLs for providers that require /v1 paths.
    """
    cfg = dict(item)
    base_url = (cfg.get("base_url") or "").rstrip("/")
    model_id = normalize_model_name(cfg.get("model_id", ""))

    # RWTH KIConnect endpoint expects /api/v1/chat/completions.
    if model_id == "gpt-5.1" and base_url.endswith("/api"):
        cfg["base_url"] = f"{base_url}/v1"
    else:
        cfg["base_url"] = base_url
    return cfg


def get_template_and_report(policy_type: str):
    if policy_type == "Agreement":
        return AGREEMENT_TEMPLATE, AGREEMENT_CORRECTION_REPORT
    if policy_type == "Offer":
        return OFFER_TEMPLATE, OFFER_CORRECTION_REPORT
    if policy_type == "Rule":
        return RULE_TEMPLATE, SET_CORRECTION_REPORT
    raise ValueError(f"Unsupported policy type: {policy_type}")


def load_use_cases_from_json(tasks_dir: str) -> Dict[str, Dict[str, str]]:
    """
    Load use cases from the three JSON files:
    - agreement.json
    - offer.json
    - rules.json

    Returns a dict grouped by policy type:
    {
      "Agreement": {"use_case_1": "...", ...},
      "Offer": {"use_case_1": "...", ...},
      "Rule": {"use_case_1": "...", ...}
    }
    """
    file_map = {
        "agreement.json": "Agreement",
        "offer.json": "Offer",
        "rules.json": "Rule",
    }

    grouped: Dict[str, Dict[str, str]] = {
        "Agreement": {},
        "Offer": {},
        "Rule": {},
    }
    for filename, policy_type in file_map.items():
        path = os.path.join(tasks_dir, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing tasks file: {path}")

        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        top_key = filename.replace(".json", "")
        data = payload.get(top_key, {})
        if not isinstance(data, dict):
            raise ValueError(f"Invalid JSON structure in {path}: expected object at '{top_key}'")

        for use_case_id, description in data.items():
            grouped[policy_type][use_case_id] = description
    return grouped


def build_prompt(policy_type: str) -> PromptTemplate:
    return PromptTemplate(
        template=(
            "Generate a comprehensive ODRL {policy_type} policy for\n"
            "{policy_description}\n"
            "based on ODRL classes and instructions in\n"
            "odrl_context = {odrl_context}\n"
            "Important modeling constraint:\n"
            "- Do NOT use odrl:refinement under odrl:action.\n"
            "- Express all conditions using odrl:constraint blocks attached to Permission, Prohibition, or Duty.\n"
            "- Keep odrl:action values direct (e.g., odrl:use, odrl:stream, odrl:reproduce).\n"
            "Give output in well formatted ttl."
        ),
        input_variables=["policy_type", "policy_description", "odrl_context"],
    )


def save_policy_to_results(policy_text: str, output_dir: str, filename: str) -> str:
    content = comment_and_keep_codes(policy_text)
    file_path = os.path.join(output_dir, f"{filename}.ttl")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    return file_path


def clean_ttl_content(text: str) -> str:
    cleaned_lines = []
    previous_blank = False

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            if not previous_blank:
                cleaned_lines.append("")
            previous_blank = True
            continue

        if stripped.startswith("#") or stripped.startswith("```"):
            continue

        cleaned_lines.append(line)
        previous_blank = False

    return "\n".join(cleaned_lines).strip() + "\n"


def normalize_prefixes(text: str) -> str:
    """
    Normalize dcterms/dc prefix naming to dct for consistent output style.
    """
    normalized = text
    normalized = normalized.replace("@prefix dcterms:", "@prefix dct:")
    normalized = normalized.replace("@prefix dc:", "@prefix dct:")
    normalized = normalized.replace("dcterms:", "dct:")
    normalized = re.sub(r"(?<![A-Za-z0-9_])dc:", "dct:", normalized)
    return normalized


def split_ttl_into_statements(text: str):
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    prefixes = []
    body_lines = []

    for line in lines:
        if line.lstrip().startswith("@prefix"):
            prefixes.append(line.strip())
        else:
            body_lines.append(line)

    statements = []
    current = []
    bracket_depth = 0

    for line in body_lines:
        current.append(line)
        bracket_depth += line.count("[") - line.count("]")
        if bracket_depth == 0 and line.strip().endswith("."):
            statements.append("\n".join(current).strip())
            current = []

    if current:
        statements.append("\n".join(current).strip())

    return prefixes, statements


def restructure_ttl_content(text: str) -> str:
    """
    Reorder Turtle statements to keep policy/set block first,
    followed by related entities, with compact spacing.
    """
    normalized = normalize_prefixes(text)
    prefixes, statements = split_ttl_into_statements(normalized)
    if not statements:
        return normalized.strip() + "\n"

    policy_pattern = re.compile(r"\ba\s+odrl:(?:Policy|Agreement|Offer|Set)\b")
    policy_blocks = [s for s in statements if policy_pattern.search(s)]
    other_blocks = [s for s in statements if not policy_pattern.search(s)]

    ordered = policy_blocks + other_blocks if policy_blocks else statements

    # Keep unique prefixes while preserving order.
    seen = set()
    dedup_prefixes = []
    for p in prefixes:
        if p not in seen:
            seen.add(p)
            dedup_prefixes.append(p)

    parts = []
    if dedup_prefixes:
        parts.append("\n".join(dedup_prefixes))
    parts.extend(ordered)
    return "\n\n".join(parts).strip() + "\n"


def finalize_session_outputs(session_output_dir: str, prune_non_refined: bool) -> None:
    ttl_files = sorted([f for f in os.listdir(session_output_dir) if f.endswith(".ttl")])
    refined_files = [f for f in ttl_files if "_Refined_" in f]

    if not refined_files:
        print("No refined TTL files found; skip final cleanup.")
        return

    for refined_name in refined_files:
        refined_path = os.path.join(session_output_dir, refined_name)
        final_name = refined_name.replace("_Refined_", "_Final_")
        final_path = os.path.join(session_output_dir, final_name)

        with open(refined_path, "r", encoding="utf-8") as f:
            refined_text = f.read()
        final_text = restructure_ttl_content(clean_ttl_content(refined_text))
        with open(final_path, "w", encoding="utf-8") as f:
            f.write(final_text)
        print(f"Saved final policy: {final_path}")

    if prune_non_refined:
        for file_name in ttl_files:
            if "_Refined_" in file_name or "_Final_" in file_name:
                continue
            os.remove(os.path.join(session_output_dir, file_name))
            print(f"Removed non-refined TTL: {file_name}")


def generate_initial_policy(
    policy_type: str,
    policy_description: str,
    context,
    model_cfg: Dict,
    temperature: float,
):
    llm = initialize_language_model(
        LLMmodel=model_cfg["model_id"],
        temperature=temperature,
        openai_api_base=model_cfg.get("base_url"),
        openai_api_key=model_cfg.get("api_key"),
    )
    chain = setup_llm_chain(llm, build_prompt(policy_type))
    return chain.run(
        {
            "policy_type": policy_type,
            "policy_description": policy_description,
            "odrl_context": context,
        }
    )


def run(
    model_name: str,
    models_config: str,
    tasks_dir: str,
    results_dir: str,
    policy_scope: str,
    temperature: float,
    self_correction: bool,
    test_mode: bool,
    finalize_outputs: bool,
    prune_non_refined: bool,
    export_benchmark_jsonl: bool,
):
    model_cfg = load_model_config(models_config, model_name)
    model_id = model_cfg["model_id"]
    safe_model_id = sanitize_name(model_id)

    # Make correction_report import-time key checks a no-op in this run.
    if model_cfg.get("api_key"):
        os.environ["OPENAI_API_KEY"] = model_cfg["api_key"]

    selected_types = {"Agreement", "Offer", "Rule"} if policy_scope == "all" else {policy_scope.capitalize()}
    use_cases_by_type = load_use_cases_from_json(tasks_dir)
    session_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_output_dir = os.path.join(results_dir, session_time)
    os.makedirs(session_output_dir, exist_ok=True)
    print(f"Session output directory: {session_output_dir}")

    for policy_type in ("Agreement", "Offer", "Rule"):
        if policy_type not in selected_types:
            continue

        template_path, correction_report = get_template_and_report(policy_type)
        context = load_odrl_template_PDF(template_path)
        print(f"\n=== Processing {policy_type} with model '{model_id}' ===")
        processed_count = 0

        for use_case, description in use_cases_by_type[policy_type].items():
            initial_policy = generate_initial_policy(
                policy_type=policy_type,
                policy_description=description,
                context=context,
                model_cfg=model_cfg,
                temperature=temperature,
            )
            initial_name = f"{use_case}_{policy_type}_{safe_model_id}"
            initial_path = save_policy_to_results(initial_policy, session_output_dir, initial_name)
            print(f"Saved initial policy: {initial_path}")

            if self_correction:
                refined_policy = odrl_corrector(
                    description,
                    initial_policy,
                    correction_report,
                    model_id,
                    openai_api_base=model_cfg.get("base_url"),
                    openai_api_key=model_cfg.get("api_key"),
                    temperature=temperature,
                )
                refined_name = f"{use_case}_Refined_{policy_type}_{safe_model_id}"
                refined_path = save_policy_to_results(refined_policy, session_output_dir, refined_name)
                print(f"Saved refined policy: {refined_path}")

            processed_count += 1
            if test_mode and processed_count >= 1:
                print(f"Test mode enabled: stopping after 1 {policy_type} use case.")
                break

    if finalize_outputs:
        finalize_session_outputs(
            session_output_dir=session_output_dir,
            prune_non_refined=prune_non_refined,
        )
    if export_benchmark_jsonl:
        benchmark_path = build_benchmark_jsonl(
            session_output_dir=session_output_dir,
            use_cases_by_type=use_cases_by_type,
            output_filename="text2ttl_GT.jsonl",
        )
        print(f"Saved text2ttl_GT jsonl: {benchmark_path}")

    print("\nDone.")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "One-command ODRL policy generation with self-correction "
            "and switchable model backends."
        )
    )
    parser.add_argument(
        "--model",
        default="gpt-5.1",
        choices=SUPPORTED_MODELS,
        help="Model alias from your custom_models.json",
    )
    parser.add_argument(
        "--models-config",
        default=DEFAULT_MODELS_CONFIG,
        help="Path to custom_models.json",
    )
    parser.add_argument(
        "--policy-type",
        default="all",
        choices=SUPPORTED_TYPES,
        help="Which policy type(s) to generate",
    )
    parser.add_argument(
        "--tasks-dir",
        default=DEFAULT_TASKS_DIR,
        help="Directory that contains agreement.json, offer.json, and rules.json (default: ../data/text2policy/inputs)",
    )
    parser.add_argument(
        "--results-dir",
        default=DEFAULT_RESULTS_DIR,
        help="Root output directory; each run creates a timestamped session subfolder (default: ../data/text2policy/draft_GT)",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.3,
        help="Sampling temperature",
    )
    parser.add_argument(
        "--no-self-correction",
        action="store_true",
        help="Disable self-correction and only save first-pass policies",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run only one use case per selected policy type",
    )
    parser.add_argument(
        "--no-finalize",
        action="store_true",
        help="Do not create cleaned final TTL files from refined outputs",
    )
    parser.add_argument(
        "--no-prune",
        action="store_true",
        help="Do not delete non-refined TTL files after finalization",
    )
    parser.add_argument(
        "--no-benchmark-jsonl",
        action="store_true",
        help="Do not export text2ttl_GT.jsonl from final TTL files",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        model_name=args.model,
        models_config=args.models_config,
        tasks_dir=args.tasks_dir,
        results_dir=args.results_dir,
        policy_scope=args.policy_type,
        temperature=args.temperature,
        self_correction=not args.no_self_correction,
        test_mode=args.test,
        finalize_outputs=not args.no_finalize,
        prune_non_refined=not args.no_prune,
        export_benchmark_jsonl=not args.no_benchmark_jsonl,
    )
