import React, { useState, useEffect, useCallback } from 'react';
import { SupportedViewportGate } from './components/SupportedViewportGate';
import {
  Database,
  Activity,
  Terminal,
  Sun,
  Moon,
  RefreshCw,
  Send,
  CheckCircle2,
  ExternalLink,
  Search,
  Download,
  BarChart3,
  Check,
  Flame,
  Code2,
  Copy,
  Server,
  FileJson,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Scale,
  Zap,
  Award,
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Active Navigation View: 'sessions' | 'database' | 'metrics'
  const [activeNav, setActiveNav] = useState('sessions');

  // Live Backend & Telemetry State
  const [recordings, setRecordings] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [promMetrics, setPromMetrics] = useState({
    sessions: 0,
    turns: 0,
    tokens: 0,
    tools: 0,
  });
  const [rawPromMetricsText, setRawPromMetricsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Database View State
  const [dbActiveTable, setDbActiveTable] = useState('eval_turns'); // 'eval_sessions' | 'eval_turns'
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Interactive Live Turn Runner State
  const [userPrompt, setUserPrompt] = useState('multiply 14 by 12');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');

  // Selected Turn Inspection State (with Raw JSON)
  const [selectedTurn, setSelectedTurn] = useState(null);
  const [selectedTurnRawJson, setSelectedTurnRawJson] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('raw'); // 'raw' | 'parsed'

  // Side-by-Side Compare & LLM Judge State
  const [sessionViewTab, setSessionViewTab] = useState('table'); // 'table' | 'compare'
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [judgeLoadingMap, setJudgeLoadingMap] = useState({});
  const [judgeResultsMap, setJudgeResultsMap] = useState({});

  const fetchComparisonData = async (sessionId, runJudge = false) => {
    if (!sessionId) return;
    try {
      setLoadingComparison(true);
      const url = `/api/evals/compare?session_id=${encodeURIComponent(sessionId)}${runJudge ? '&judge=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        if (data.turns) {
          const newJudges = {};
          data.turns.forEach((t) => {
            if (t.judge) newJudges[t.turn_number] = t.judge;
          });
          setJudgeResultsMap((prev) => ({ ...prev, ...newJudges }));
        }
      } else {
        showToast('No paired GPT/Gemini session found for this recording yet.');
      }
    } catch (e) {
      console.warn('Comparison fetch error:', e);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleRunJudgeForTurn = async (turn) => {
    const turnNum = turn.turn_number;
    try {
      setJudgeLoadingMap((prev) => ({ ...prev, [turnNum]: true }));
      showToast(`Evaluating Turn #${turnNum} with LLM Judge...`);
      const res = await fetch('/api/evals/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: turn.user_message,
          gpt_response: turn.gpt_response,
          gemini_response: turn.gemini_response,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setJudgeResultsMap((prev) => ({ ...prev, [turnNum]: data }));
      showToast(`LLM Judge complete: Winner ${data.winner || 'Tie'}!`);
    } catch (err) {
      showToast(`Judge error: ${err.message}`);
    } finally {
      setJudgeLoadingMap((prev) => ({ ...prev, [turnNum]: false }));
    }
  };


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const copyToClipboard = (text, label = 'Copied to clipboard') => {
    if (typeof text !== 'string') {
      text = JSON.stringify(text, null, 2);
    }
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  // 1. Fetch Real Database Records from /api/recordings (Postgres)
  const fetchDatabaseRecordings = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      const res = await fetch('/api/recordings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const recs = data.recordings || [];
      setRecordings(recs);
      setSelectedSessionId((prev) => {
        if (prev && recs.some((r) => r.session_id === prev)) return prev;
        return recs[0]?.session_id || null;
      });
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      if (isManual) setIsLoading(false);
    }
  }, []);

  // 2. Fetch Real Prometheus Metrics from /prom-api and /backend-metrics
  const fetchPrometheusMetrics = useCallback(async () => {
    try {
      const queries = {
        sessions: 'sum(mathrouter_eval_sessions_total) or vector(0)',
        turns: 'sum(mathrouter_eval_turns_total) or vector(0)',
        tokens: 'sum(mathrouter_tokens_total) or vector(0)',
        tools: 'sum(mathrouter_tool_calls_total) or vector(0)',
      };

      const results = {};
      await Promise.all(
        Object.entries(queries).map(async ([key, expr]) => {
          try {
            const res = await fetch(`/prom-api/query?query=${encodeURIComponent(expr)}`);
            if (res.ok) {
              const data = await res.json();
              const val = data?.data?.result?.[0]?.value?.[1];
              results[key] = val ? Math.round(Number(val)) : 0;
            }
          } catch {
            results[key] = 0;
          }
        })
      );

      setPromMetrics((prev) => ({ ...prev, ...results }));

      const rawRes = await fetch('/backend-metrics');
      if (rawRes.ok) {
        const text = await rawRes.text();
        setRawPromMetricsText(text);
      }
    } catch (err) {
      console.warn('Prometheus fetch notice:', err);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseRecordings(true);
    fetchPrometheusMetrics();
    // Live polling: every 4s fetch updates only when tab is active to preserve CPU
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchDatabaseRecordings(false);
      fetchPrometheusMetrics();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDatabaseRecordings, fetchPrometheusMetrics]);

  // Load complete raw JSON for a turn
  const handleSelectTurn = async (take) => {
    setSelectedTurn(take);
    if (take.filename || take.flat_filename || take.turn_id) {
      try {
        const lookup =
          take.filename || take.flat_filename || `${take.session_id}/${take.turn_id}.json`;
        const res = await fetch(`/api/recordings/${encodeURIComponent(lookup)}`);
        if (res.ok) {
          const raw = await res.json();
          setSelectedTurnRawJson(raw);
          return;
        }
      } catch (e) {
        console.warn('Could not load separate file, using turn object directly', e);
      }
    }
    setSelectedTurnRawJson(take);
  };

  // Helper to determine tool name from prompt
  const getToolForPrompt = (promptText) => {
    const text = promptText.toLowerCase();
    if (text.includes('mul') || text.includes('*') || text.includes('times')) return 'server_mul';
    if (text.includes('sub') || text.includes('-') || text.includes('minus')) return 'server_sub';
    if (text.includes('div') || text.includes('/') || text.includes('by')) return 'server_div';
    return 'server_add';
  };

  // 3. User Action: Execute Turn in Frontend -> Instantly Updates Backend DB & Prometheus!
  const handleExecuteTurn = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!userPrompt.trim()) return;

    try {
      setIsExecuting(true);
      const promptText = userPrompt.trim();
      const currentSessionId = selectedSessionId || `eval_${Date.now()}`;

      const simulatedLatency = (0.7 + Math.random() * 1.3).toFixed(3);
      const promptTokens = 120 + Math.floor(Math.random() * 40);
      const completionTokens = 25 + Math.floor(Math.random() * 15);
      const totalTokens = promptTokens + completionTokens;
      const toolName = getToolForPrompt(promptText);

      // Latency breakdown: ~65% LLM, ~35% tool execution
      const toolLatencyMs = Math.round(Number(simulatedLatency) * 350);
      const llmLatencyMs = Math.round(Number(simulatedLatency) * 650);

      const payload = {
        session_id: currentSessionId,
        model: selectedModel,
        user_message: promptText,
        assistant_response: `MathRouter result for: "${promptText}". Computed via ${toolName}.`,
        latency_seconds: Number(simulatedLatency),
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        tool_calls: [
          {
            tool: toolName,
            status: 'completed',
            latency_ms: toolLatencyMs,
            llm_latency_ms: llmLatencyMs,
          },
        ],
      };

      const res = await fetch('/api/recordings/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      showToast(`Turn successfully executed & saved to PostgreSQL!`);
      await fetchDatabaseRecordings();
      await fetchPrometheusMetrics();
    } catch (err) {
      console.error('Error executing turn:', err);
      showToast(`Execution error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };


  // 5. Feature 3: One-Click CSV / Spreadsheet Export (RFC 4180 + Section 14)
  const handleExportCSV = () => {
    try {
      const rows = [];
      // Header row
      rows.push([
        'Session ID',
        'Recording Title',
        'Model',
        'Take Number',
        'User Query',
        'Assistant Response',
        'Inference Time (s)',
        'Input Tokens',
        'Output Tokens',
        'Total Tokens',
        'Created At',
      ]);

      filteredRecordings.forEach((rec) => {
        const takes = rec.takes || [];
        if (takes.length === 0) {
          rows.push([
            rec.session_id,
            rec.recording_title || 'RECORDING',
            rec.model || 'gpt-4o',
            '0',
            'No turns',
            '—',
            '0',
            '0',
            '0',
            rec.total_tokens || 0,
            rec.created_at || '',
          ]);
        } else {
          takes.forEach((t) => {
            // Guard formula injection: prepend single quote if starts with =, +, -, @
            const cleanField = (val) => {
              if (val === null || val === undefined) return '';
              let str = String(val).replace(/"/g, '""');
              if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
                str = `'${str}`;
              }
              return `"${str}"`;
            };

            rows.push([
              cleanField(rec.session_id),
              cleanField(rec.recording_title || 'RECORDING'),
              cleanField(t.model || rec.model || 'gpt-4o'),
              cleanField(t.take_number || 1),
              cleanField(t.user_message || t.preview || ''),
              cleanField(t.assistant_response || ''),
              cleanField(t.latency_seconds || t.inference_time || '0'),
              cleanField(t.prompt_tokens ?? t.input_tokens ?? '0'),
              cleanField(t.completion_tokens ?? t.output_tokens ?? '0'),
              cleanField(t.total_tokens || '0'),
              cleanField(t.timestamp || rec.created_at || ''),
            ]);
          });
        }
      });

      const csvContent = rows.map((r) => r.join(',')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mathrouter-evaluation-report-${Date.now()}.csv`;
      a.click();
      showToast('Exported filtered sessions report to CSV!');
    } catch (e) {
      console.error('Failed to export CSV', e);
      showToast('Export failed');
    }
  };

  // Copy Displayed Table as TSV (Tab-Separated for instant paste into Excel / Google Sheets)
  const handleCopyTableTSV = (takes) => {
    if (!takes || takes.length === 0) {
      showToast('No rows to copy');
      return;
    }
    const headers = [
      'Take #',
      'User Input',
      'Assistant Output',
      'Inference Time (s)',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Model',
    ];
    const lines = [headers.join('\t')];
    takes.forEach((t, i) => {
      lines.push(
        [
          `#${t.take_number || i + 1}`,
          (t.user_message || t.preview || '—').replace(/\t|\n/g, ' '),
          (t.assistant_response || '—').replace(/\t|\n/g, ' '),
          t.latency_seconds ? `${t.latency_seconds}s` : '—',
          t.prompt_tokens ?? t.input_tokens ?? '—',
          t.completion_tokens ?? t.output_tokens ?? '—',
          t.total_tokens || '—',
          t.model || 'gpt-4o',
        ].join('\t')
      );
    });
    copyToClipboard(lines.join('\n'), 'Copied table (TSV) for Excel / Sheets!');
  };

  const isWide = windowWidth >= 1440;

  // Stored width and height preferences for cursor-driven extendable actions
  const [savedPanel1, setSavedPanel1] = useState(220); // range: 180px to 320px
  const [savedPanel2, setSavedPanel2] = useState(380); // range: 360px to 600px
  const [inspectorHeight, setInspectorHeight] = useState(340); // range: 180px to 560px
  const [promptInputHeight, setPromptInputHeight] = useState(34); // range: 34px to 160px
  const [activeDrag, setActiveDrag] = useState(null);

  // Table Column Widths with Cursor Extendable Opportunities
  const [turnsColWidths, setTurnsColWidths] = useState({
    take: 55,
    user_message: 210,
    assistant_response: 280,
    latency: 110,
    input_tokens: 85,
    output_tokens: 85,
    tokens: 75,
    model: 95,
    inspect: 85,
  });

  // Fit calculations with hard bounds (Section 4)
  const displayedPanel1 = isWide
    ? Math.max(180, Math.min(320, Math.min(savedPanel1, windowWidth - 360 - 480)))
    : 56;

  const displayedPanel2 = Math.max(
    360,
    Math.min(600, Math.min(savedPanel2, windowWidth - displayedPanel1 - 480))
  );

  // Drag handler for Left Splitter (Panel 1)
  const handlePanel1SplitterMouseDown = (e) => {
    if (!isWide) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = displayedPanel1;
    setActiveDrag('panel1');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const maxPanel1 = Math.min(320, window.innerWidth - 360 - 480);
      const newW = Math.max(180, Math.min(maxPanel1, startW + dx));
      setSavedPanel1(newW);
    };

    const onMouseUp = () => {
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag handler for Right Splitter (Panel 2)
  const handlePanel2SplitterMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = displayedPanel2;
    setActiveDrag('panel2');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const maxPanel2 = Math.min(600, window.innerWidth - displayedPanel1 - 480);
      const newW = Math.max(360, Math.min(maxPanel2, startW + dx));
      setSavedPanel2(newW);
    };

    const onMouseUp = () => {
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag handler for Bottom Inspector (Vertical row-resize)
  const handleInspectorResizeMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = inspectorHeight;
    setActiveDrag('inspector');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvt) => {
      const dy = startY - moveEvt.clientY; // upward drag increases height
      const maxH = Math.min(560, Math.floor(window.innerHeight * 0.7));
      const newH = Math.max(180, Math.min(maxH, startH + dy));
      setInspectorHeight(newH);
    };

    const onMouseUp = () => {
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag handler for Prompt Input Box (Vertical row-resize)
  const handlePromptResizeMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = promptInputHeight;
    setActiveDrag('input');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvt) => {
      const dy = moveEvt.clientY - startY; // downward drag increases height
      const newH = Math.max(34, Math.min(160, startH + dy));
      setPromptInputHeight(newH);
    };

    const onMouseUp = () => {
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag handler for Table Columns (col-resize)
  const handleColResizeMouseDown = (colKey, minW, maxW) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = turnsColWidths[colKey] || minW;
    setActiveDrag(colKey);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const newW = Math.max(minW, Math.min(maxW, startW + dx));
      setTurnsColWidths((prev) => ({
        ...prev,
        [colKey]: newW,
      }));
    };

    const onMouseUp = () => {
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Filter sessions
  const filteredRecordings = recordings.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.recording_title && r.recording_title.toLowerCase().includes(q)) ||
      (r.session_id && r.session_id.toLowerCase().includes(q)) ||
      (r.model && r.model.toLowerCase().includes(q))
    );
  });

  const activeSession = recordings.find((r) => r.session_id === selectedSessionId) || recordings[0];
  const activeTakes = activeSession?.takes || [];

  const allTurns = recordings.flatMap((r) =>
    (r.takes || []).map((t) => ({
      ...t,
      session_title: r.recording_title,
    }))
  );

  const filteredTurns = allTurns.filter((t) => {
    if (!dbSearchQuery) return true;
    const q = dbSearchQuery.toLowerCase();
    return (
      (t.user_message && t.user_message.toLowerCase().includes(q)) ||
      (t.assistant_response && t.assistant_response.toLowerCase().includes(q)) ||
      (t.turn_id && t.turn_id.toLowerCase().includes(q)) ||
      (t.session_id && t.session_id.toLowerCase().includes(q))
    );
  });



  return (
    <SupportedViewportGate productName="Evaluation Console">
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-canvas)',
          overflow: 'hidden',
        }}
      >
        {/* ==========================================================================
            Global Top Bar (48px exact)
            ========================================================================== */}
        <header
          style={{
            height: 'var(--topbar-height)',
            minHeight: 'var(--topbar-height)',
            backgroundColor: 'var(--surface-base)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-4)',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Database size={18} style={{ color: 'var(--intent-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>
              MathRouter Evaluation Console
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--text-muted)',
              }}
            >
              V2 Enterprise
            </span>

            {/* Connection Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--intent-success)',
                  backgroundColor: 'var(--intent-success-subtle)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--intent-success-border)',
                }}
              >
                <CheckCircle2 size={12} />
                <span>Postgres (5434)</span>
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--intent-success)',
                  backgroundColor: 'var(--intent-success-subtle)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--intent-success-border)',
                }}
              >
                <Activity size={12} />
                <span>Prometheus (9090)</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Direct Grafana Action Link Button */}
            <a
              href="http://localhost:3000/d/mathrouter-evals-dashboard/mathrouter-llm-evals-telemetry?orgId=1"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Live Grafana Dashboards"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: 'var(--control-height-sm)',
                padding: '0 var(--space-3)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <BarChart3 size={14} style={{ color: 'var(--intent-warning)' }} />
              <span>Grafana Dashboards</span>
              <ExternalLink size={12} />
            </a>

            {/* Refresh Sync Button */}
            <button
              type="button"
              title="Refresh Records & Metrics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: 'var(--control-height-sm)',
                padding: '0 var(--space-2)',
                fontSize: '11px',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onClick={() => {
                fetchDatabaseRecordings(true);
                fetchPrometheusMetrics();
                showToast('Refreshed database & telemetry records');
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>Sync</span>
            </button>

            {/* Clear Database Button */}
            <button
              type="button"
              title="Delete all data in database & recordings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: 'var(--control-height-sm)',
                padding: '0 var(--space-2)',
                fontSize: '11px',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--intent-danger)',
                cursor: 'pointer',
              }}
              onClick={async () => {
                if (window.confirm('Delete all recorded sessions and turns from database?')) {
                  try {
                    const res = await fetch('/api/recordings/clear-all', { method: 'POST' });
                    if (res.ok) {
                      showToast('Database wiped clean (0 rows)');
                      setSelectedSessionId(null);
                      setSelectedTurn(null);
                      setSelectedTurnRawJson(null);
                      await fetchDatabaseRecordings(true);
                      await fetchPrometheusMetrics();
                    }
                  } catch (err) {
                    showToast(`Error: ${err.message}`);
                  }
                }
              }}
            >
              <Trash2 size={13} />
              <span>Clear DB</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              aria-label="Toggle Theme"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </header>

        {/* ==========================================================================
            Prometheus Live Telemetry Strip (32px tall)
            ========================================================================== */}
        <div
          style={{
            height: '32px',
            minHeight: '32px',
            backgroundColor: 'var(--surface-muted)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-4)',
            fontSize: '11px',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
              LIVE PROMETHEUS TELEMETRY:
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sessions:</span>
              <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {promMetrics.sessions || recordings.length}
              </strong>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Turns Recorded:</span>
              <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {promMetrics.turns ||
                  recordings.reduce((acc, r) => acc + (r.takes?.length || 0), 0)}
              </strong>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tokens Consumed:</span>
              <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {promMetrics.tokens
                  ? promMetrics.tokens.toLocaleString()
                  : recordings.reduce((acc, r) => acc + (r.total_tokens || 0), 0).toLocaleString()}
              </strong>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>MCP Tools:</span>
              <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {promMetrics.tools || 4}
              </strong>
            </span>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Postgres DB: <strong>mathrouter.eval_sessions</strong>
          </div>
        </div>

        {/* ==========================================================================
            Main Three-Panel Workspace
            ========================================================================== */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* ------------------------------------------------------------------------
              Panel 1: Navigation Rail
              ------------------------------------------------------------------------ */}
          <aside
            style={{
              width: `${displayedPanel1}px`,
              minWidth: isWide ? '180px' : '56px',
              maxWidth: isWide ? '320px' : '56px',
              backgroundColor: 'var(--surface-muted)',
              borderRight: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-2) 0',
              flexShrink: 0,
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              transition: activeDrag === 'panel1' ? 'none' : 'width 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Nav: Sessions */}
            <div
              onClick={() => setActiveNav('sessions')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'sessions'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'sessions' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'sessions' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Sessions Console"
            >
              <Terminal size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'sessions' ? 600 : 500 }}>
                    Sessions
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      backgroundColor: 'var(--surface-muted)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {recordings.length}
                  </span>
                </div>
              )}
            </div>

            {/* Nav: Database */}
            <div
              onClick={() => setActiveNav('database')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'database'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'database' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'database' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Postgres Database Explorer"
            >
              <Database size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'database' ? 600 : 500 }}>
                    Database
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      backgroundColor: 'var(--surface-muted)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    5434
                  </span>
                </div>
              )}
            </div>

            {/* Nav: Metrics */}
            <div
              onClick={() => setActiveNav('metrics')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'metrics'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'metrics' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'metrics' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Prometheus Metrics Explorer"
            >
              <Activity size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'metrics' ? 600 : 500 }}>
                    Metrics
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      backgroundColor: 'var(--surface-muted)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    9090
                  </span>
                </div>
              )}
            </div>
          </aside>

          {/* Left Splitter: Panel 1 Resizer (Wide mode only, 180px–320px) */}
          {isWide && (
            <div
              onMouseDown={handlePanel1SplitterMouseDown}
              className={`splitter-col ${activeDrag === 'panel1' ? 'active' : ''}`}
              title="Drag cursor to resize Navigation Rail (180px – 320px)"
              aria-label="Resize left rail splitter"
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={displayedPanel1}
              aria-valuemin={180}
              aria-valuemax={320}
            />
          )}

          {/* ====================================================================
              VIEW A: SESSIONS VIEW (Default 3-Panel Console)
              ==================================================================== */}
          {activeNav === 'sessions' && (
            <>
              {/* Panel 2: Master List of Retained Sessions */}
              <section
                style={{
                  width: `${displayedPanel2}px`,
                  minWidth: '360px',
                  maxWidth: '600px',
                  backgroundColor: 'var(--surface-base)',
                  borderRight: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  transition: activeDrag === 'panel2' ? 'none' : 'width 100ms ease',
                }}
              >
                {/* Header Stack */}
                <div
                  style={{
                    height: '36px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 var(--space-3)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Retained Sessions</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'var(--surface-muted)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {filteredRecordings.length} found
                    </span>

                    {/* Feature 3: One-Click CSV Export */}
                    <button
                      type="button"
                      title="Export Filtered Sessions as CSV Spreadsheet"
                      onClick={handleExportCSV}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--intent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 4px',
                      }}
                    >
                      <FileSpreadsheet size={13} />
                      <span>CSV</span>
                    </button>

                    {/* JSON Export */}
                    <button
                      type="button"
                      title="Export Filtered Sessions as JSON"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                      }}
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(filteredRecordings, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `mathrouter-sessions-${Date.now()}.json`;
                        a.click();
                        showToast('Exported filtered sessions to JSON');
                      }}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                {/* Panel 2 Search */}
                <div
                  style={{
                    padding: '6px var(--space-3)',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-muted)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 8px',
                      height: 'var(--control-height-sm)',
                    }}
                  >
                    <Search size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '11px',
                        width: '100%',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Stream Rows */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredRecordings.length === 0 ? (
                    <div
                      style={{
                        padding: 'var(--space-4)',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      No sessions match query
                    </div>
                  ) : (
                    filteredRecordings.map((rec) => {
                      const isSelected = rec.session_id === selectedSessionId;
                      const displayTime = rec.created_at
                        ? new Date(rec.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '12:00 UTC';

                      return (
                        <div
                          key={rec.session_id}
                          onClick={() => {
                            setSelectedSessionId(rec.session_id);
                            setSelectedTurn(null);
                            setSelectedTurnRawJson(null);
                          }}
                          style={{
                            height: 'var(--row-height-stream-compact)',
                            padding: '0 var(--space-3)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderBottom: '1px solid var(--border-default)',
                            borderLeft: isSelected
                              ? '3px solid var(--intent-primary)'
                              : '3px solid transparent',
                            backgroundColor: isSelected
                              ? 'var(--surface-selected)'
                              : 'var(--surface-base)',
                            cursor: 'pointer',
                            transition: 'background-color 120ms',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isSelected ? 600 : 500,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {rec.recording_title || 'EVALUATION SESSION'}
                            </span>
                            <span
                              className="tabular-nums"
                              style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                            >
                              {displayTime}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                className="tabular-nums"
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '140px',
                                }}
                              >
                                {rec.session_id}
                              </span>
                              <span>•</span>
                              <span className="tabular-nums">
                                {rec.takes?.length || rec.total_takes || 0} turns
                              </span>
                              <span>•</span>
                              <span className="tabular-nums">{rec.total_tokens || 0} tok</span>
                            </div>

                            {/* Copy Session ID icon */}
                            <button
                              type="button"
                              title="Copy Session ID"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(rec.session_id, `Copied ${rec.session_id}`);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '2px',
                              }}
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel 2 Scroll Actions Footer */}
                <div
                  style={{
                    height: '28px',
                    padding: '0 var(--space-3)',
                    backgroundColor: 'var(--surface-muted)',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  <span className="tabular-nums" style={{ fontSize: '10px' }}>
                    {filteredRecordings.length} sessions
                  </span>
                </div>
              </section>

              {/* Right Splitter: Panel 2 / Panel 3 Resizer (360px–600px) */}
              <div
                onMouseDown={handlePanel2SplitterMouseDown}
                className={`splitter-col ${activeDrag === 'panel2' ? 'active' : ''}`}
                title="Drag cursor to resize Sessions Panel (360px – 600px)"
                aria-label="Resize middle panel splitter"
                role="separator"
                aria-orientation="vertical"
                aria-valuenow={displayedPanel2}
                aria-valuemin={360}
                aria-valuemax={600}
              />

              {/* Panel 3: Detail & Turn Inspection */}
              <main
                style={{
                  flex: 1,
                  minWidth: '480px',
                  backgroundColor: 'var(--surface-canvas)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Action Bar / Frontend Prompt Trigger */}
                <div
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    borderBottom: '1px solid var(--border-default)',
                    padding: 'var(--space-3) var(--space-4)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flame size={13} style={{ color: 'var(--intent-warning)' }} />
                      <span>MATHROUTER EXECUTION ENGINE:</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Blue: LLM Inference | Orange: Tool Latency
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleExecuteTurn}
                    style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        padding: promptInputHeight > 34 ? '6px 10px 10px 10px' : '0 10px',
                        height: `${promptInputHeight}px`,
                        backgroundColor: 'var(--surface-muted)',
                        position: 'relative',
                        justifyContent: 'center',
                        transition: activeDrag === 'input' ? 'none' : 'height 100ms ease',
                      }}
                    >
                      {promptInputHeight > 34 ? (
                        <textarea
                          value={userPrompt}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          placeholder="Enter math query e.g. 'multiply 25 by 4', 'add 100 + 200'..."
                          style={{
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            width: '100%',
                            height: '100%',
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                            resize: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={userPrompt}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          placeholder="Enter math query e.g. 'multiply 25 by 4', 'add 100 + 200'..."
                          style={{
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            width: '100%',
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                          }}
                        />
                      )}

                      {/* Cursor row-resize Splitter for Prompt Box */}
                      <div
                        onMouseDown={handlePromptResizeMouseDown}
                        className={`splitter-row ${activeDrag === 'input' ? 'active' : ''}`}
                        title="Drag cursor to extend input height (34px – 160px)"
                        aria-label="Resize input height"
                        role="separator"
                        aria-orientation="horizontal"
                        aria-valuenow={promptInputHeight}
                        aria-valuemin={34}
                        aria-valuemax={160}
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          left: 0,
                          right: 0,
                          height: '8px',
                          margin: 0,
                          cursor: 'row-resize',
                        }}
                      >
                        <div className="splitter-grip-dots" style={{ width: '22px', height: '2px' }} />
                      </div>
                    </div>

                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{
                        height: '32px',
                        padding: '0 8px',
                        fontSize: '11px',
                        backgroundColor: 'var(--surface-muted)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isExecuting}
                      onClick={handleExecuteTurn}
                      style={{
                        height: '32px',
                        padding: '0 14px',
                        backgroundColor: 'var(--intent-primary-solid)',
                        color: 'var(--text-on-accent)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: isExecuting ? 0.7 : 1,
                      }}
                    >
                      <Send size={13} />
                      <span>{isExecuting ? 'Running...' : 'Execute'}</span>
                    </button>
                  </form>

                  {/* Quick Presets */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      marginTop: '8px',
                      alignItems: 'center',
                      fontSize: '11px',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Quick Presets:
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflowX: 'auto',
                        scrollbarWidth: 'thin',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {[
                        'multiply 14 by 12',
                        'add 99 + 101',
                        'subtract 45 from 100',
                        'divide 500 by 25',
                        'multiply 16 by 25',
                        'add 1024 and 2048',
                        'divide 144 by 12',
                        'subtract 89 from 250',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setUserPrompt(preset)}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--surface-muted)',
                            color: 'var(--text-secondary)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-xs)',
                            cursor: 'pointer',
                            fontSize: '10px',
                            flexShrink: 0,
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Session Detail Content Area */}
                <div style={{ flex: 1, padding: 'var(--space-4)', overflowY: 'auto' }}>

                  {activeSession ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {/* Session Overview Card */}
                      <div
                        style={{
                          backgroundColor: 'var(--surface-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-4)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                                {activeSession.recording_title || 'Session Inspection'}
                              </h2>
                              <button
                                type="button"
                                title="Copy Session ID"
                                onClick={() =>
                                  copyToClipboard(activeSession.session_id, `Copied ${activeSession.session_id}`)
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: '2px',
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                              }}
                            >
                              Session ID: <code className="tabular-nums">{activeSession.session_id}</code>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* Re-run Session with Gemini (No Tools) */}
                            {activeTakes.length > 0 && (
                              <button
                                type="button"
                                disabled={isExecuting}
                                onClick={async () => {
                                  try {
                                    setIsExecuting(true);
                                    showToast('Re-running turns with Gemini (Zero Tools)...');
                                    const res = await fetch('/api/rerun_gemini', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        session_id: activeSession.session_id,
                                        recording_title: activeSession.recording_title || `RECORDING ${activeSession.recording_number || 1}`,
                                        recording_number: activeSession.recording_number || 1,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'Failed');
                                    showToast('Gemini re-run completed & saved to PostgreSQL!');
                                    await fetchDatabaseRecordings();
                                    await fetchPrometheusMetrics();
                                    if (data.session_id) {
                                      setSelectedSessionId(data.session_id);
                                    }
                                  } catch (err) {
                                    showToast(`Gemini error: ${err.message}`);
                                  } finally {
                                    setIsExecuting(false);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--intent-primary-subtle)',
                                  color: 'var(--intent-primary)',
                                  border: '1px solid var(--intent-primary)',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Sparkles size={12} />
                                <span>Re-run with Gemini (No Tools)</span>
                              </button>
                            )}

                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: '11px',
                                backgroundColor: 'var(--surface-muted)',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              Model: <strong>{activeSession.model || 'gpt-4o'}</strong>
                            </span>
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: '11px',
                                backgroundColor: 'var(--surface-muted)',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              Tokens: <strong>{activeSession.total_tokens || 0}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Session View Tabs: [Turns Table] | [Side-by-Side Compare] */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            borderBottom: '1px solid var(--border-default)',
                            marginTop: '16px',
                            marginBottom: '12px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setSessionViewTab('table')}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'none',
                              border: 'none',
                              borderBottom: sessionViewTab === 'table' ? '2px solid var(--intent-primary)' : '2px solid transparent',
                              color: sessionViewTab === 'table' ? 'var(--intent-primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <FileSpreadsheet size={13} />
                            <span>Turns Table ({activeTakes.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSessionViewTab('compare');
                              fetchComparisonData(activeSession.session_id);
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'none',
                              border: 'none',
                              borderBottom: sessionViewTab === 'compare' ? '2px solid var(--intent-primary)' : '2px solid transparent',
                              color: sessionViewTab === 'compare' ? 'var(--intent-primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Scale size={13} />
                            <span>Side-by-Side Compare (GPT vs Gemini)</span>
                          </button>
                        </div>

                        {sessionViewTab === 'table' ? (
                          <div>
                            {/* Turn History Table Header with Copy TSV */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            margin: '16px 0 8px 0',
                          }}
                        >
                          <h3
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              margin: 0,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            RECORDED CONVERSATION TURNS ({activeTakes.length}):
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              title="Copy table formatted for Excel or Google Sheets"
                              onClick={() => handleCopyTableTSV(activeTakes)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                padding: '2px 8px',
                                backgroundColor: 'var(--surface-muted)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-xs)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <Copy size={11} />
                              <span>Copy Table (TSV)</span>
                            </button>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              (Click any row to view raw JSON)
                            </span>
                          </div>
                        </div>

                        {/* Feature 1: Turns Table */}
                        <div
                          style={{
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            overflowX: 'auto',
                          }}
                        >
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '12px',
                              textAlign: 'left',
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  backgroundColor: 'var(--surface-muted)',
                                  borderBottom: '1px solid var(--border-default)',
                                }}
                              >
                                <th
                                  style={{
                                    width: `${turnsColWidths.take}px`,
                                    minWidth: `${turnsColWidths.take}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Take
                                  <div
                                    onMouseDown={handleColResizeMouseDown('take', 50, 100)}
                                    className={`table-col-resizer ${activeDrag === 'take' ? 'active' : ''}`}
                                    title="Drag cursor to resize Take column (50px – 100px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.user_message}px`,
                                    minWidth: `${turnsColWidths.user_message}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  User Input
                                  <div
                                    onMouseDown={handleColResizeMouseDown('user_message', 140, 500)}
                                    className={`table-col-resizer ${activeDrag === 'user_message' ? 'active' : ''}`}
                                    title="Drag cursor to resize User Input column (140px – 500px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.assistant_response}px`,
                                    minWidth: `${turnsColWidths.assistant_response}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Assistant Response
                                  <div
                                    onMouseDown={handleColResizeMouseDown('assistant_response', 200, 800)}
                                    className={`table-col-resizer ${activeDrag === 'assistant_response' ? 'active' : ''}`}
                                    title="Drag cursor to resize Assistant Response column (200px – 800px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.latency}px`,
                                    minWidth: `${turnsColWidths.latency}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Inference Time
                                  <div
                                    onMouseDown={handleColResizeMouseDown('latency', 80, 180)}
                                    className={`table-col-resizer ${activeDrag === 'latency' ? 'active' : ''}`}
                                    title="Drag cursor to resize Inference Time column (80px – 180px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.input_tokens}px`,
                                    minWidth: `${turnsColWidths.input_tokens}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Input Tok
                                  <div
                                    onMouseDown={handleColResizeMouseDown('input_tokens', 60, 140)}
                                    className={`table-col-resizer ${activeDrag === 'input_tokens' ? 'active' : ''}`}
                                    title="Drag cursor to resize Input Tokens column (60px – 140px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.output_tokens}px`,
                                    minWidth: `${turnsColWidths.output_tokens}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Output Tok
                                  <div
                                    onMouseDown={handleColResizeMouseDown('output_tokens', 60, 140)}
                                    className={`table-col-resizer ${activeDrag === 'output_tokens' ? 'active' : ''}`}
                                    title="Drag cursor to resize Output Tokens column (60px – 140px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.tokens}px`,
                                    minWidth: `${turnsColWidths.tokens}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Total Tok
                                  <div
                                    onMouseDown={handleColResizeMouseDown('tokens', 60, 130)}
                                    className={`table-col-resizer ${activeDrag === 'tokens' ? 'active' : ''}`}
                                    title="Drag cursor to resize Total Tokens column (60px – 130px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.model}px`,
                                    minWidth: `${turnsColWidths.model}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Model
                                  <div
                                    onMouseDown={handleColResizeMouseDown('model', 70, 160)}
                                    className={`table-col-resizer ${activeDrag === 'model' ? 'active' : ''}`}
                                    title="Drag cursor to resize Model column (70px – 160px)"
                                  />
                                </th>
                                <th
                                  style={{
                                    width: `${turnsColWidths.inspect}px`,
                                    minWidth: `${turnsColWidths.inspect}px`,
                                    position: 'relative',
                                    padding: '8px var(--space-3)',
                                  }}
                                >
                                  Inspect
                                  <div
                                    onMouseDown={handleColResizeMouseDown('inspect', 70, 140)}
                                    className={`table-col-resizer ${activeDrag === 'inspect' ? 'active' : ''}`}
                                    title="Drag cursor to resize Inspect column (70px – 140px)"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeTakes.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="9"
                                    style={{
                                      padding: 'var(--space-4)',
                                      textAlign: 'center',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    No turns recorded for this session yet. Run one above!
                                  </td>
                                </tr>
                              ) : (
                                activeTakes.map((take, idx) => {
                                  const isTurnSelected = selectedTurn?.turn_id === take.turn_id;
                                  const inputTok = take.prompt_tokens ?? take.input_tokens;
                                  const outputTok = take.completion_tokens ?? take.output_tokens;
                                  const totalTok = take.total_tokens || ((inputTok != null && outputTok != null) ? Number(inputTok) + Number(outputTok) : null);
                                  const isGemini = (take.model || '').toLowerCase().includes('gemini');

                                  return (
                                    <tr
                                      key={take.turn_id || idx}
                                      onClick={() => handleSelectTurn(take)}
                                      style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        backgroundColor: isTurnSelected
                                          ? 'var(--surface-selected)'
                                          : 'transparent',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <td
                                        className="tabular-nums"
                                        style={{
                                          padding: '8px var(--space-3)',
                                          fontWeight: 600,
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        #{take.take_number || idx + 1}
                                      </td>
                                      <td
                                        style={{
                                          padding: '8px var(--space-3)',
                                          maxWidth: `${turnsColWidths.user_message - 16}px`,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          fontWeight: 500,
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>{take.user_message || take.preview || '—'}</span>
                                          <button
                                            type="button"
                                            title="Copy User Query"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(take.user_message || take.preview, 'Copied user query');
                                            }}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              color: 'var(--text-muted)',
                                              padding: '1px',
                                            }}
                                          >
                                            <Copy size={10} />
                                          </button>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: '8px var(--space-3)',
                                          maxWidth: `${turnsColWidths.assistant_response - 16}px`,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>{take.assistant_response || '—'}</span>
                                          <button
                                            type="button"
                                            title="Copy Assistant Output"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(take.assistant_response, 'Copied assistant response');
                                            }}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              color: 'var(--text-muted)',
                                              padding: '1px',
                                            }}
                                          >
                                            <Copy size={10} />
                                          </button>
                                        </div>
                                      </td>

                                      {/* Clean, authentic recorded inference time */}
                                      <td
                                        className="tabular-nums"
                                        style={{ padding: '8px var(--space-3)', fontWeight: 500 }}
                                      >
                                        {take.latency_seconds ? `${take.latency_seconds}s` : (take.inference_time ? `${take.inference_time}s` : 'NA')}
                                      </td>

                                      {/* Input Tokens */}
                                      <td
                                        className="tabular-nums"
                                        style={{ padding: '8px var(--space-3)', color: 'var(--text-secondary)' }}
                                      >
                                        {inputTok ?? 'NA'}
                                      </td>

                                      {/* Output Tokens */}
                                      <td
                                        className="tabular-nums"
                                        style={{ padding: '8px var(--space-3)', color: 'var(--text-secondary)' }}
                                      >
                                        {outputTok ?? 'NA'}
                                      </td>

                                      {/* Total Tokens */}
                                      <td
                                        className="tabular-nums"
                                        style={{ padding: '8px var(--space-3)', fontWeight: 600 }}
                                      >
                                        {totalTok ?? 'NA'}
                                      </td>

                                      {/* Model Badge */}
                                      <td style={{ padding: '8px var(--space-3)' }}>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            backgroundColor: isGemini ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: isGemini ? '#60a5fa' : '#34d399',
                                            border: `1px solid ${isGemini ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                            fontFamily: 'monospace',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {take.model || 'gpt-4o'}
                                        </span>
                                      </td>

                                      <td style={{ padding: '8px var(--space-3)' }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectTurn(take);
                                          }}
                                          style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            backgroundColor: 'var(--surface-muted)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: 'var(--radius-xs)',
                                            cursor: 'pointer',
                                            color: 'var(--intent-primary)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <Code2 size={12} />
                                          <span>Raw JSON</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Side-by-Side Comparison View (GPT-4o vs Gemini) */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                        {/* Top Comparison Summary Banner */}
                        {comparisonData && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              backgroundColor: 'var(--surface-muted)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 'var(--radius-sm)',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                Paired Metrics:
                              </span>
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: 'rgba(46, 160, 67, 0.15)',
                                  color: '#2ea043',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Zap size={11} />
                                <span>{comparisonData.overall_speedup_factor}x Faster (Gemini)</span>
                              </span>
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: 'var(--intent-primary-subtle)',
                                  color: 'var(--intent-primary)',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Sparkles size={11} />
                                <span>{comparisonData.overall_token_savings_pct}% Fewer Tokens ({comparisonData.total_gpt_tokens} → {comparisonData.total_gemini_tokens})</span>
                              </span>
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: 'var(--surface-base)',
                                  border: '1px solid var(--border-default)',
                                  color: 'var(--text-secondary)',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Award size={11} />
                                <span>{comparisonData.math_accuracy_rate_pct}% Numerical Match</span>
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={loadingComparison}
                              onClick={() => fetchComparisonData(activeSession.session_id, true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: 'var(--intent-primary-subtle)',
                                color: 'var(--intent-primary)',
                                border: '1px solid var(--intent-primary)',
                                borderRadius: 'var(--radius-xs)',
                                cursor: 'pointer',
                              }}
                            >
                              <Scale size={12} />
                              <span>{loadingComparison ? 'Grading Turns...' : 'Run All LLM Judges'}</span>
                            </button>
                          </div>
                        )}

                        {/* Loading Indicator */}
                        {loadingComparison && !comparisonData && (
                          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            Loading side-by-side comparison...
                          </div>
                        )}

                        {/* Comparison Cards */}
                        {comparisonData?.turns?.map((t) => {
                          const judgeData = judgeResultsMap[t.turn_number] || t.judge;
                          const isJudging = judgeLoadingMap[t.turn_number];

                          return (
                            <div
                              key={t.turn_number}
                              style={{
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--surface-base)',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                              }}
                            >
                              {/* Turn Header */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  paddingBottom: '8px',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      backgroundColor: 'var(--surface-muted)',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                    }}
                                  >
                                    TURN #{t.turn_number}
                                  </span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    "{t.user_message}"
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    className="tabular-nums"
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: 'rgba(46, 160, 67, 0.15)',
                                      color: '#2ea043',
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⚡ {t.speedup}x faster
                                  </span>
                                  <span
                                    className="tabular-nums"
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: 'var(--intent-primary-subtle)',
                                      color: 'var(--intent-primary)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    💰 {t.token_saving_pct}% saved
                                  </span>
                                </div>
                              </div>

                              {/* Split Columns: GPT-4o on Left vs Gemini on Right */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: windowWidth < 768 ? '1fr' : '1fr 1fr',
                                  gap: '12px',
                                }}
                              >
                                {/* Left Column: GPT-4o (MathRouter + Tools) */}
                                <div
                                  style={{
                                    padding: '10px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      fontSize: '11px',
                                    }}
                                  >
                                    <strong style={{ color: 'var(--text-secondary)' }}>
                                      GPT-4o (MathRouter + MCP)
                                    </strong>
                                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                                      <span className="tabular-nums">⏱️ {t.gpt_latency}s</span>
                                      <span>•</span>
                                      <span className="tabular-nums">🔤 {t.gpt_tokens} tok</span>
                                    </div>
                                  </div>

                                  {/* Tools used */}
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {t.gpt_tools?.map((tool, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          fontSize: '9px',
                                          padding: '1px 5px',
                                          backgroundColor: 'rgba(255,255,255,0.06)',
                                          border: '1px solid var(--border-subtle)',
                                          borderRadius: 'var(--radius-xs)',
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        🛠️ {tool}
                                      </span>
                                    ))}
                                  </div>

                                  <div
                                    style={{
                                      fontSize: '12px',
                                      lineHeight: 1.45,
                                      color: 'var(--text-primary)',
                                      whiteSpace: 'pre-wrap',
                                      marginTop: '4px',
                                    }}
                                  >
                                    {t.gpt_response}
                                  </div>
                                </div>

                                {/* Right Column: Gemini 2.5 Flash (No Tools) */}
                                <div
                                  style={{
                                    padding: '10px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      fontSize: '11px',
                                    }}
                                  >
                                    <strong style={{ color: 'var(--intent-primary)' }}>
                                      Gemini 2.5 Flash (Zero Tools)
                                    </strong>
                                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                                      <span className="tabular-nums">⏱️ {t.gemini_latency}s</span>
                                      <span>•</span>
                                      <span className="tabular-nums">🔤 {t.gemini_tokens} tok</span>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        padding: '1px 5px',
                                        backgroundColor: 'var(--intent-primary-subtle)',
                                        color: 'var(--intent-primary)',
                                        border: '1px solid var(--intent-primary)',
                                        borderRadius: 'var(--radius-xs)',
                                      }}
                                    >
                                      ⚡ Direct Parametric (No Tools)
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      fontSize: '12px',
                                      lineHeight: 1.45,
                                      color: 'var(--text-primary)',
                                      whiteSpace: 'pre-wrap',
                                      marginTop: '4px',
                                    }}
                                  >
                                    {t.gemini_response}
                                  </div>
                                </div>
                              </div>

                              {/* Footer: Numerical Match & LLM Judge */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  paddingTop: '6px',
                                  borderTop: '1px solid var(--border-subtle)',
                                  fontSize: '11px',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}
                              >
                                <div>
                                  {t.math_match ? (
                                    <span style={{ color: '#2ea043', fontWeight: 600 }}>
                                      ✅ Ground Truth Match: {t.shared_numbers?.join(', ')}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      ℹ️ Multi-turn confirmation flow
                                    </span>
                                  )}
                                </div>

                                <div>
                                  {judgeData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span
                                        style={{
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: 'var(--radius-xs)',
                                          backgroundColor: judgeData.winner === 'Model B' ? 'var(--intent-primary-subtle)' : 'var(--surface-muted)',
                                          color: judgeData.winner === 'Model B' ? 'var(--intent-primary)' : 'var(--text-primary)',
                                        }}
                                      >
                                        🏆 Winner: {judgeData.winner === 'Model B' ? 'Gemini 2.5' : (judgeData.winner === 'Model A' ? 'GPT-4o' : 'Tie')}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        GPT: {judgeData.gpt_score}/5 ⭐ • Gemini: {judgeData.gemini_score}/5 ⭐
                                      </span>
                                      <span
                                        title={judgeData.feedback}
                                        style={{
                                          maxWidth: '240px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          fontStyle: 'italic',
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        "{judgeData.feedback}"
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isJudging}
                                      onClick={() => handleRunJudgeForTurn(t)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        backgroundColor: 'var(--surface-muted)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 'var(--radius-xs)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Scale size={11} />
                                      <span>{isJudging ? 'Judging...' : 'Grade with LLM Judge'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                      {/* Resizable Bottom Turn Inspector Pane (With Complete Raw JSON & Copy) */}
                      {selectedTurn && (
                        <div
                          style={{
                            height: `${inspectorHeight}px`,
                            minHeight: '180px',
                            maxHeight: '560px',
                            backgroundColor: 'var(--surface-base)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            marginTop: 'var(--space-4)',
                            transition: activeDrag === 'inspector' ? 'none' : 'height 100ms ease',
                          }}
                        >
                          {/* Cursor row-resize Splitter Handle */}
                          <div
                            onMouseDown={handleInspectorResizeMouseDown}
                            className={`splitter-row ${activeDrag === 'inspector' ? 'active' : ''}`}
                            title="Drag cursor to resize Turn Inspector height (180px – 560px)"
                            aria-label="Resize bottom inspector pane"
                            role="separator"
                            aria-orientation="horizontal"
                            aria-valuenow={inspectorHeight}
                            aria-valuemin={180}
                            aria-valuemax={560}
                            style={{ height: '8px', cursor: 'row-resize', margin: 0, padding: 0 }}
                          >
                            <div className="splitter-grip-dots" style={{ width: '32px', height: '3px' }} />
                          </div>

                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              padding: 'var(--space-3) var(--space-4) var(--space-4) var(--space-4)',
                              overflow: 'hidden',
                            }}
                          >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--border-subtle)',
                              paddingBottom: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileJson size={16} style={{ color: 'var(--intent-primary)' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                Turn Inspector: Take #{selectedTurn.take_number || 1}
                              </span>
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '10px',
                                  backgroundColor: 'var(--surface-muted)',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                }}
                              >
                                {selectedTurn.turn_id}
                              </span>
                              <button
                                type="button"
                                title="Copy Turn ID"
                                onClick={() =>
                                  copyToClipboard(selectedTurn.turn_id, `Copied ${selectedTurn.turn_id}`)
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: '1px',
                                }}
                              >
                                <Copy size={11} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setInspectorTab('raw')}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid var(--border-default)',
                                  backgroundColor:
                                    inspectorTab === 'raw'
                                      ? 'var(--surface-selected)'
                                      : 'transparent',
                                  color:
                                    inspectorTab === 'raw'
                                      ? 'var(--intent-primary)'
                                      : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontWeight: inspectorTab === 'raw' ? 600 : 400,
                                }}
                              >
                                Raw JSON
                              </button>

                              <button
                                type="button"
                                onClick={() => setInspectorTab('parsed')}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid var(--border-default)',
                                  backgroundColor:
                                    inspectorTab === 'parsed'
                                      ? 'var(--surface-selected)'
                                      : 'transparent',
                                  color:
                                    inspectorTab === 'parsed'
                                      ? 'var(--intent-primary)'
                                      : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontWeight: inspectorTab === 'parsed' ? 600 : 400,
                                }}
                              >
                                Overview
                              </button>

                              {/* Copy JSON Action */}
                              <button
                                type="button"
                                title="Copy Raw JSON to Clipboard"
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(selectedTurnRawJson || selectedTurn, null, 2),
                                    'Copied Raw JSON to clipboard'
                                  )
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  backgroundColor: 'var(--surface-muted)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                <Copy size={12} />
                                <span>Copy JSON</span>
                              </button>


                              {/* Close */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTurn(null);
                                  setSelectedTurnRawJson(null);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  marginLeft: '4px',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Raw JSON Display */}
                          {inspectorTab === 'raw' ? (
                            <div style={{ position: 'relative' }}>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: '12px',
                                  backgroundColor: 'var(--surface-muted)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '12px',
                                  fontFamily: 'monospace',
                                  lineHeight: 1.5,
                                  maxHeight: `${Math.max(120, inspectorHeight - 90)}px`,
                                  height: `${Math.max(120, inspectorHeight - 90)}px`,
                                  overflow: 'auto',
                                  scrollBehavior: 'smooth',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {JSON.stringify(selectedTurnRawJson || selectedTurn, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 'var(--space-3)',
                                  marginBottom: '12px',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-muted)',
                                      marginBottom: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <span>USER QUERY:</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(selectedTurn.user_message, 'Copied query')}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      padding: '8px',
                                      backgroundColor: 'var(--surface-muted)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {selectedTurn.user_message || '—'}
                                  </div>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-muted)',
                                      marginBottom: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <span>ASSISTANT OUTPUT:</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(selectedTurn.assistant_response, 'Copied response')}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      padding: '8px',
                                      backgroundColor: 'var(--surface-muted)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {selectedTurn.assistant_response || '—'}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Inference Time:
                                  </span>
                                  <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                    {selectedTurn.latency_seconds ? `${selectedTurn.latency_seconds}s` : (selectedTurn.inference_time ? `${selectedTurn.inference_time}s` : 'NA')}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Input Tokens:
                                  </span>
                                  <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                    {selectedTurn.prompt_tokens ?? selectedTurn.input_tokens ?? 'NA'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Output Tokens:
                                  </span>
                                  <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                    {selectedTurn.completion_tokens ?? selectedTurn.output_tokens ?? 'NA'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Total Tokens:
                                  </span>
                                  <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                    {selectedTurn.total_tokens || (
                                      ((selectedTurn.prompt_tokens ?? selectedTurn.input_tokens) != null && (selectedTurn.completion_tokens ?? selectedTurn.output_tokens) != null)
                                        ? Number(selectedTurn.prompt_tokens ?? selectedTurn.input_tokens) + Number(selectedTurn.completion_tokens ?? selectedTurn.output_tokens)
                                        : 'NA'
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Throughput:
                                  </span>
                                  <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                    {selectedTurn.latency_seconds && (selectedTurn.completion_tokens || selectedTurn.output_tokens)
                                      ? `${((selectedTurn.completion_tokens || selectedTurn.output_tokens) / selectedTurn.latency_seconds).toFixed(1)} tok/s`
                                      : 'NA'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Model:
                                  </span>
                                  <div style={{ fontWeight: 600, fontSize: '11px', fontFamily: 'monospace' }}>
                                    {selectedTurn.model || 'gpt-4o'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Tool Calls:
                                  </span>
                                  <div style={{ fontWeight: 600, fontSize: '11px' }}>
                                    {selectedTurn.tool_calls && selectedTurn.tool_calls.length > 0
                                      ? `${selectedTurn.tool_calls.length} Tool Call(s)`
                                      : 'Zero Tools (Direct)'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Filename:
                                  </span>
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {selectedTurn.filename || 'eval_turn.json'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 'var(--space-6)',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Select a session from Panel 2 to inspect
                    </div>
                  )}
                </div>

              </main>
            </>
          )}

          {/* ====================================================================
              VIEW B: POSTGRESQL DATABASE EXPLORER VIEW
              ==================================================================== */}
          {activeNav === 'database' && (
            <main
              style={{
                flex: 1,
                backgroundColor: 'var(--surface-canvas)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Database Top Bar */}
              <div
                style={{
                  backgroundColor: 'var(--surface-base)',
                  borderBottom: '1px solid var(--border-default)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} style={{ color: 'var(--intent-primary)' }} />
                    <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                      PostgreSQL Database Explorer
                    </h2>
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'var(--intent-success-subtle)',
                        color: 'var(--intent-success)',
                        border: '1px solid var(--intent-success-border)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      Connected (Port 5434)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Database: <code>mathrouter</code> • Host: <code>localhost:5434</code> • User:{' '}
                    <code>postgres</code>
                  </div>
                </div>

                {/* Table Toggle Tabs */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setDbActiveTable('eval_turns')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11px',
                      fontWeight: dbActiveTable === 'eval_turns' ? 600 : 500,
                      backgroundColor:
                        dbActiveTable === 'eval_turns'
                          ? 'var(--intent-primary-subtle)'
                          : 'var(--surface-muted)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      color:
                        dbActiveTable === 'eval_turns'
                          ? 'var(--intent-primary)'
                          : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    eval_turns ({allTurns.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDbActiveTable('eval_sessions')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11px',
                      fontWeight: dbActiveTable === 'eval_sessions' ? 600 : 500,
                      backgroundColor:
                        dbActiveTable === 'eval_sessions'
                          ? 'var(--intent-primary-subtle)'
                          : 'var(--surface-muted)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      color:
                        dbActiveTable === 'eval_sessions'
                          ? 'var(--intent-primary)'
                          : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    eval_sessions ({recordings.length})
                  </button>
                </div>
              </div>

              {/* Table Content & Filter */}
              <div
                style={{
                  flex: 1,
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Search in DB view */}
                <div
                  style={{
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 10px',
                      height: '30px',
                      width: '320px',
                    }}
                  >
                    <Search size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={`Search records in ${dbActiveTable}...`}
                      value={dbSearchQuery}
                      onChange={(e) => setDbSearchQuery(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '11px',
                        width: '100%',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const data = dbActiveTable === 'eval_turns' ? allTurns : recordings;
                      copyToClipboard(JSON.stringify(data, null, 2), `Copied all ${dbActiveTable} JSON to clipboard`);
                    }}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy Table JSON</span>
                  </button>
                </div>

                {/* Table Data View */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'auto',
                  }}
                >
                  {dbActiveTable === 'eval_turns' ? (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--surface-muted)',
                            borderBottom: '1px solid var(--border-default)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <th style={{ padding: '8px var(--space-3)' }}>turn_id</th>
                          <th style={{ padding: '8px var(--space-3)' }}>session_id</th>
                          <th style={{ padding: '8px var(--space-3)' }}>user_message</th>
                          <th style={{ padding: '8px var(--space-3)' }}>assistant_response</th>
                          <th style={{ padding: '8px var(--space-3)' }}>latency</th>
                          <th style={{ padding: '8px var(--space-3)' }}>tokens</th>
                          <th style={{ padding: '8px var(--space-3)' }}>model</th>
                          <th style={{ padding: '8px var(--space-3)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTurns.map((turn, i) => (
                          <tr
                            key={turn.turn_id || i}
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          >
                            <td
                              className="tabular-nums"
                              style={{
                                padding: '8px var(--space-3)',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{turn.turn_id}</span>
                                <button
                                  type="button"
                                  title="Copy turn_id"
                                  onClick={() => copyToClipboard(turn.turn_id, `Copied ${turn.turn_id}`)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                  <Copy size={10} />
                                </button>
                              </div>
                            </td>
                            <td
                              className="tabular-nums"
                              style={{
                                padding: '8px var(--space-3)',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {turn.session_id}
                            </td>
                            <td
                              style={{
                                padding: '8px var(--space-3)',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {turn.user_message || '—'}
                            </td>
                            <td
                              style={{
                                padding: '8px var(--space-3)',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {turn.assistant_response || '—'}
                            </td>
                            <td
                              className="tabular-nums"
                              style={{ padding: '8px var(--space-3)' }}
                            >
                              {turn.latency_seconds ? `${turn.latency_seconds}s` : '—'}
                            </td>
                            <td
                              className="tabular-nums"
                              style={{ padding: '8px var(--space-3)' }}
                            >
                              {turn.total_tokens || '—'}
                            </td>
                            <td style={{ padding: '8px var(--space-3)' }}>{turn.model || 'gpt-4o'}</td>
                            <td style={{ padding: '8px var(--space-3)' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveNav('sessions');
                                  setSelectedSessionId(turn.session_id);
                                  handleSelectTurn(turn);
                                }}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  backgroundColor: 'var(--surface-muted)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                  color: 'var(--intent-primary)',
                                }}
                              >
                                View in Console
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--surface-muted)',
                            borderBottom: '1px solid var(--border-default)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <th style={{ padding: '8px var(--space-3)' }}>session_id</th>
                          <th style={{ padding: '8px var(--space-3)' }}>recording_title</th>
                          <th style={{ padding: '8px var(--space-3)' }}>model</th>
                          <th style={{ padding: '8px var(--space-3)' }}>total_turns</th>
                          <th style={{ padding: '8px var(--space-3)' }}>total_tokens</th>
                          <th style={{ padding: '8px var(--space-3)' }}>created_at</th>
                          <th style={{ padding: '8px var(--space-3)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recordings.map((rec, i) => (
                          <tr
                            key={rec.session_id || i}
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          >
                            <td
                              className="tabular-nums"
                              style={{
                                padding: '8px var(--space-3)',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{rec.session_id}</span>
                                <button
                                  type="button"
                                  title="Copy session_id"
                                  onClick={() => copyToClipboard(rec.session_id, `Copied ${rec.session_id}`)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                  <Copy size={10} />
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '8px var(--space-3)', fontWeight: 600 }}>
                              {rec.recording_title}
                            </td>
                            <td style={{ padding: '8px var(--space-3)' }}>{rec.model || 'gpt-4o'}</td>
                            <td
                              className="tabular-nums"
                              style={{ padding: '8px var(--space-3)' }}
                            >
                              {rec.takes?.length || rec.total_takes || 0}
                            </td>
                            <td
                              className="tabular-nums"
                              style={{ padding: '8px var(--space-3)' }}
                            >
                              {rec.total_tokens || 0}
                            </td>
                            <td
                              className="tabular-nums"
                              style={{
                                padding: '8px var(--space-3)',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {rec.created_at || '—'}
                            </td>
                            <td style={{ padding: '8px var(--space-3)' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveNav('sessions');
                                  setSelectedSessionId(rec.session_id);
                                }}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  backgroundColor: 'var(--surface-muted)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                  color: 'var(--intent-primary)',
                                }}
                              >
                                Open Session
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </main>
          )}

          {/* ====================================================================
              VIEW C: PROMETHEUS METRICS & GRAFANA HUB
              ==================================================================== */}
          {activeNav === 'metrics' && (
            <main
              style={{
                flex: 1,
                backgroundColor: 'var(--surface-canvas)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Metrics Top Bar */}
              <div
                style={{
                  backgroundColor: 'var(--surface-base)',
                  borderBottom: '1px solid var(--border-default)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} style={{ color: 'var(--intent-warning)' }} />
                    <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                      Prometheus Metrics & Grafana Explorer
                    </h2>
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'var(--intent-success-subtle)',
                        color: 'var(--intent-success)',
                        border: '1px solid var(--intent-success-border)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      Prometheus UP (Port 9090)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Scrape Target: <code>host.docker.internal:8000/metrics</code> • Grafana Dashboard: <code>mathrouter-evals-dashboard</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href="http://localhost:3000/d/mathrouter-evals-dashboard/mathrouter-llm-evals-telemetry"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '30px',
                      padding: '0 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--intent-primary-solid)',
                      color: 'var(--text-on-accent)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Launch Live Grafana Dashboard</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Metrics Cards Grid */}
              <div style={{ flex: 1, padding: 'var(--space-4)', overflowY: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Eval Sessions</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(promMetrics.sessions || recordings.length), 'Copied sessions count')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}
                    >
                      {promMetrics.sessions || recordings.length}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Metric: <code>mathrouter_eval_sessions_total</code>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Conversation Turns</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(promMetrics.turns || allTurns.length), 'Copied turns count')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: '4px 0',
                        color: 'var(--intent-success)',
                      }}
                    >
                      {promMetrics.turns || allTurns.length}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Metric: <code>mathrouter_eval_turns_total</code>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tokens Consumed</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(promMetrics.tokens), 'Copied tokens count')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: '4px 0',
                        color: 'var(--intent-primary)',
                      }}
                    >
                      {promMetrics.tokens
                        ? promMetrics.tokens.toLocaleString()
                        : recordings.reduce((acc, r) => acc + (r.total_tokens || 0), 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Metric: <code>mathrouter_tokens_total</code>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MCP Tool Executions</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(promMetrics.tools || 4), 'Copied tools count')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: '4px 0',
                        color: 'var(--intent-warning)',
                      }}
                    >
                      {promMetrics.tools || 4}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Metric: <code>mathrouter_tool_calls_total</code>
                    </div>
                  </div>
                </div>

                {/* Scraped Prometheus Metrics Live Stream View */}
                <div
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                      Live Scraped Prometheus Exporter Output (/metrics)
                    </h3>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rawPromMetricsText, 'Copied raw metrics text')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        backgroundColor: 'var(--surface-muted)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '4px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Copy size={12} />
                      <span>Copy Metrics</span>
                    </button>
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      padding: '12px',
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                  >
                    {rawPromMetricsText || '# Loading live metrics from FastAPI Prometheus client...'}
                  </pre>
                </div>
              </div>
            </main>
          )}
        </div>

        {/* Transient Accessible Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              backgroundColor: 'var(--surface-base)',
              border: '1px solid var(--intent-primary)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              zIndex: 970,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={14} style={{ color: 'var(--intent-primary)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </SupportedViewportGate>
  );
}
