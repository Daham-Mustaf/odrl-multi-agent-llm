# Best Result Generation Guide

This document describes how to run `main.py` with the current project setup.

## 1) One-Time Setup

```bash
cd /home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm/evaluation/draft_GT_generation
uv sync --project config
```

After this, use `uv run ...` directly (no manual venv activation is required).

## 2) Default Run (All Types + Self-Correction)

```bash
uv run --project config python main.py
```

This runs:
- `agreement`
- `offer`
- `rule`

and by default:
- saves initial and refined policies
- creates cleaned/restructured final TTL files
- prunes non-refined initial TTL files
- exports `text2ttl_GT.jsonl` from final TTL files

## 3) Quick Test Mode

Run only one use case per selected policy type:

```bash
uv run --project config python main.py --test
```

## 4) Supported Models

Current model options:
- `azure-gpt-4.1`
- `deepseek-chat`
- `gpt-5.1`

Example:

```bash
uv run --project config python main.py --model deepseek-chat --test
```

## 5) Run a Single Policy Type

```bash
uv run --project config python main.py --policy-type agreement
uv run --project config python main.py --policy-type offer
uv run --project config python main.py --policy-type rule
```

With test mode:

```bash
uv run --project config python main.py --policy-type agreement --test
```

## 6) Baseline Without Refinement

```bash
uv run --project config python main.py --test --no-self-correction
```

## 7) Input Use Cases

Use cases are loaded from:
- `../data/text2policy/inputs/agreement.json`
- `../data/text2policy/inputs/offer.json`
- `../data/text2policy/inputs/rules.json`

Override input directory if needed:

```bash
uv run --project config python main.py --tasks-dir /path/to/inputs
```

## 8) Output Location

Each run creates a time-based session folder:

- `../data/text2policy/draft_GT/<YYYYMMDD_HHMMSS>/`

Override output root:

```bash
uv run --project config python main.py --results-dir /path/to/custom_draft_GT
```

By default in each session folder:
- refined TTL files: `*_Refined_*.ttl`
- final cleaned/restructured TTL files: `*_Final_*.ttl`
- benchmark file: `text2ttl_GT.jsonl`

Optional switches:

```bash
# keep initial non-refined TTL files
uv run --project config python main.py --no-prune

# skip final ttl post-processing
uv run --project config python main.py --no-finalize

# skip jsonl benchmark export
uv run --project config python main.py --no-benchmark-jsonl
```

## 9) gpt-5.1 Endpoint Note

For `gpt-5.1`, this project expects the chat-completions style endpoint under:

- `.../api/v1/chat/completions`

The script normalizes `base_url` automatically for this model (if config uses `.../api`, it is internally mapped to `.../api/v1`).

## 10) Common Commands

Run full generation with `gpt-5.1`:

```bash
uv run --project config python main.py --model gpt-5.1
```

Run quick quality check for all three types:

```bash
uv run --project config python main.py --model azure-gpt-4.1 --test
```

Run one rule use case without refinement:

```bash
uv run --project config python main.py --policy-type rule --test --no-self-correction
```

Generate one test case per type and keep all intermediates:

```bash
uv run --project config python main.py --test --no-prune
```

Generate only final TTL + benchmark for a single policy type:

```bash
uv run --project config python main.py --policy-type offer --test
```

## 11) text2ttl_GT.jsonl Schema

Each JSONL row contains:
- `Input`: `str`
- `policy_type`: `str` (`odrl:Set` / `odrl:Offer` / `odrl:Agreement`)
- `Permission.actions`: `List[str]`
- `Permission.Constraints.Triplets`: `List[Tuple[str, str, str]]`
- `Permission.duty.actions`: `List[str]`
- `Permission.duty.Constraints.Triplets`: `List[Tuple[str, str, str]]`
- `Prohibition.actions`: `List[str]`
- `Prohibition.Constraints.Triplets`: `List[Tuple[str, str, str]]`

Notes:
- `rightOperand` values preserve datatype, e.g. `"DE"^^xsd:string`.
- Rows are extracted from `*_Final_*.ttl`.
## 12) Troubleshooting

- **`ModuleNotFoundError`**: run `uv sync --project config` again in this folder.
- **404 from model API**: check `base_url` and model entry in `custom_models.json`.
- **No files generated**: verify run logs and confirm outputs under `../data/text2policy/draft_GT/<timestamp>/`.