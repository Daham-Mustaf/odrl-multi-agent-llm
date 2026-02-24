#!/usr/bin/env bash

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CUSTOM_MODELS_PATH="${REPO_ROOT}/backend/config/custom_models.json"
RUNS_DIR="${SCRIPT_DIR}/results/multi_model_runs"
RUN_ID="$(date +%Y%m%d_%H%M%S)"
MANIFEST_PATH="${RUNS_DIR}/test_run_${RUN_ID}.csv"

# Test mode: run exactly one Ground Truth item by default.
START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-0}"
RATE_LIMIT_BUFFER_SEC="${RATE_LIMIT_BUFFER_SEC:-120}"

MODELS=(
  "custom:deepseek-chat"
  "RWTHLLM:gpt-oss-120b"
)

mkdir -p "${RUNS_DIR}"
echo "timestamp,model,evaluator,status,start,end,batch_dir" > "${MANIFEST_PATH}"

extract_model_config_json() {
  local model_value="$1"
  python - "$CUSTOM_MODELS_PATH" "$model_value" <<'PY'
import json
import sys
from pathlib import Path

models_path = Path(sys.argv[1])
target = sys.argv[2]
items = json.loads(models_path.read_text(encoding="utf-8"))

for item in items:
    if item.get("value") == target:
        print(json.dumps(item, ensure_ascii=False, separators=(",", ":")))
        sys.exit(0)

print(f"Model not found in custom_models.json: {target}", file=sys.stderr)
sys.exit(1)
PY
}

extract_batch_dir_from_log() {
  local log_path="$1"
  python - "$log_path" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
matches = re.findall(r"EVAL_BATCH_DIR\|path=(.+)", text)
print(matches[-1].strip() if matches else "")
PY
}

detect_rate_limit_in_log() {
  local log_path="$1"
  python - "$log_path" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore").lower()
patterns = [
    r"\b429\b",
    r"rate[\s_-]*limit",
    r"too many requests",
    r"quota",
    r"requests per (minute|hour|day)",
    r"try again in",
]
print("yes" if any(re.search(p, text) for p in patterns) else "no")
PY
}

cooldown_seconds_for_model() {
  local model_value="$1"
  case "$model_value" in
    "RWTHLLM:gpt-5.1")
      echo $((3 * 3600 + RATE_LIMIT_BUFFER_SEC))
      ;;
    *)
      echo $((1 * 3600 + RATE_LIMIT_BUFFER_SEC))
      ;;
  esac
}

append_manifest() {
  local ts="$1"
  local model="$2"
  local evaluator="$3"
  local status="$4"
  local batch_dir="$5"
  printf '"%s","%s","%s","%s","%s","%s","%s"\n' \
    "$ts" "$model" "$evaluator" "$status" "$START_IDX" "$END_IDX" "$batch_dir" >> "${MANIFEST_PATH}"
}

run_one_evaluator() {
  local evaluator_script="$1"
  local model_value="$2"
  local config_json="$3"
  local attempt=1
  local log_file
  local now
  local status
  local batch_dir

  while true; do
    log_file="$(mktemp)"
    now="$(date -Is)"

    echo ""
    echo ">>> [TEST] ${evaluator_script} | model=${model_value} | start=${START_IDX} end=${END_IDX} | attempt=${attempt}"

    if uv run --project "${REPO_ROOT}/backend" python "${SCRIPT_DIR}/${evaluator_script}" \
        --model "${model_value}" \
        --custom-config-json "${config_json}" \
        --start "${START_IDX}" \
        --end "${END_IDX}" | tee "${log_file}"; then
      status="success"
      batch_dir="$(extract_batch_dir_from_log "${log_file}")"
      append_manifest "${now}" "${model_value}" "${evaluator_script}" "${status}" "${batch_dir}"
      rm -f "${log_file}"
      return 0
    fi

    status="failed"
    batch_dir="$(extract_batch_dir_from_log "${log_file}")"
    append_manifest "${now}" "${model_value}" "${evaluator_script}" "${status}" "${batch_dir}"

    if [[ "$(detect_rate_limit_in_log "${log_file}")" == "yes" ]]; then
      local cooldown
      cooldown="$(cooldown_seconds_for_model "${model_value}")"
      echo "Rate limit detected for ${model_value}. Sleeping ${cooldown}s before retry..."
      rm -f "${log_file}"
      sleep "${cooldown}"
      attempt=$((attempt + 1))
      continue
    fi

    echo "Evaluator failed (non-rate-limit): ${evaluator_script} (${model_value})"
    rm -f "${log_file}"
    return 1
  done
}

echo "Test run id: ${RUN_ID}"
echo "Manifest: ${MANIFEST_PATH}"
echo "Using custom models file: ${CUSTOM_MODELS_PATH}"
echo "Range: start=${START_IDX}, end=${END_IDX}"
echo "Rate-limit buffer: ${RATE_LIMIT_BUFFER_SEC}s"

for model in "${MODELS[@]}"; do
  config_json="$(extract_model_config_json "${model}")" || exit 1
  run_one_evaluator "workflow-evaluator.py" "${model}" "${config_json}"
done

echo ""
echo "Done. Test manifest saved to: ${MANIFEST_PATH}"
