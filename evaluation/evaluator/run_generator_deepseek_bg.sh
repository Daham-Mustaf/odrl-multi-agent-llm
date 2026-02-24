#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CUSTOM_MODELS_PATH="${REPO_ROOT}/backend/config/custom_models.json"
LOG_DIR="${SCRIPT_DIR}/results/generator_evaluation_logs"

START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-999999}"

mkdir -p "${LOG_DIR}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOG_DIR}/generator_eval_deepseek_${TIMESTAMP}.log"

DEEPSEEK_CFG="$(
python - "${CUSTOM_MODELS_PATH}" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
models = json.loads(path.read_text(encoding="utf-8"))
target = None
for item in models:
    value = str(item.get("value", ""))
    if value in ("custom:deepseek-chat", "deepseek-chat"):
        target = item
        break
if target is None:
    raise SystemExit("deepseek model not found in backend/config/custom_models.json")
print(json.dumps(target, ensure_ascii=False, separators=(",", ":")))
PY
)"

nohup uv run --project "${REPO_ROOT}/backend" python "${SCRIPT_DIR}/generator_evaluator.py" \
  --model "custom:deepseek-chat" \
  --custom-config-json "${DEEPSEEK_CFG}" \
  --start "${START_IDX}" \
  --end "${END_IDX}" \
  > "${LOG_FILE}" 2>&1 &

PID=$!
echo "Generator evaluator started in background."
echo "PID: ${PID}"
echo "Log: ${LOG_FILE}"
echo "Range: start=${START_IDX}, end=${END_IDX}"
echo "Follow logs: tail -f \"${LOG_FILE}\""
