#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/results/multi_model_runs"
PID_DIR="${LOG_DIR}/pids"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

GEN_SCRIPT="${SCRIPT_DIR}/run_generator_deepseek_bg.sh"
RWTH_SCRIPT="${SCRIPT_DIR}/run_rwth_models.sh"

GEN_LOG="${LOG_DIR}/nohup_generator_${TIMESTAMP}.log"
RWTH_LOG="${LOG_DIR}/nohup_rwth_${TIMESTAMP}.log"

GEN_PID_FILE="${PID_DIR}/generator_${TIMESTAMP}.pid"
RWTH_PID_FILE="${PID_DIR}/rwth_${TIMESTAMP}.pid"

# Forward caller's env overrides to child scripts (if set).
export START_IDX="${START_IDX:-0}"
export END_IDX="${END_IDX:-200}"
export RATE_LIMIT_BUFFER_SEC="${RATE_LIMIT_BUFFER_SEC:-120}"

nohup bash "${GEN_SCRIPT}" > "${GEN_LOG}" 2>&1 < /dev/null &
GEN_PID=$!
echo "${GEN_PID}" > "${GEN_PID_FILE}"

nohup bash "${RWTH_SCRIPT}" > "${RWTH_LOG}" 2>&1 < /dev/null &
RWTH_PID=$!
echo "${RWTH_PID}" > "${RWTH_PID_FILE}"

echo "Started in background:"
echo "  generator pid: ${GEN_PID}"
echo "  rwth pid:      ${RWTH_PID}"
echo ""
echo "Logs:"
echo "  ${GEN_LOG}"
echo "  ${RWTH_LOG}"
echo ""
echo "PID files:"
echo "  ${GEN_PID_FILE}"
echo "  ${RWTH_PID_FILE}"
echo ""
echo "Check status:"
echo "  ps -p ${GEN_PID},${RWTH_PID} -o pid,stat,etime,cmd"
echo ""
echo "Follow logs:"
echo "  tail -f \"${GEN_LOG}\""
echo "  tail -f \"${RWTH_LOG}\""
echo ""
echo "Stop both:"
echo "  kill ${GEN_PID} ${RWTH_PID}"
