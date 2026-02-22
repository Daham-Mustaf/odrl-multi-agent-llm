import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, PlayCircle, XCircle } from 'lucide-react';

const EvaluatorPage = ({
  darkMode,
  textClass,
  mutedTextClass,
  selectedModel,
  customModels,
  temperature,
  apiBaseUrl,
  showToast,
  registerSuspendHandler,
  onGlobalModelSwitch,
}) => {
  const STORAGE_KEY = 'evaluator_dashboard_state_v1';
  const [selectedEvaluator, setSelectedEvaluator] = useState('');
  const [limits, setLimits] = useState({ workflow: 5, reasoner: 5 });
  const [hydrated, setHydrated] = useState(false);
  const [runState, setRunState] = useState({
    evaluator: '',
    runId: null,
    status: 'idle',
    offset: 0,
    progress: null,
    metricsTable: null,
  });
  const [resumedRun, setResumedRun] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [recordDialog, setRecordDialog] = useState({
    open: false,
    loading: false,
    error: '',
    itemIndex: null,
    filename: '',
    content: null,
  });
  const pollingRef = useRef(null);
  const offsetRef = useRef(0);
  const runStateRef = useRef(runState);

  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const getCustomModelPayload = () => {
    if (!selectedModel || !selectedModel.startsWith('custom:')) return null;
    const model = customModels.find((m) => m.value === selectedModel);
    if (!model) return null;
    return {
      provider_type: model.provider_type,
      base_url: model.base_url,
      model_id: model.model_id,
      api_key: model.api_key,
      context_length: model.context_length,
      temperature_default: model.temperature ?? model.temperature_default ?? 0.3,
    };
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const stopCurrentRun = async () => {
    if (!runState.runId) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run/${runState.runId}/stop`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to stop evaluator run');
      stopPolling();
      setRunState((prev) => ({
        ...prev,
        status: 'cancelled',
        progress: data.progress ?? prev.progress,
        metricsTable: data.metrics_table ?? prev.metricsTable,
      }));
      showToast('Evaluator run stopped', 'warning');
    } catch (error) {
      showToast(`Stop failed: ${error.message}`, 'error');
    }
  };

  const suspendEvaluator = async ({ silent = false } = {}) => {
    const current = runStateRef.current;
    if (!current?.runId || current?.status !== 'running') return true;
    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run/${current.runId}/suspend`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to suspend evaluator');
      stopPolling();
      setRunState((prev) => ({
        ...prev,
        status: 'suspended',
        progress: data.progress ?? prev.progress,
        metricsTable: data.metrics_table ?? prev.metricsTable,
      }));
      if (!silent) showToast('Evaluator suspended', 'warning');
      return true;
    } catch (error) {
      if (!silent) showToast(`Suspend failed: ${error.message}`, 'error');
      return false;
    }
  };

  const pollRun = async (runId) => {
    const offset = offsetRef.current ?? 0;

    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run/${runId}?offset=${offset}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch run status');

      if (typeof data.offset === 'number') {
        offsetRef.current = data.offset;
      }

      if (data.model && typeof onGlobalModelSwitch === 'function' && data.model !== selectedModel) {
        onGlobalModelSwitch(data.model, data.active_model_label || data.model);
      }

      setRunState((prev) => ({
        ...prev,
        evaluator: data.evaluator ?? prev.evaluator,
        status: data.status,
        offset: data.offset ?? prev.offset,
        progress: data.progress ?? prev.progress,
        metricsTable: data.metrics_table ?? prev.metricsTable,
      }));

      if (data.status !== 'running') {
        stopPolling();
        if (data.status === 'completed') {
          showToast(`${data.evaluator} evaluator completed`, 'success');
        } else if (data.status === 'cancelled') {
          showToast(`${data.evaluator} evaluator cancelled`, 'warning');
        } else if (data.status === 'suspended') {
          // No toast on auto-suspend (tab switches) to avoid noise.
        } else {
          showToast(`${data.evaluator} evaluator failed (exit ${data.exit_code})`, 'error');
        }
      }
    } catch (error) {
      stopPolling();
      setRunState((prev) => ({ ...prev, status: 'failed' }));
      showToast(`status poll failed: ${error.message}`, 'error');
    }
  };

  const startPolling = (runId) => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      pollRun(runId);
    }, 1200);
  };

  const runEvaluator = async () => {
    if (!selectedEvaluator) {
      showToast('Please choose an evaluator first', 'warning');
      return;
    }
    if (!selectedModel) {
      showToast('Please wait for model initialization', 'warning');
      return;
    }

    const payload = {
      evaluator: selectedEvaluator,
      limit: limits[selectedEvaluator],
      model: selectedModel,
      temperature,
      custom_model: getCustomModelPayload(),
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to start evaluator');

      offsetRef.current = 0;
      setResumedRun(false);
      setRunState({
        evaluator: selectedEvaluator,
        runId: data.run_id,
        status: 'running',
        offset: 0,
        progress: { total: limits[selectedEvaluator], active_index: 1, items: [] },
        metricsTable: null,
      });
      showToast(`${selectedEvaluator} evaluator started`, 'info');
    } catch (error) {
      showToast(`${selectedEvaluator} start failed: ${error.message}`, 'error');
    }
  };

  const resumeEvaluator = async () => {
    if (!runState.runId) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run/${runState.runId}/resume`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to resume evaluator');
      setRunState((prev) => ({
        ...prev,
        status: 'running',
        progress: data.progress ?? prev.progress,
        metricsTable: data.metrics_table ?? prev.metricsTable,
      }));
      showToast('Evaluator resumed', 'info');
    } catch (error) {
      showToast(`Resume failed: ${error.message}`, 'error');
    }
  };

  const viewRecord = async (itemIndex) => {
    if (!runState.runId) return;
    setRecordDialog({
      open: true,
      loading: true,
      error: '',
      itemIndex,
      filename: '',
      content: null,
    });
    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/evaluators/run/${runState.runId}/record/${itemIndex}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to load record');
      setRecordDialog({
        open: true,
        loading: false,
        error: '',
        itemIndex,
        filename: data.filename || '',
        content: data.content ?? null,
      });
    } catch (error) {
      setRecordDialog({
        open: true,
        loading: false,
        error: error.message,
        itemIndex,
        filename: '',
        content: null,
      });
      showToast(`Failed to load record: ${error.message}`, 'error');
    }
  };

  const copyRecordJson = async () => {
    if (!recordDialog.content) return;
    try {
      const raw = JSON.stringify(recordDialog.content, null, 2);
      await navigator.clipboard.writeText(raw);
      showToast('Record JSON copied', 'success');
    } catch (error) {
      showToast(`Copy failed: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.selectedEvaluator) setSelectedEvaluator(saved.selectedEvaluator);
        if (saved.limits) setLimits(saved.limits);
        if (saved.runState) {
          setRunState(saved.runState);
          offsetRef.current = saved.runState.offset || 0;
          if (saved.runState.runId && saved.runState.status === 'running') {
            setResumedRun(true);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore evaluator dashboard state', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      selectedEvaluator,
      limits,
      runState,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, selectedEvaluator, limits, runState]);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  useEffect(() => {
    if (!registerSuspendHandler) return undefined;
    return registerSuspendHandler(() => suspendEvaluator({ silent: true }));
  }, [registerSuspendHandler]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!runState.runId || runState.status !== 'running') return;
    pollRun(runState.runId);
    startPolling(runState.runId);
    return () => stopPolling();
  }, [runState.runId, runState.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (runState.status !== 'running') return;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(id);
  }, [runState.status]);

  useEffect(() => {
    return () => {
      stopPolling();
      const current = runStateRef.current;
      if (current?.runId && current?.status === 'running') {
        fetch(`${apiBaseUrl}/api/storage/evaluators/run/${current.runId}/suspend`, {
          method: 'POST',
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [apiBaseUrl]);

  const effectiveEvaluator = runState.evaluator || selectedEvaluator;
  const stageNodes = effectiveEvaluator === 'workflow'
    ? ['parser', 'reasoner', 'generator', 'validator', 'regeneration', 'revalidation']
    : ['parser', 'reasoner'];

  const stageLabel = (node) => {
    if (node === 'revalidation') return 'revalidation';
    return node;
  };

  const stageBadge = (state) => {
    if (state === 'complete') return 'text-emerald-400';
    if (state === 'running') return 'text-blue-400 animate-pulse';
    if (state === 'cancelled') return 'text-red-500';
    if (state === 'skipped') return 'text-gray-400';
    return 'text-gray-500';
  };

  const formatSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
  const formatNum = (n) => {
    const v = Number(n || 0);
    return Number.isFinite(v) ? v.toLocaleString() : '0';
  };
  const formatTableCell = (value, columnName) => {
    if (value === null || value === undefined) return '-';
    const raw = String(value).trim();
    if (raw === '' || raw.toLowerCase() === 'null') return '-';
    const num = Number(raw);
    if (!Number.isFinite(num)) return raw;

    if (columnName === 'Delta') {
      return `${(num * 100).toFixed(2)}%`;
    }
    return num.toFixed(2);
  };

  const getStageTimeLabel = (item, node) => {
    const meta = item?.stage_times?.[node];
    if (!meta) return '';
    if (meta.duration_ms != null) {
      return formatSeconds(meta.duration_ms);
    }
    if (item?.stages?.[node] === 'running' && meta.started_at) {
      const elapsedMs = Math.max(0, nowMs - Math.floor(meta.started_at * 1000));
      return formatSeconds(elapsedMs);
    }
    return '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`${cardClass} border rounded-xl p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${textClass}`}>Evaluator Dashboard</h2>
            <p className={`text-sm mt-1 ${mutedTextClass}`}>
              Choose one evaluator, set input count, then run.
            </p>
          </div>
          <div className={`text-xs px-3 py-2 rounded-lg ${inputClass}`}>
            Current Model: {selectedModel || 'Loading...'}
          </div>
        </div>

        <div className="mt-4">
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Evaluator</label>
          <select
            value={selectedEvaluator}
            onChange={(e) => setSelectedEvaluator(e.target.value)}
            className={`w-full md:w-96 px-3 py-2 border rounded-lg ${inputClass}`}
          >
            <option value="">Select evaluator...</option>
            <option value="workflow">Workflow Evaluator</option>
            <option value="reasoner">Reasoner Evaluator</option>
          </select>
        </div>
      </div>

      {resumedRun && runState.status === 'running' && (
        <div className={`border rounded-xl px-4 py-3 ${darkMode ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          Resuming existing evaluator run and continuing live tracking.
        </div>
      )}

      {selectedEvaluator && (
        <div className={`${cardClass} border rounded-xl p-5 space-y-4`}>
          <div>
            <h3 className={`text-lg font-semibold ${textClass}`}>
              {selectedEvaluator === 'workflow' ? 'Workflow Evaluator' : 'Reasoner Evaluator'}
            </h3>
            <p className={`text-sm ${mutedTextClass}`}>
              {selectedEvaluator === 'workflow'
                ? 'Input -> Parser -> Reasoner -> Generator -> Validator -> Metrics'
                : 'Input -> Parser -> Reasoner -> Metrics'}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${textClass}`}>Input Count (--limit)</label>
              <span className={`text-sm font-semibold ${textClass}`}>{limits[selectedEvaluator]}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={limits[selectedEvaluator]}
              onChange={(e) => setLimits((prev) => ({ ...prev, [selectedEvaluator]: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runState.status === 'suspended' ? resumeEvaluator : runEvaluator}
              disabled={runState.status === 'running'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                runState.status === 'suspended'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              {runState.status === 'suspended' ? 'Continue' : 'Run'}
            </button>
            {(runState.status === 'running' || runState.status === 'suspended') && (
              <button
                onClick={stopCurrentRun}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {runState.runId && (
        <div className={`${cardClass} border rounded-xl p-5 space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={`text-lg font-semibold ${textClass}`}>Execution Progress</h3>
            <div className={`text-xs px-3 py-2 rounded-lg ${inputClass}`}>
              Tokens (cumulative) In/Out: {formatNum(runState.progress?.tokens?.total_in)} / {formatNum(runState.progress?.tokens?.total_out)}
            </div>
          </div>
          {(runState.progress?.items || []).map((item) => (
            <div key={item.index} className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : item.status === 'cancelled' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : item.status === 'running' && runState.status === 'suspended' ? (
                  <Loader2 className="w-4 h-4 text-yellow-500" />
                ) : item.status === 'running' ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span
                  title={`Input ${item.index}: ${item.input_preview || ''}`}
                  className={`text-sm ${item.status === 'running' && runState.status === 'suspended' ? 'text-yellow-500' : textClass} flex-1 min-w-0 truncate`}
                >
                  Input {item.index}: {item.input_preview || '(loading...)'}
                  {item.status === 'running' && runState.status === 'suspended' ? ' (suspended)' : ''}
                </span>
                {item.record_available && (
                  <button
                    onClick={() => viewRecord(item.index)}
                    className={`text-xs px-2 py-1 rounded border ${darkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'} ${textClass}`}
                  >
                    View Record
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {stageNodes.map((node, idx) => (
                  <React.Fragment key={`${item.index}-${node}`}>
                    <div className={`text-xs capitalize ${stageBadge(item.stages?.[node] || 'pending')}`}>
                      {item.stages?.[node] === 'complete'
                        ? '●'
                        : item.stages?.[node] === 'running'
                        ? '◉'
                        : item.stages?.[node] === 'cancelled'
                        ? '✕'
                        : item.stages?.[node] === 'skipped'
                        ? '◌'
                        : '○'} {stageLabel(node)}
                      {item.stages?.[node] === 'cancelled' ? ' (cancelled)' : ''}
                      {getStageTimeLabel(item, node) ? ` (${getStageTimeLabel(item, node)})` : ''}
                    </div>
                    {idx < stageNodes.length - 1 && <div className="text-gray-500">-</div>}
                  </React.Fragment>
                ))}
              </div>
              <div className={`mt-2 text-xs ${mutedTextClass}`}>
                Tokens In/Out: {formatNum(item?.tokens?.total_in)} / {formatNum(item?.tokens?.total_out)}
                {' • '}
                Parser {formatNum(item?.tokens?.parser_in)}/{formatNum(item?.tokens?.parser_out)}
                {' • '}
                Reasoner {formatNum(item?.tokens?.reasoner_in)}/{formatNum(item?.tokens?.reasoner_out)}
                {effectiveEvaluator === 'workflow' && (
                  <>
                    {' • '}Generator {formatNum(item?.tokens?.generator_in)}/{formatNum(item?.tokens?.generator_out)}
                    {' • '}Validator {formatNum(item?.tokens?.validator_in)}/{formatNum(item?.tokens?.validator_out)}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {runState.status === 'completed' && runState.metricsTable && (
        <div className={`${cardClass} border rounded-xl p-5`}>
          <h3 className={`text-lg font-semibold ${textClass} mb-3`}>Performance / Metrics</h3>
          <div className="overflow-auto max-h-[420px] rounded border border-gray-300 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className={darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}>
                <tr>
                  {runState.metricsTable.columns.map((c) => (
                    <th key={c} className="text-left px-3 py-2 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runState.metricsTable.rows.map((row, idx) => (
                  <tr key={`row-${idx}`} className={idx % 2 === 0 ? '' : darkMode ? 'bg-gray-900/40' : 'bg-gray-50'}>
                    {row.map((cell, cidx) => (
                      <td key={`cell-${idx}-${cidx}`} className="px-3 py-2 align-top">
                        {formatTableCell(cell, runState.metricsTable.columns[cidx])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recordDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardClass} border rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 dark:border-gray-700">
              <h4 className={`font-semibold ${textClass}`}>
                Input {recordDialog.itemIndex} Record {recordDialog.filename ? `(${recordDialog.filename})` : ''}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyRecordJson}
                  disabled={recordDialog.loading || !!recordDialog.error || !recordDialog.content}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setRecordDialog({ open: false, loading: false, error: '', itemIndex: null, filename: '', content: null })}
                  className={`px-3 py-1 rounded ${inputClass}`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              {recordDialog.loading ? (
                <div className={mutedTextClass}>Loading record...</div>
              ) : recordDialog.error ? (
                <div className="text-red-500 text-sm">{recordDialog.error}</div>
              ) : (
                <pre className={`text-xs whitespace-pre-wrap break-words ${textClass}`}>
                  {JSON.stringify(recordDialog.content, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorPage;
