#!/usr/bin/env bash

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CUSTOM_MODELS_PATH="${REPO_ROOT}/backend/config/custom_models.json"
RUNS_DIR="${SCRIPT_DIR}/results/multi_model_runs"
RUN_ID="$(date +%Y%m%d_%H%M%S)"
MANIFEST_PATH="${RUNS_DIR}/run_${RUN_ID}.csv"
# Default range: run Ground Truth indices [0, 200].
START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-200}"
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

append_manifest() {
  local ts="$1"
  local model="$2"
  local evaluator="$3"
  local status="$4"
  local run_start="$5"
  local run_end="$6"
  local batch_dir="$7"
  printf '"%s","%s","%s","%s","%s","%s","%s"\n' \
    "$ts" "$model" "$evaluator" "$status" "$run_start" "$run_end" "$batch_dir" >> "${MANIFEST_PATH}"
}

count_completed_records() {
  local batch_dir="$1"
  python - "$batch_dir" <<'PY'
import re
import sys
from pathlib import Path

batch_dir = Path(sys.argv[1])
if not batch_dir.is_absolute():
    batch_dir = (Path.cwd() / batch_dir).resolve()

if not batch_dir.exists() or not batch_dir.is_dir():
    print(0)
    sys.exit(0)

count = 0
for p in batch_dir.iterdir():
    if p.is_file() and re.match(r"record_\d{3}\.json$", p.name):
        count += 1
print(count)
PY
}

infer_resume_start_from_history() {
  local model_value="$1"
  local evaluator_script="$2"
  local default_start="$3"
  local default_end="$4"
  python - "$RUNS_DIR" "$model_value" "$evaluator_script" "$default_start" "$default_end" <<'PY'
import csv
import re
import sys
from pathlib import Path

runs_dir = Path(sys.argv[1])
model = sys.argv[2]
evaluator = sys.argv[3]
default_start = int(sys.argv[4])
default_end = int(sys.argv[5])

best_start = default_start
csv_files = sorted(runs_dir.glob("run_*.csv"))

for csv_path in csv_files:
    try:
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("model") != model or row.get("evaluator") != evaluator:
                    continue
                try:
                    row_start = int((row.get("start") or "").strip() or default_start)
                    row_end = int((row.get("end") or "").strip() or default_end)
                except Exception:
                    continue
                batch_dir = (row.get("batch_dir") or "").strip()
                if not batch_dir:
                    continue
                batch_path = Path(batch_dir)
                if not batch_path.is_absolute():
                    batch_path = (Path.cwd() / batch_path).resolve()
                if not batch_path.exists() or not batch_path.is_dir():
                    continue
                completed = 0
                for p in batch_path.iterdir():
                    if p.is_file() and re.match(r"record_\d{3}\.json$", p.name):
                        completed += 1
                candidate = row_start + completed
                if candidate > best_start:
                    best_start = candidate
    except Exception:
        continue

if best_start > default_end:
    print(default_end + 1)
else:
    print(best_start)
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
  # Limits from provider UI:
  # - gpt-oss-120b: 1000 messages / 1 hour
  # - gpt-4o-mini: 1000 messages / 1 hour
  # - gpt-4.1: 100 messages / 1 hour
  # - gpt-5.1: 100 messages / 3 hours
  case "$model_value" in
    "RWTHLLM:gpt-5.1")
      echo $((3 * 3600 + RATE_LIMIT_BUFFER_SEC))
      ;;
    *)
      echo $((1 * 3600 + RATE_LIMIT_BUFFER_SEC))
      ;;
  esac
}

run_one_evaluator() {
  local evaluator_script="$1"
  local model_value="$2"
  local config_json="$3"
  local log_file
  local status
  local batch_dir
  local completed_records
  local current_start
  local next_start
  local now
  local attempt=1

  current_start="$(infer_resume_start_from_history "${model_value}" "${evaluator_script}" "${START_IDX}" "${END_IDX}")"
  if [[ -z "${current_start}" || ! "${current_start}" =~ ^[0-9]+$ ]]; then
    current_start="${START_IDX}"
  fi
  if (( current_start > START_IDX )); then
    echo "Historical checkpoint found for ${evaluator_script} (${model_value}). Resuming from start=${current_start}."
  fi

  while true; do
    if (( current_start > END_IDX )); then
      echo "All records already completed for ${evaluator_script} (${model_value}); skipping."
      return 0
    fi

    log_file="$(mktemp)"
    now="$(date -Is)"

    echo ""
    echo ">>> Running ${evaluator_script} with model ${model_value} (attempt ${attempt}, start=${current_start}, end=${END_IDX})"

    if uv run --project "${REPO_ROOT}/backend" python "${SCRIPT_DIR}/${evaluator_script}" \
        --model "${model_value}" \
        --custom-config-json "${config_json}" \
        --start "${current_start}" \
        --end "${END_IDX}" | tee "${log_file}"; then
      status="success"
      batch_dir="$(extract_batch_dir_from_log "${log_file}")"
      append_manifest "${now}" "${model_value}" "${evaluator_script}" "${status}" "${current_start}" "${END_IDX}" "${batch_dir}"
      rm -f "${log_file}"
      return 0
    fi

    status="failed"
    batch_dir="$(extract_batch_dir_from_log "${log_file}")"
    append_manifest "${now}" "${model_value}" "${evaluator_script}" "${status}" "${current_start}" "${END_IDX}" "${batch_dir}"

    if [[ "$(detect_rate_limit_in_log "${log_file}")" == "yes" ]]; then
      local cooldown
      cooldown="$(cooldown_seconds_for_model "${model_value}")"
      if [[ -n "${batch_dir}" ]]; then
        completed_records="$(count_completed_records "${batch_dir}")"
        if [[ "${completed_records}" =~ ^[0-9]+$ ]]; then
          next_start=$((current_start + completed_records))
          if (( next_start > current_start )); then
            echo "Resume checkpoint found: ${completed_records} records finished in ${batch_dir}. Next start=${next_start}."
            current_start="${next_start}"
          else
            echo "No checkpoint progress found in ${batch_dir}; retrying from start=${current_start}."
          fi
        else
          echo "Unable to parse completed record count from ${batch_dir}; retrying from start=${current_start}."
        fi
      else
        echo "No batch dir detected from logs; retrying from start=${current_start}."
      fi
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

echo "Run id: ${RUN_ID}"
echo "Manifest: ${MANIFEST_PATH}"
echo "Using custom models file: ${CUSTOM_MODELS_PATH}"
echo "Range: start=${START_IDX}, end=${END_IDX}"
echo "Rate-limit buffer: ${RATE_LIMIT_BUFFER_SEC}s"

for model in "${MODELS[@]}"; do
  config_json="$(extract_model_config_json "${model}")" || exit 1
  run_one_evaluator "workflow-evaluator.py" "${model}" "${config_json}"
done

echo ""
echo "Done. Run manifest saved to: ${MANIFEST_PATH}"
echo "Each evaluator record already includes the model field."
