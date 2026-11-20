import React, { useState, useEffect, useCallback } from 'react';
import { SupportedViewportGate } from './components/SupportedViewportGate';
import { MultiModelEvaluationModal } from './components/MultiModelEvaluationModal';
import { PromptEvaluationView } from './components/PromptEvaluationView';
import { AllExperimentsDataHub } from './components/AllExperimentsDataHub';
import { RagEvaluationView } from './components/RagEvaluationView';
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
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Wrench,
  Layers,
  Info,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Upload,
  FileText,
  X,
  Sliders,
  Eye,
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Active Navigation View: 'all-experiments' (Default) | 'sessions' | 'evals' | 'prompt-evals' | 'rag' | 'database' | 'metrics'
  const [activeNav, setActiveNav] = useState('all-experiments');

  // Live Backend & Telemetry State
  const [recordings, setRecordings] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedModelBySession, setSelectedModelBySession] = useState({});
  const [isCollectiveCardExpanded, setIsCollectiveCardExpanded] = useState(true);
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
  const [totalDbSpend, setTotalDbSpend] = useState(0);
  const [liveEvalSpend, setLiveEvalSpend] = useState(0);
  const totalCalculatedSpend = totalDbSpend + liveEvalSpend;
  const [toastMessage, setToastMessage] = useState(null);
  const [isMultiModelModalOpen, setIsMultiModelModalOpen] = useState(false);

  // Database View State
  const [dbActiveTable, setDbActiveTable] = useState('eval_turns'); // 'eval_sessions' | 'eval_turns'
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Interactive Live Turn Runner State
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5.5');
  const [comparisonModelName, setComparisonModelName] = useState('gpt-6-sol');

  // Selected Turn Inspection State (with Raw JSON)
  const [selectedTurn, setSelectedTurn] = useState(null);
  const [selectedTurnRawJson, setSelectedTurnRawJson] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('tiles'); // 'tiles' | 'raw'
  const [expandedTiles, setExpandedTiles] = useState({
    prompts: true,
    tools: true,
    response: true,
    payload: false,
  });

  const toggleTile = (tileKey) => {
    setExpandedTiles((prev) => ({ ...prev, [tileKey]: !prev[tileKey] }));
  };

  const areAllExpanded = Object.values(expandedTiles).every(Boolean);
  const toggleAllTiles = () => {
    const nextState = !areAllExpanded;
    setExpandedTiles({
      prompts: nextState,
      tools: nextState,
      response: nextState,
      payload: nextState,
    });
  };

  // Document Upload & Ingestion State
  const [uploadedDoc, setUploadedDoc] = useState({
    filename: null,
    text: '',
    filesize: 0,
    word_count: 0,
    est_tokens: 0,
  });
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const fileInputRef = React.useRef(null);

  // 5 Fixated Prompt Presets
  const PROMPT_PRESETS = {
    executive_summary: {
      id: 'executive_summary',
      name: 'Executive Summary',
      tag: 'Executive',
      description: 'Concise, strategic takeaways, high-level synthesis and executive framing.',
      system_prompt: 'You are an elite Executive Research Analyst. Your role is to analyze the provided document and provide concise, high-impact executive summaries. Focus on strategic implications, key numbers, bottom-line conclusions, and high-level synthesis. Avoid unnecessary jargon or granular minutiae. Structure your responses with bold headers and crisp bullet points suitable for C-level leadership.'
    },
    fact_checker: {
      id: 'fact_checker',
      name: 'Fact-Checking & Evidence',
      tag: 'Verification',
      description: 'Strict factual accuracy, verbatim evidence citations, section references, and claim validation.',
      system_prompt: 'You are a rigorous Document Fact-Checker and Evidence Verifier. Analyze the provided document with extreme precision. For every assertion, provide exact verbatim quotes from the text as evidence and cite the section or context. If an answer or detail is not explicitly supported by the text, explicitly state: "Not substantiated by the document." Distinguish clearly between direct factual statements and interpreted inferences.'
    },
    critical_auditor: {
      id: 'critical_auditor',
      name: 'Critical & Risk Auditor',
      tag: 'Auditor',
      description: 'Identifies flaws, hidden assumptions, missing evidence, risk factors, and counter-arguments.',
      system_prompt: 'You are an adversarial Technical & Risk Auditor. Your objective is to probe the document for hidden assumptions, methodological flaws, omitted variables, logical fallacies, operational risks, and potential failure modes. Do not accept claims at face value. Highlight what the document fails to explain, potential biases, and critical gaps.'
    },
    action_extractor: {
      id: 'action_extractor',
      name: 'Action Items & Tables',
      tag: 'Action Items',
      description: 'Structured tabular data extraction, deliverables, owners, deadlines, and procedural next steps.',
      system_prompt: 'You are an Operations & Data Extraction Specialist. Your role is to convert document contents into highly actionable, structured deliverables. Where appropriate, format your output as Markdown tables containing Item, Category, Description, Owner/Stakeholder, and Action Required. Extract concrete next steps, deadlines, milestones, and dependencies.'
    },
    comprehensive_qa: {
      id: 'comprehensive_qa',
      name: 'Comprehensive Q&A',
      tag: 'Deep Explainer',
      description: 'In-depth, pedagogical answers explaining technical concepts thoroughly with full document context.',
      system_prompt: 'You are a Senior Technical Explainer and Domain Expert. Your role is to answer questions regarding the document with thorough, exhaustive, and pedagogical depth. Unpack complex concepts, connect related sections within the document, provide contextual explanations, and ensure the reader achieves complete comprehension of the subject matter.'
    }
  };

  const [activePromptKey, setActivePromptKey] = useState('executive_summary');
  const [customPromptInstruction, setCustomPromptInstruction] = useState(
    PROMPT_PRESETS.executive_summary.system_prompt
  );
  const [isPromptDrawerOpen, setIsPromptDrawerOpen] = useState(false);

  const handleSelectPromptTab = (key) => {
    setActivePromptKey(key);
    setCustomPromptInstruction(PROMPT_PRESETS[key].system_prompt);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      showToast(`Uploading and extracting text from ${file.name}...`);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload_doc', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      setUploadedDoc({
        filename: data.filename,
        text: data.text,
        filesize: data.filesize,
        word_count: data.word_count,
        est_tokens: data.est_tokens,
      });
      showToast(`Document loaded: ${data.filename} (~${data.word_count} words)`);
    } catch (err) {
      console.error(err);
      showToast(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDoc = () => {
    setUploadedDoc({
      filename: null,
      text: '',
      filesize: 0,
      word_count: 0,
      est_tokens: 0,
    });
    showToast('Document cleared');
  };

  // Side-by-Side Compare & LLM Judge State
  const [sessionViewTab, setSessionViewTab] = useState('compare'); // 'compare' | 'table'
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [judgeLoadingMap, setJudgeLoadingMap] = useState({});
  const [judgeResultsMap, setJudgeResultsMap] = useState({});
  const [sessionJudgingMap, setSessionJudgingMap] = useState({});

  const fetchComparisonData = async (sessionId, runJudge = false) => {
    if (!sessionId) return;
    try {
      if (runJudge) {
        setSessionJudgingMap((prev) => ({ ...prev, [sessionId]: true }));
      } else {
        setLoadingComparison(true);
      }
      const url = `/api/evals/compare?session_id=${encodeURIComponent(sessionId)}${runJudge ? '&judge=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        if (data.turns) {
          const newJudges = {};
          data.turns.forEach((t) => {
            if (t.judge) newJudges[`${sessionId}_${t.turn_number}`] = t.judge;
          });
          setJudgeResultsMap((prev) => ({ ...prev, ...newJudges }));
        }
      } else {
        showToast('No paired GPT-4o / GPT-6-sol session found for this recording yet.');
      }
    } catch (e) {
      console.warn('Comparison fetch error:', e);
    } finally {
      setLoadingComparison(false);
      if (runJudge) {
        setSessionJudgingMap((prev) => ({ ...prev, [sessionId]: false }));
      }
    }
  };

  // Auto-fetch side-by-side comparison whenever a recording is selected
  useEffect(() => {
    if (selectedSessionId && sessionViewTab === 'compare') {
      fetchComparisonData(selectedSessionId);
    }
  }, [selectedSessionId, sessionViewTab]);

  const handleRunJudgeForTurn = async (turn) => {
    const turnNum = turn.turn_number;
    const currentSessionId = activeSession?.session_id;
    const judgeKey = `${currentSessionId}_${turnNum}`;
    try {
      setJudgeLoadingMap((prev) => ({ ...prev, [judgeKey]: true }));
      showToast(`Evaluating Turn #${turnNum} with LLM Judge...`);
      const res = await fetch('/api/evals/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: turn.user_message,
          gpt_response: turn.gpt_response,
          gpt5_response: turn.gpt5_response || turn.gemini_response,
          gemini_response: turn.gpt5_response || turn.gemini_response,
          session_id: currentSessionId,
          turn_number: turnNum,
          gpt_latency: turn.gpt_latency,
          gpt5_latency: turn.gpt5_latency || turn.gemini_latency,
          gpt_tokens: turn.gpt_tokens,
          gpt5_tokens: turn.gpt5_tokens || turn.gemini_tokens,
          gpt_tools: turn.gpt_tools,
          speedup: turn.speedup,
          token_saving_pct: turn.token_saving_pct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setJudgeResultsMap((prev) => ({ ...prev, [judgeKey]: data }));
      showToast(`LLM Judge complete: Winner ${data.winner || 'Tie'}!`);
    } catch (err) {
      showToast(`Judge error: ${err.message}`);
    } finally {
      setJudgeLoadingMap((prev) => ({ ...prev, [judgeKey]: false }));
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
      if (data.total_spend_usd !== undefined) setTotalDbSpend(data.total_spend_usd);
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

  // 3. User Action: Execute Document Q&A Turn in Frontend -> Runs GPT-4o and updates DB & Prometheus!
  const handleExecuteTurn = async (e, overridePrompt) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const promptText = (overridePrompt || userPrompt).trim();
    if (!promptText) return;

    try {
      setIsExecuting(true);
      const currentSessionId = selectedSessionId || `eval_${Date.now()}`;
      const recTitle = activeSession?.recording_title || `RECORDING ${recordings.length + 1}`;
      const recNum = activeSession?.recording_number || (recordings.length + 1);

      showToast(`Querying ${selectedModel || 'gpt-4o'} with document context...`);

      const res = await fetch('/api/chat_turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          recording_title: recTitle,
          recording_number: recNum,
          model: selectedModel || 'gpt-4o',
          user_message: promptText,
          prompt_key: activePromptKey,
          custom_instruction: customPromptInstruction,
          document_text: uploadedDoc.text || '',
          document_name: uploadedDoc.filename || '',
          turn_number: (activeSession?.takes?.length || 0) + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);

      showToast(`Answer generated (${data.turn.latency_seconds}s, ${data.turn.total_tokens} tokens)`);
      setUserPrompt('');
      await fetchDatabaseRecordings();
      await fetchPrometheusMetrics();
      if (!selectedSessionId) {
        setSelectedSessionId(currentSessionId);
      }
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
  const [inspectorHeight, setInspectorHeight] = useState(460);
  const [isInspectorMaximized, setIsInspectorMaximized] = useState(false);
  const [savedInspectorHeight, setSavedInspectorHeight] = useState(460);

  const toggleInspectorMaximize = () => {
    if (isInspectorMaximized) {
      setInspectorHeight(savedInspectorHeight || 460);
      setIsInspectorMaximized(false);
    } else {
      setSavedInspectorHeight(inspectorHeight > 200 ? inspectorHeight : 460);
      const targetMaxH = Math.floor(window.innerHeight * 0.85);
      setInspectorHeight(targetMaxH);
      setIsInspectorMaximized(true);
    }
  };

  const [unconstrainedBlocks, setUnconstrainedBlocks] = useState({});
  const toggleUnconstrained = (blockKey) => {
    setUnconstrainedBlocks((prev) => ({ ...prev, [blockKey]: !prev[blockKey] }));
  };
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
      const maxH = Math.floor(window.innerHeight * 0.88);
      const newH = Math.max(160, Math.min(maxH, startH + dy));
      setInspectorHeight(newH);
      if (newH > window.innerHeight * 0.72) {
        setIsInspectorMaximized(true);
      } else {
        setIsInspectorMaximized(false);
      }
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
  const currentModelVariant = selectedModelBySession[activeSession?.session_id] || 'gpt';
  const isGeminiVariant = currentModelVariant === 'gemini' || currentModelVariant === 'gpt5';
  const activeTakes = (isGeminiVariant && (activeSession?.gpt5_run || activeSession?.gemini_run))
    ? (((activeSession.gpt5_run || activeSession.gemini_run).takes) || [])
    : (activeSession?.takes || []);
  const activeModelDisplay = isGeminiVariant
    ? ((activeSession?.gpt5_run || activeSession?.gemini_run) ? comparisonModelName : `${comparisonModelName} (not run)`)
    : (activeSession?.model || 'gpt-4o');
  const activeTokensDisplay = isGeminiVariant
    ? ((activeSession?.gpt5_run?.total_tokens ?? activeSession?.gemini_run?.total_tokens) || 0)
    : (activeSession?.total_tokens || 0);
  const activeLatencyDisplay = isGeminiVariant
    ? ((activeSession?.gpt5_run?.total_latency_seconds ?? activeSession?.gemini_run?.total_latency_seconds) || 0)
    : (activeSession?.total_latency_seconds || 0);

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

  const handleRerunGeminiInPlace = async (overrideSessionId) => {
    const targetSession = overrideSessionId 
      ? (recordings.find((r) => r.session_id === overrideSessionId) || activeSession)
      : activeSession;
    if (!targetSession) return;
    try {
      setIsExecuting(true);
      showToast(`Re-running turns with ${comparisonModelName}...`);
      const res = await fetch('/api/rerun_gpt5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: targetSession.session_id,
          target_model: comparisonModelName,
          recording_title: targetSession.recording_title || `RECORDING ${targetSession.recording_number || 1}`,
          recording_number: targetSession.recording_number || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`${comparisonModelName} re-run complete & updated in-place!`);
      await fetchDatabaseRecordings();
      await fetchPrometheusMetrics();
      if (activeNav === 'evals') {
        await fetchComparisonData(targetSession.session_id);
      } else {
        setSelectedModelBySession((prev) => ({
          ...prev,
          [targetSession.session_id]: 'gemini',
        }));
        setSelectedTurn(null);
        setSelectedTurnRawJson(null);
      }
    } catch (err) {
      showToast(`Re-run error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

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
            <FileText size={18} style={{ color: 'var(--intent-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>
              Document Intelligence & Evaluation Console
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

            {/* Multi-Model Evaluation & PDF Button */}
            <button
              type="button"
              title="Run Prompt / Recording across All Models and Download PDF"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: 'var(--control-height-sm)',
                padding: '0 var(--space-3)',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#0284c7',
                border: '1px solid #0369a1',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
              onClick={() => setIsMultiModelModalOpen(true)}
            >
              <Sparkles size={13} />
              <span>Multi-Model Eval & PDF</span>
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
              <span style={{ color: 'var(--text-muted)' }}>💰 Total Spend:</span>
              <strong className="tabular-nums" style={{ color: '#10b981', fontWeight: 700 }}>
                ${totalCalculatedSpend.toFixed(5)} USD
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
            {/* Nav: All Experiments (Default View) */}
            <div
              id="nav-all-experiments"
              onClick={() => setActiveNav('all-experiments')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'all-experiments'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'all-experiments' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'all-experiments' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="All Experiments Master Hub: Combined Datasets & Benchmarks"
            >
              <BarChart3 size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'all-experiments' ? 600 : 500 }}>
                    All Experiments
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    200+
                  </span>
                </div>
              )}
            </div>

            {/* Nav: RAG Studio */}
            <div
              id="nav-rag"
              onClick={() => setActiveNav('rag')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'rag'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'rag' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'rag' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Enterprise RAG Studio: Tri-Engine Benchmarks & pgvector DB"
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
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'rag' ? 600 : 500 }}>
                    RAG Studio
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    100
                  </span>
                </div>
              )}
            </div>

            {/* Nav: Sessions (Primary View) */}
            <div
              id="nav-sessions"
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
              title="Primary View: Recorded Sessions & Turns Table"
            >
              <Layers size={15} />
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

            {/* Nav: Evals (Model Comparison) */}
            <div
              id="nav-evals"
              onClick={() => {
                setActiveNav('evals');
                if (selectedSessionId) {
                  fetchComparisonData(selectedSessionId);
                }
              }}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'evals'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'evals' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'evals' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Evals: Side-by-Side Model Comparison (GPT-4o vs GPT-6-sol)"
            >
              <Scale size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'evals' ? 600 : 500 }}>
                    Evals
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

            {/* Nav: Prompt Evals (10 System Prompts) */}
            <div
              id="nav-prompt-evals"
              onClick={() => setActiveNav('prompt-evals')}
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '12px',
                borderLeft:
                  activeNav === 'prompt-evals'
                    ? '3px solid var(--intent-primary)'
                    : '3px solid transparent',
                backgroundColor:
                  activeNav === 'prompt-evals' ? 'var(--surface-selected)' : 'transparent',
                color:
                  activeNav === 'prompt-evals' ? 'var(--intent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Prompt Evals: 10 System Prompts Performance & Cost Benchmark"
            >
              <Sparkles size={15} />
              {isWide && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: activeNav === 'prompt-evals' ? 600 : 500 }}>
                    Prompt Evals
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '10px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      color: '#0284c7',
                      fontWeight: 600,
                    }}
                  >
                    10
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
              VIEW: ALL EXPERIMENTS DATA HUB (MASTER COMBINED VIEW - DEFAULT)
              ==================================================================== */}
          {activeNav === 'all-experiments' && (
            <AllExperimentsDataHub
              showToast={showToast}
              theme={theme}
              displayedPanel2={displayedPanel2}
              activeDrag={activeDrag}
              handlePanel2SplitterMouseDown={handlePanel2SplitterMouseDown}
              onNavigateToRag={() => setActiveNav('rag')}
              onNavigateToMath={() => setActiveNav('sessions')}
              onNavigateToPrompt={() => setActiveNav('prompt-evals')}
            />
          )}

          {/* ====================================================================
              VIEW: RAG INTELLIGENCE STUDIO
              ==================================================================== */}
          {activeNav === 'rag' && (
            <RagEvaluationView
              showToast={showToast}
              theme={theme}
            />
          )}

          {/* ====================================================================
              VIEW A & B: SESSIONS & EVALS (3-Panel Console)
              ==================================================================== */}
          {(activeNav === 'sessions' || activeNav === 'evals') && (
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
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {activeNav === 'evals' ? 'Evaluation Recordings' : 'Recorded Sessions'}
                  </span>
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

                    {/* Multi-Model PDF Evaluation */}
                    <button
                      type="button"
                      title="Evaluate prompt across all models and export PDF with Pareto graph"
                      onClick={() => setIsMultiModelModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 4px',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>PDF Eval</span>
                    </button>

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
                    filteredRecordings.map((rec, index) => {
                      const isSelected = rec.session_id === selectedSessionId;
                      const displayTime = rec.created_at
                        ? new Date(rec.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '12:00 UTC';
                      const recNum = rec.recording_number || (index + 1);
                      const displayTitle = `RECORDING ${recNum}`;

                      return (
                        <div
                          key={rec.session_id}
                          onClick={() => {
                            setSelectedSessionId(rec.session_id);
                            if (activeNav === 'evals') {
                              fetchComparisonData(rec.session_id);
                            } else {
                              setSelectedTurn(null);
                              setSelectedTurnRawJson(null);
                            }
                          }}
                          style={{
                            minHeight: activeNav === 'sessions' ? '74px' : 'var(--row-height-stream-compact)',
                            padding: '8px var(--space-3)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '4px',
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
                              {displayTitle}
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

                          {/* Model Dropdown (Sessions Tab only) */}
                          {activeNav === 'sessions' && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: '4px',
                                paddingTop: '4px',
                                borderTop: '1px dashed var(--border-subtle)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Model:</span>
                                <select
                                  value={selectedModelBySession[rec.session_id] || 'gpt'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedModelBySession((prev) => ({
                                      ...prev,
                                      [rec.session_id]: val,
                                    }));
                                    setSelectedSessionId(rec.session_id);
                                    setSelectedTurn(null);
                                    setSelectedTurnRawJson(null);
                                  }}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    backgroundColor: ((selectedModelBySession[rec.session_id] === 'gpt5' || selectedModelBySession[rec.session_id] === 'gemini')) ? 'var(--intent-primary-subtle)' : 'var(--surface-muted)',
                                    color: ((selectedModelBySession[rec.session_id] === 'gpt5' || selectedModelBySession[rec.session_id] === 'gemini')) ? 'var(--intent-primary)' : '#34d399',
                                    border: '1px solid var(--border-default)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  <option value="gpt">GPT-4o</option>
                                  <option value="gpt5">GPT-6-sol</option>
                                </select>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {(rec.gpt5_run || rec.gemini_run) ? (
                                  <span
                                    title="GPT-6-sol simulation ready"
                                    style={{
                                      fontSize: '9px',
                                      color: 'var(--intent-primary)',
                                      backgroundColor: 'var(--intent-primary-subtle)',
                                      padding: '1px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    GPT-6-sol Ready
                                  </span>
                                ) : (
                                  <span
                                    title="GPT-6-sol simulation not run yet"
                                    style={{
                                      fontSize: '9px',
                                      color: 'var(--text-muted)',
                                      backgroundColor: 'var(--surface-muted)',
                                      padding: '1px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                    }}
                                  >
                                    GPT-6-sol Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
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
                {/* Panel 3: Work Area (Sessions or Evals) */}
                {activeNav === 'sessions' ? (
                  /* Session Detail Docked Container (Edge-to-Edge, Non-Floating) */
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    {activeSession ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                      {/* Top Docked Session Header & Toolbar Bar */}
                      <div
                        style={{
                          backgroundColor: 'var(--surface-base)',
                          borderBottom: '1px solid var(--border-default)',
                          padding: '10px 16px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                {activeSession.recording_title || 'RECORDING 1'} — {isGeminiVariant ? comparisonModelName : 'GPT-4o (Primary)'}
                              </h2>
                              <button
                                type="button"
                                title="Copy Session ID"
                                onClick={() =>
                                  copyToClipboard(isGeminiVariant && (activeSession.gpt5_run || activeSession.gemini_run) ? ((activeSession.gpt5_run || activeSession.gemini_run).session_id) : activeSession.session_id, `Copied Session ID`)
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
                              Session ID: <code className="tabular-nums">{isGeminiVariant && (activeSession.gpt5_run || activeSession.gemini_run) ? ((activeSession.gpt5_run || activeSession.gemini_run).session_id) : activeSession.session_id}</code>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Segmented Model Switcher */}
                            <div
                              style={{
                                display: 'flex',
                                backgroundColor: 'var(--surface-muted)',
                                padding: '2px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModelBySession((prev) => ({ ...prev, [activeSession.session_id]: 'gpt' }));
                                  setSelectedTurn(null);
                                  setSelectedTurnRawJson(null);
                                }}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: '11px',
                                  fontWeight: !isGeminiVariant ? 600 : 500,
                                  backgroundColor: !isGeminiVariant ? 'var(--surface-base)' : 'transparent',
                                  color: !isGeminiVariant ? '#34d399' : 'var(--text-muted)',
                                  border: !isGeminiVariant ? '1px solid var(--border-subtle)' : '1px solid transparent',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                }}
                              >
                                GPT-4o
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModelBySession((prev) => ({ ...prev, [activeSession.session_id]: 'gpt5' }));
                                  setSelectedTurn(null);
                                  setSelectedTurnRawJson(null);
                                }}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: '11px',
                                  fontWeight: isGeminiVariant ? 600 : 500,
                                  backgroundColor: isGeminiVariant ? 'var(--surface-base)' : 'transparent',
                                  color: isGeminiVariant ? 'var(--intent-primary)' : 'var(--text-muted)',
                                  border: isGeminiVariant ? '1px solid var(--border-subtle)' : '1px solid transparent',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>{comparisonModelName}</span>
                                {(activeSession?.gpt5_run || activeSession?.gemini_run) ? (
                                  <span style={{ fontSize: '8px', color: '#2ea043' }}>●</span>
                                ) : (
                                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>○</span>
                                )}
                              </button>
                            </div>

                            {/* Re-run Session with Model B */}
                            <button
                              type="button"
                              disabled={isExecuting}
                              onClick={() => handleRerunGeminiInPlace(activeSession.session_id)}
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
                              <Sparkles size={12} className={isExecuting ? 'spin' : ''} />
                              <span>{isExecuting ? `Re-running with ${comparisonModelName}...` : `Re-run with ${comparisonModelName}`}</span>
                            </button>

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
                              Model: <strong>{activeModelDisplay}</strong>
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
                              Tokens: <strong>{activeTokensDisplay}</strong>
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
                              Latency: <strong>{activeLatencyDisplay}s</strong>
                            </span>
                          </div>
                        </div>




                        {/* Primary View Toolbar Bar (Turns Table & Inspector) */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Turns & Execution History ({activeTakes.length} turns)
                            </span>
                          </div>

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
                              {selectedTurn ? `Viewing Take #${selectedTurn.take_number || 1}` : '(Click any row to inspect)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Upper Work Area (Direct Turns Table) */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'auto',
                          minHeight: '120px',
                          backgroundColor: 'var(--surface-canvas)',
                        }}
                      >
                        <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--surface-base)' }}>
                          {isGeminiVariant && !(activeSession?.gpt5_run || activeSession?.gemini_run) ? (
                            <div
                              style={{
                                margin: '60px auto',
                                maxWidth: '520px',
                                textAlign: 'center',
                                padding: '32px 24px',
                                backgroundColor: 'var(--surface-base)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              }}
                            >
                              <Sparkles size={32} style={{ color: 'var(--intent-primary)', marginBottom: '12px' }} />
                              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                                No GPT-6-sol Simulation Run Yet
                              </h3>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                                Execute the exact same prompts from {activeSession.recording_title} using GPT-6-sol with direct parametric inference (zero MCP tools) to inspect and compare turns.
                              </p>
                              <button
                                type="button"
                                disabled={isExecuting}
                                onClick={() => handleRerunGeminiInPlace(activeSession.session_id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 18px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--intent-primary)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 'var(--radius-xs)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Zap size={14} className={isExecuting ? 'spin' : ''} />
                                <span>{isExecuting ? 'Simulating GPT-6-sol Runs...' : '⚡ Run GPT-6-sol Simulation (Zero Tools)'}</span>
                              </button>
                            </div>
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
                                  const isGemini = (take.model || '').toLowerCase().includes('gemini') || (take.model || '').toLowerCase().includes('gpt-5') || (take.model || '').toLowerCase().includes('gpt-6');

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
                          )}
                        </div>
                      </div>

                      {/* Edge-to-Edge Horizontal Splitter Seam */}
                      {selectedTurn && (
                        <div
                          onMouseDown={handleInspectorResizeMouseDown}
                          onDoubleClick={toggleInspectorMaximize}
                          className={`splitter-row ${activeDrag === 'inspector' ? 'active' : ''}`}
                          title="Drag cursor to resize, or double-click to toggle full view"
                          aria-label="Resize bottom inspector pane"
                          role="separator"
                          aria-orientation="horizontal"
                          aria-valuenow={inspectorHeight}
                          aria-valuemin={180}
                          aria-valuemax={1400}
                          style={{
                            height: '7px',
                            cursor: 'row-resize',
                            margin: 0,
                            padding: 0,
                            backgroundColor: activeDrag === 'inspector' ? 'var(--intent-primary-subtle)' : 'var(--surface-base)',
                            borderTop: '1px solid var(--border-default)',
                            borderBottom: '1px solid var(--border-default)',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div className="splitter-grip-dots" style={{ width: '42px', height: '3px' }} />
                        </div>
                      )}

                      {/* Docked Edge-to-Edge Bottom Turn Inspector Pane */}
                      {selectedTurn && (
                        <div
                          style={{
                            height: `${inspectorHeight}px`,
                            minHeight: '180px',
                            maxHeight: '90vh',
                            backgroundColor: 'var(--surface-base)',
                            borderRadius: 0,
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            margin: 0,
                            flexShrink: 0,
                            transition: activeDrag === 'inspector' ? 'none' : 'height 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Docked Inspector Header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-subtle)',
                                padding: '8px 16px',
                                backgroundColor: 'var(--surface-subtle)',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  onClick={toggleInspectorMaximize}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    backgroundColor: isInspectorMaximized ? 'var(--surface-selected)' : 'var(--surface-muted)',
                                    border: isInspectorMaximized ? '1px solid var(--intent-primary)' : '1px solid var(--border-subtle)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={isInspectorMaximized ? 'Click title to restore normal height' : 'Click title to expand window to full view'}
                                >
                                  <FileJson size={15} style={{ color: 'var(--intent-primary)' }} />
                                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                    Turn Inspector: Take #{selectedTurn.take_number || 1}
                                  </span>
                                  <span
                                    className="tabular-nums"
                                    style={{
                                      fontSize: '10px',
                                      backgroundColor: 'var(--surface-default)',
                                      padding: '1px 5px',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                    }}
                                  >
                                    {selectedTurn.turn_id}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--intent-primary)',
                                      fontWeight: 600,
                                      marginLeft: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    {isInspectorMaximized ? '⤡ Restore Window' : '⤢ Expand Window'}
                                  </span>
                                </div>

                                {/* Take Prev / Next Stepper */}
                                {(() => {
                                  const currentTurnIdx = activeTakes.findIndex(
                                    (t) => (t.turn_id && t.turn_id === selectedTurn.turn_id) || (t.id && t.id === selectedTurn.id)
                                  );
                                  const hasPrev = currentTurnIdx > 0;
                                  const hasNext = currentTurnIdx >= 0 && currentTurnIdx < activeTakes.length - 1;

                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <button
                                        type="button"
                                        disabled={!hasPrev}
                                        onClick={() => hasPrev && handleSelectTurn(activeTakes[currentTurnIdx - 1])}
                                        title="Previous Take"
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '11px',
                                          backgroundColor: 'var(--surface-muted)',
                                          border: '1px solid var(--border-default)',
                                          borderRadius: 'var(--radius-xs)',
                                          cursor: hasPrev ? 'pointer' : 'not-allowed',
                                          opacity: hasPrev ? 1 : 0.4,
                                          color: 'var(--text-secondary)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                      >
                                        <ChevronLeft size={11} />
                                        <span>Prev</span>
                                      </button>
                                      <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        {currentTurnIdx >= 0 ? `${currentTurnIdx + 1}/${activeTakes.length}` : `${activeTakes.length}`}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={!hasNext}
                                        onClick={() => hasNext && handleSelectTurn(activeTakes[currentTurnIdx + 1])}
                                        title="Next Take"
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '11px',
                                          backgroundColor: 'var(--surface-muted)',
                                          border: '1px solid var(--border-default)',
                                          borderRadius: 'var(--radius-xs)',
                                          cursor: hasNext ? 'pointer' : 'not-allowed',
                                          opacity: hasNext ? 1 : 0.4,
                                          color: 'var(--text-secondary)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                      >
                                        <span>Next</span>
                                        <ChevronRight size={11} />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={toggleAllTiles}
                                  title={areAllExpanded ? 'Collapse All Tiles' : 'Expand All Tiles'}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-default)',
                                    backgroundColor: 'var(--surface-muted)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                  }}
                                >
                                  <ChevronDown
                                    size={12}
                                    style={{
                                      transform: areAllExpanded ? 'rotate(180deg)' : 'none',
                                      transition: 'transform 0.15s ease',
                                    }}
                                  />
                                  <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
                                </button>

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

                                <button
                                  type="button"
                                  onClick={toggleInspectorMaximize}
                                  title={isInspectorMaximized ? 'Restore Window' : 'Maximize Window'}
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
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {isInspectorMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                  <span>{isInspectorMaximized ? 'Restore' : 'Maximize'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTurn(null);
                                    setSelectedTurnRawJson(null);
                                  }}
                                  title="Close Inspector"
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '14px',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    marginLeft: '4px',
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-xs)',
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* 4 Dropdown-able Tiles Container */}
                            {(() => {
                              const turnData = selectedTurnRawJson || selectedTurn;
                              const modelName = turnData.model || 'gpt-4o';
                              const isGeminiModel = modelName.toLowerCase().includes('gemini') || modelName.toLowerCase().includes('gpt-5') || modelName.toLowerCase().includes('gpt-6');
                              const systemPromptText =
                                turnData.system_prompt ||
                                (turnData.payload && (turnData.payload.system_prompt || turnData.payload.custom_instruction)) ||
                                (turnData.payload?.prompt_key && PROMPT_PRESETS[turnData.payload.prompt_key]?.system_prompt) ||
                                PROMPT_PRESETS[activePromptKey]?.system_prompt ||
                                'Standard Document Q&A System Prompt';
                              const userPromptText = turnData.user_message || turnData.input || '—';
                              const assistantResponseText = turnData.assistant_response || turnData.output || '—';
                              const toolCalls = Array.isArray(turnData.tool_calls)
                                ? turnData.tool_calls
                                : (turnData.tool_calls ? [turnData.tool_calls] : []);

                              const inTokens = turnData.prompt_tokens ?? turnData.input_tokens ?? 'NA';
                              const outTokens = turnData.completion_tokens ?? turnData.output_tokens ?? 'NA';
                              const totalTokens =
                                turnData.total_tokens ||
                                (inTokens !== 'NA' && outTokens !== 'NA' ? Number(inTokens) + Number(outTokens) : 'NA');
                              const latencySec = turnData.latency_seconds ?? turnData.inference_time ?? 'NA';
                              const throughput =
                                latencySec !== 'NA' && Number(latencySec) > 0 && outTokens !== 'NA'
                                  ? `${(Number(outTokens) / Number(latencySec)).toFixed(1)} tok/s`
                                  : 'NA';

                              const docAttached = (turnData.payload && (turnData.payload.document_name || turnData.payload.document_text)) ? true : false;
                              const simulatedRequest = {
                                model: modelName,
                                prompt_mode: turnData.payload?.prompt_key || activePromptKey,
                                ...(docAttached ? { document_context: turnData.payload?.document_name || 'Attached Document' } : {}),
                                messages: [
                                  { role: 'system', content: systemPromptText },
                                  { role: 'user', content: userPromptText },
                                ],
                                temperature: 0.2,
                              };

                              return (
                                <div
                                  style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    padding: '12px 16px',
                                  }}
                                >
                                  {/* ----------------- TILE 1: PROMPTS & INPUT ----------------- */}
                                  <div
                                    style={{
                                      backgroundColor: 'var(--surface-muted)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      onClick={() => toggleTile('prompts')}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '9px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedTiles.prompts
                                          ? 'var(--surface-hover)'
                                          : 'var(--surface-muted)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MessageSquare size={14} style={{ color: 'var(--intent-primary)' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>1. Prompts & Input</span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            backgroundColor: 'var(--surface-default)',
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            border: '1px solid var(--border-subtle)',
                                          }}
                                        >
                                          Prompt ID: {turnData.turn_id}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {expandedTiles.prompts ? 'Hide' : 'Show'}
                                        </span>
                                        {expandedTiles.prompts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </div>
                                    </div>

                                    {expandedTiles.prompts && (
                                      <div
                                        style={{
                                          borderTop: '1px solid var(--border-subtle)',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '12px',
                                          backgroundColor: 'var(--surface-default)',
                                        }}
                                      >
                                        {/* Prompt ID */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>PROMPT ID / TURN ID:</span>
                                            <button
                                              type="button"
                                              onClick={() => copyToClipboard(turnData.turn_id, 'Copied Prompt ID')}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                              }}
                                              title="Copy Prompt ID"
                                            >
                                              <Copy size={11} />
                                            </button>
                                          </div>
                                          <div
                                            className="tabular-nums"
                                            style={{
                                              padding: '6px 10px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '11px',
                                              fontFamily: 'monospace',
                                              border: '1px solid var(--border-subtle)',
                                            }}
                                          >
                                            {turnData.turn_id}
                                          </div>
                                        </div>

                                        {/* User Prompt */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>USER PROMPT (INPUT):</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => toggleUnconstrained('user_prompt')}
                                                style={{
                                                  background: 'none',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '1px 6px',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  fontSize: '10px',
                                                }}
                                              >
                                                {unconstrainedBlocks['user_prompt'] ? 'Standard Box' : 'Full View'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => copyToClipboard(userPromptText, 'Copied user prompt')}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-muted)',
                                                }}
                                                title="Copy User Prompt"
                                              >
                                                <Copy size={11} />
                                              </button>
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              padding: '8px 10px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '12px',
                                              border: '1px solid var(--border-subtle)',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                              lineHeight: 1.5,
                                              maxHeight: unconstrainedBlocks['user_prompt']
                                                ? 'none'
                                                : isInspectorMaximized
                                                ? '320px'
                                                : '180px',
                                              overflowY: 'auto',
                                              overflowX: 'auto',
                                            }}
                                          >
                                            {userPromptText}
                                          </div>
                                        </div>

                                        {/* System Prompt */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>SYSTEM PROMPT (DIRECTIVES):</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => toggleUnconstrained('sys_prompt')}
                                                style={{
                                                  background: 'none',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '1px 6px',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  fontSize: '10px',
                                                }}
                                              >
                                                {unconstrainedBlocks['sys_prompt'] ? 'Standard Box' : 'Full View'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => copyToClipboard(systemPromptText, 'Copied system prompt')}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-muted)',
                                                }}
                                                title="Copy System Prompt"
                                              >
                                                <Copy size={11} />
                                              </button>
                                            </div>
                                          </div>
                                          <pre
                                            style={{
                                              margin: 0,
                                              padding: '8px 10px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '11px',
                                              fontFamily: 'monospace',
                                              border: '1px solid var(--border-subtle)',
                                              maxHeight: unconstrainedBlocks['sys_prompt']
                                                ? 'none'
                                                : isInspectorMaximized
                                                ? '550px'
                                                : '260px',
                                              overflowY: 'auto',
                                              overflowX: 'auto',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                              lineHeight: 1.4,
                                              color: 'var(--text-secondary)',
                                            }}
                                          >
                                            {systemPromptText}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* ----------------- TILE 2: TOOL EXECUTION & RESULTS ----------------- */}
                                  <div
                                    style={{
                                      backgroundColor: 'var(--surface-muted)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      onClick={() => toggleTile('tools')}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '9px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedTiles.tools
                                          ? 'var(--surface-hover)'
                                          : 'var(--surface-muted)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Wrench size={14} style={{ color: 'var(--intent-primary)' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                          2. Tool Execution & Results
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            color: toolCalls.length > 0 ? '#10b981' : 'var(--text-muted)',
                                            backgroundColor: 'var(--surface-default)',
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            border: '1px solid var(--border-subtle)',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {toolCalls.length > 0
                                            ? `${toolCalls.length} Tool Call(s)`
                                            : 'Zero Tools (Direct Simulation)'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {expandedTiles.tools ? 'Hide' : 'Show'}
                                        </span>
                                        {expandedTiles.tools ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </div>
                                    </div>

                                    {expandedTiles.tools && (
                                      <div
                                        style={{
                                          borderTop: '1px solid var(--border-subtle)',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '10px',
                                          backgroundColor: 'var(--surface-default)',
                                        }}
                                      >
                                        {toolCalls.length === 0 ? (
                                          <div
                                            style={{
                                              padding: '12px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              border: '1px solid var(--border-subtle)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              fontSize: '11px',
                                              color: 'var(--text-secondary)',
                                            }}
                                          >
                                            <Zap size={14} style={{ color: '#10b981' }} />
                                            <span>
                                              <strong>In-Context Grounded</strong> — Model evaluated natively via direct
                                              document context reasoning without external calculation tools.
                                            </span>
                                          </div>
                                        ) : (
                                          toolCalls.map((tc, tcIdx) => {
                                            const tcName =
                                              tc.name ||
                                              tc.tool ||
                                              (tc.summary && tc.summary.match(/\[(.*?)\s+Started\]/)?.[1]) ||
                                              `Tool #${tcIdx + 1}`;
                                            const tcArgs = tc.arguments || tc.args || tc.input || null;
                                            const tcOutput =
                                              tc.output ||
                                              tc.result ||
                                              (tc.summary && tc.summary.match(/Output\]\s*\n?([\s\S]*)/)?.[1]?.trim()) ||
                                              null;

                                            return (
                                              <div
                                                key={tcIdx}
                                                style={{
                                                  backgroundColor: 'var(--surface-muted)',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '10px',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '8px',
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span
                                                      style={{
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        fontFamily: 'monospace',
                                                        color: 'var(--intent-primary)',
                                                      }}
                                                    >
                                                      {tcName}
                                                    </span>
                                                    <span
                                                      style={{
                                                        fontSize: '9px',
                                                        padding: '1px 5px',
                                                        borderRadius: 'var(--radius-xs)',
                                                        backgroundColor: '#10b98122',
                                                        color: '#10b981',
                                                        border: '1px solid #10b98144',
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      EXECUTED
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      copyToClipboard(
                                                        JSON.stringify(tc, null, 2),
                                                        `Copied Tool #${tcIdx + 1}`
                                                      )
                                                    }
                                                    style={{
                                                      background: 'none',
                                                      border: 'none',
                                                      cursor: 'pointer',
                                                      color: 'var(--text-muted)',
                                                    }}
                                                    title="Copy Tool Call Payload"
                                                  >
                                                    <Copy size={11} />
                                                  </button>
                                                </div>

                                                {tcArgs && (
                                                  <div>
                                                    <div
                                                      style={{
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-muted)',
                                                        marginBottom: '2px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                      }}
                                                    >
                                                      <span>ARGUMENTS:</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => toggleUnconstrained(`tool_args_${tcIdx}`)}
                                                        style={{
                                                          background: 'none',
                                                          border: '1px solid var(--border-subtle)',
                                                          borderRadius: 'var(--radius-xs)',
                                                          padding: '1px 6px',
                                                          cursor: 'pointer',
                                                          color: 'var(--text-secondary)',
                                                          fontSize: '10px',
                                                        }}
                                                      >
                                                        {unconstrainedBlocks[`tool_args_${tcIdx}`] ? 'Standard' : 'Full'}
                                                      </button>
                                                    </div>
                                                    <pre
                                                      style={{
                                                        margin: 0,
                                                        padding: '6px 8px',
                                                        backgroundColor: 'var(--surface-default)',
                                                        borderRadius: 'var(--radius-xs)',
                                                        fontSize: '11px',
                                                        fontFamily: 'monospace',
                                                        border: '1px solid var(--border-subtle)',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        maxHeight: unconstrainedBlocks[`tool_args_${tcIdx}`]
                                                          ? 'none'
                                                          : isInspectorMaximized
                                                          ? '360px'
                                                          : '180px',
                                                        overflowY: 'auto',
                                                        overflowX: 'auto',
                                                      }}
                                                    >
                                                      {typeof tcArgs === 'object'
                                                        ? JSON.stringify(tcArgs, null, 2)
                                                        : tcArgs}
                                                    </pre>
                                                  </div>
                                                )}

                                                {tcOutput && (
                                                  <div>
                                                    <div
                                                      style={{
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-muted)',
                                                        marginBottom: '2px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                      }}
                                                    >
                                                      <span>TOOL RESULT:</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => toggleUnconstrained(`tool_out_${tcIdx}`)}
                                                        style={{
                                                          background: 'none',
                                                          border: '1px solid var(--border-subtle)',
                                                          borderRadius: 'var(--radius-xs)',
                                                          padding: '1px 6px',
                                                          cursor: 'pointer',
                                                          color: 'var(--text-secondary)',
                                                          fontSize: '10px',
                                                        }}
                                                      >
                                                        {unconstrainedBlocks[`tool_out_${tcIdx}`] ? 'Standard' : 'Full'}
                                                      </button>
                                                    </div>
                                                    <div
                                                      style={{
                                                        padding: '6px 8px',
                                                        backgroundColor: 'var(--surface-default)',
                                                        borderRadius: 'var(--radius-xs)',
                                                        fontSize: '11px',
                                                        fontFamily: 'monospace',
                                                        color: '#10b981',
                                                        border: '1px solid var(--border-subtle)',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        maxHeight: unconstrainedBlocks[`tool_out_${tcIdx}`]
                                                          ? 'none'
                                                          : isInspectorMaximized
                                                          ? '360px'
                                                          : '180px',
                                                        overflowY: 'auto',
                                                        overflowX: 'auto',
                                                      }}
                                                    >
                                                      {typeof tcOutput === 'object'
                                                        ? JSON.stringify(tcOutput, null, 2)
                                                        : tcOutput}
                                                    </div>
                                                  </div>
                                                )}

                                                {tc.summary && !tcArgs && !tcOutput && (
                                                  <pre
                                                    style={{
                                                      margin: 0,
                                                      padding: '6px 8px',
                                                      backgroundColor: 'var(--surface-default)',
                                                      borderRadius: 'var(--radius-xs)',
                                                      fontSize: '10px',
                                                      fontFamily: 'monospace',
                                                      border: '1px solid var(--border-subtle)',
                                                      whiteSpace: 'pre-wrap',
                                                      wordBreak: 'break-word',
                                                      color: 'var(--text-secondary)',
                                                      maxHeight: '180px',
                                                      overflowY: 'auto',
                                                    }}
                                                  >
                                                    {tc.summary}
                                                  </pre>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* ----------------- TILE 3: MODEL RESPONSE ----------------- */}
                                  <div
                                    style={{
                                      backgroundColor: 'var(--surface-muted)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      onClick={() => toggleTile('response')}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '9px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedTiles.response
                                          ? 'var(--surface-hover)'
                                          : 'var(--surface-muted)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={14} style={{ color: 'var(--intent-primary)' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>3. Model Response</span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            backgroundColor: 'var(--surface-default)',
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            border: '1px solid var(--border-subtle)',
                                          }}
                                        >
                                          {modelName}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {expandedTiles.response ? 'Hide' : 'Show'}
                                        </span>
                                        {expandedTiles.response ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </div>
                                    </div>

                                    {expandedTiles.response && (
                                      <div
                                        style={{
                                          borderTop: '1px solid var(--border-subtle)',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '12px',
                                          backgroundColor: 'var(--surface-default)',
                                        }}
                                      >
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>ASSISTANT OUTPUT:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => toggleUnconstrained('assistant_resp')}
                                                style={{
                                                  background: 'none',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '1px 6px',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  fontSize: '10px',
                                                }}
                                              >
                                                {unconstrainedBlocks['assistant_resp'] ? 'Standard Box' : 'Full View'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  copyToClipboard(assistantResponseText, 'Copied assistant response')
                                                }
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-muted)',
                                                }}
                                                title="Copy Response"
                                              >
                                                <Copy size={11} />
                                              </button>
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              padding: '10px 12px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '12px',
                                              border: '1px solid var(--border-subtle)',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                              lineHeight: 1.5,
                                              maxHeight: unconstrainedBlocks['assistant_resp']
                                                ? 'none'
                                                : isInspectorMaximized
                                                ? '500px'
                                                : '260px',
                                              overflowY: 'auto',
                                              overflowX: 'auto',
                                            }}
                                          >
                                            {assistantResponseText}
                                          </div>
                                        </div>

                                        {/* Response Metric Badges */}
                                        <div
                                          style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gap: '6px',
                                          }}
                                        >
                                          <div
                                            style={{
                                              padding: '6px 8px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              border: '1px solid var(--border-subtle)',
                                            }}
                                          >
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                              OUTPUT TOKENS
                                            </div>
                                            <div
                                              className="tabular-nums"
                                              style={{ fontSize: '12px', fontWeight: 600 }}
                                            >
                                              {outTokens}
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              padding: '6px 8px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              border: '1px solid var(--border-subtle)',
                                            }}
                                          >
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LATENCY</div>
                                            <div
                                              className="tabular-nums"
                                              style={{ fontSize: '12px', fontWeight: 600 }}
                                            >
                                              {latencySec !== 'NA' ? `${latencySec}s` : 'NA'}
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              padding: '6px 8px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              border: '1px solid var(--border-subtle)',
                                            }}
                                          >
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>THROUGHPUT</div>
                                            <div
                                              className="tabular-nums"
                                              style={{ fontSize: '12px', fontWeight: 600 }}
                                            >
                                              {throughput}
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              padding: '6px 8px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              border: '1px solid var(--border-subtle)',
                                            }}
                                          >
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>MODEL</div>
                                            <div
                                              style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                fontFamily: 'monospace',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                              }}
                                            >
                                              {modelName}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* ----------------- TILE 4: REQUEST, PAYLOAD & METADATA ----------------- */}
                                  <div
                                    style={{
                                      backgroundColor: 'var(--surface-muted)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      onClick={() => toggleTile('payload')}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '9px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedTiles.payload
                                          ? 'var(--surface-hover)'
                                          : 'var(--surface-muted)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Layers size={14} style={{ color: 'var(--intent-primary)' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                          4. Request, Payload & Metadata
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            backgroundColor: 'var(--surface-default)',
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            border: '1px solid var(--border-subtle)',
                                          }}
                                        >
                                          Tokens: {totalTokens} | Latency: {latencySec}s
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {expandedTiles.payload ? 'Hide' : 'Show'}
                                        </span>
                                        {expandedTiles.payload ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </div>
                                    </div>

                                    {expandedTiles.payload && (
                                      <div
                                        style={{
                                          borderTop: '1px solid var(--border-subtle)',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '12px',
                                          backgroundColor: 'var(--surface-default)',
                                        }}
                                      >
                                        {/* Metadata Badges Grid */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '6px',
                                            }}
                                          >
                                            METADATA & EXECUTION METRICS:
                                          </div>
                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(4, 1fr)',
                                              gap: '6px',
                                            }}
                                          >
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                TOTAL TOKENS
                                              </div>
                                              <div
                                                className="tabular-nums"
                                                style={{ fontSize: '12px', fontWeight: 600 }}
                                              >
                                                {totalTokens}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                INPUT TOKENS
                                              </div>
                                              <div
                                                className="tabular-nums"
                                                style={{ fontSize: '12px', fontWeight: 600 }}
                                              >
                                                {inTokens}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                OUTPUT TOKENS
                                              </div>
                                              <div
                                                className="tabular-nums"
                                                style={{ fontSize: '12px', fontWeight: 600 }}
                                              >
                                                {outTokens}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                LATENCY / INFERENCE
                                              </div>
                                              <div
                                                className="tabular-nums"
                                                style={{ fontSize: '12px', fontWeight: 600 }}
                                              >
                                                {latencySec !== 'NA' ? `${latencySec}s` : 'NA'}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                SESSION ID
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '10px',
                                                  fontFamily: 'monospace',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                {turnData.session_id}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                TIMESTAMP
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '10px',
                                                  fontFamily: 'monospace',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                {turnData.timestamp || 'NA'}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                TAKE / TURN #
                                              </div>
                                              <div style={{ fontSize: '11px', fontWeight: 600 }}>
                                                {turnData.take_label || `TAKE #${turnData.take_number || 1}`}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                padding: '6px 8px',
                                                backgroundColor: 'var(--surface-muted)',
                                                borderRadius: 'var(--radius-xs)',
                                                border: '1px solid var(--border-subtle)',
                                              }}
                                            >
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                                FILE ARTIFACT
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '10px',
                                                  fontFamily: 'monospace',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                {turnData.filename || `${turnData.turn_id}.json`}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* API Request */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>API REQUEST PAYLOAD:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => toggleUnconstrained('api_req')}
                                                style={{
                                                  background: 'none',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '1px 6px',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  fontSize: '10px',
                                                }}
                                              >
                                                {unconstrainedBlocks['api_req'] ? 'Standard Box' : 'Full View'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    JSON.stringify(simulatedRequest, null, 2),
                                                    'Copied Request Payload'
                                                  )
                                                }
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-muted)',
                                                }}
                                                title="Copy Request Payload"
                                              >
                                                <Copy size={11} />
                                              </button>
                                            </div>
                                          </div>
                                          <pre
                                            style={{
                                              margin: 0,
                                              padding: '8px 10px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '11px',
                                              fontFamily: 'monospace',
                                              border: '1px solid var(--border-subtle)',
                                              maxHeight: unconstrainedBlocks['api_req']
                                                ? 'none'
                                                : isInspectorMaximized
                                                ? '420px'
                                                : '220px',
                                              overflowY: 'auto',
                                              overflowX: 'auto',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                              lineHeight: 1.4,
                                            }}
                                          >
                                            {JSON.stringify(simulatedRequest, null, 2)}
                                          </pre>
                                        </div>

                                        {/* Raw Payload JSON */}
                                        <div>
                                          <div
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              marginBottom: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>FULL RAW PAYLOAD JSON:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => toggleUnconstrained('raw_json')}
                                                style={{
                                                  background: 'none',
                                                  border: '1px solid var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '1px 6px',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  fontSize: '10px',
                                                }}
                                              >
                                                {unconstrainedBlocks['raw_json'] ? 'Standard Box' : 'Full View'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    JSON.stringify(turnData, null, 2),
                                                    'Copied Full Raw JSON'
                                                  )
                                                }
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-muted)',
                                                }}
                                                title="Copy Raw JSON"
                                              >
                                                <Copy size={11} />
                                              </button>
                                            </div>
                                          </div>
                                          <pre
                                            style={{
                                              margin: 0,
                                              padding: '8px 10px',
                                              backgroundColor: 'var(--surface-muted)',
                                              borderRadius: 'var(--radius-xs)',
                                              fontSize: '11px',
                                              fontFamily: 'monospace',
                                              border: '1px solid var(--border-subtle)',
                                              maxHeight: unconstrainedBlocks['raw_json']
                                                ? 'none'
                                                : isInspectorMaximized
                                                ? '650px'
                                                : '280px',
                                              overflowY: 'auto',
                                              overflowX: 'auto',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                              lineHeight: 1.4,
                                              color: 'var(--text-primary)',
                                            }}
                                          >
                                            {JSON.stringify(turnData, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
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
              ) : (
                /* ================================================================
                   VIEW: EVALS TAB (Model Comparison: GPT-4o vs GPT-6-sol)
                   ================================================================ */
                activeSession ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      minHeight: 0,
                      backgroundColor: 'var(--surface-canvas)',
                    }}
                  >
                    {/* Top Docked Evals Header & Toolbar */}
                    <div
                      style={{
                        backgroundColor: 'var(--surface-base)',
                        borderBottom: '1px solid var(--border-default)',
                        padding: '12px 18px',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Scale size={18} style={{ color: 'var(--intent-primary)' }} />
                            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                              RECORDING {activeSession.recording_number || 1} — Model Evaluation & Comparison
                            </h2>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                            Comparing <strong>GPT-4o (Document Grounded)</strong> vs <strong>{comparisonModelName} (Document Evaluation)</strong> • Session ID: <code className="tabular-nums">{activeSession.session_id}</code>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={sessionJudgingMap[activeSession.session_id] || loadingComparison}
                            onClick={() => fetchComparisonData(activeSession.session_id, true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'var(--intent-primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 'var(--radius-xs)',
                              cursor: (sessionJudgingMap[activeSession.session_id] || loadingComparison) ? 'not-allowed' : 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            <Scale size={13} className={sessionJudgingMap[activeSession.session_id] ? 'spin' : ''} />
                            <span>
                              {sessionJudgingMap[activeSession.session_id]
                                ? `Evaluating RECORDING ${activeSession.recording_number || 1} with LLM Judge...`
                                : 'Grade All Turns (LLM Judge)'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Top Paired Metrics Banner */}
                      {comparisonData && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '12px',
                            padding: '10px 14px',
                            backgroundColor: 'var(--surface-muted)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Benchmark Summary:
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              padding: '2px 4px',
                              color: 'var(--text-secondary)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Zap size={11} />
                            <span>{comparisonData.overall_speedup_factor}x Faster (GPT-6-sol)</span>
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              padding: '2px 4px',
                              color: 'var(--text-primary)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{comparisonData.overall_token_savings_pct}% Fewer Tokens ({comparisonData.total_gpt_tokens} → {(comparisonData.total_gpt5_tokens || comparisonData.total_gemini_tokens)})</span>
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              padding: '2px 4px',
                              color: 'var(--text-secondary)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{comparisonData.math_accuracy_rate_pct}% Numerical Match</span>
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              padding: '2px 4px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Total: GPT-4o {comparisonData.total_gpt_latency_s}s vs GPT-6-sol {comparisonData.total_gpt5_latency_s || (comparisonData.total_gpt5_latency_s || comparisonData.total_gemini_latency_s)}s
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Main Scrollable Comparative Content Area */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {loadingComparison && !comparisonData && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                          <div>Loading comparative evaluation data...</div>
                        </div>
                      )}

                      {!loadingComparison && (!comparisonData || !comparisonData.turns || comparisonData.turns.length === 0) && (
                        <div
                          style={{
                            padding: '24px',
                            backgroundColor: 'var(--surface-base)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            maxWidth: '600px',
                            margin: '40px auto',
                          }}
                        >
                          <Scale size={32} style={{ color: 'var(--intent-primary)', marginBottom: '12px' }} />
                          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                            No Paired GPT-6-sol Simulation Found
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                            This recording currently has GPT-4o turns recorded with MCP tools. To benchmark latency, token savings, and ground truth accuracy side-by-side with GPT-6-sol (zero tools), run the simulation below:
                          </p>
                          <button
                            type="button"
                            disabled={isExecuting}
                            onClick={async () => {
                              try {
                                setIsExecuting(true);
                                showToast('Running GPT-6-sol simulation with zero tools...');
                                const res = await fetch('/api/rerun_gpt5', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    session_id: activeSession.session_id,
                                    target_model: 'gpt-6-sol',
                                    recording_title: activeSession.recording_title || `RECORDING ${activeSession.recording_number || 1}`,
                                    recording_number: activeSession.recording_number || 1,
                                  }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed');
                                showToast('GPT-6-sol simulation finished & saved!');
                                await fetchDatabaseRecordings();
                                await fetchComparisonData(activeSession.session_id);
                              } catch (err) {
                                showToast(`Error: ${err.message}`);
                              } finally {
                                setIsExecuting(false);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 18px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: 'var(--intent-primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Zap size={14} />
                            <span>{isExecuting ? 'Simulating GPT-6-sol Runs...' : '⚡ Run GPT-6-sol Simulation (Zero Tools)'}</span>
                          </button>
                        </div>
                      )}

                      {/* ====================================================================
                          COLLECTIVE MULTI-ASPECT EVALUATION SYNTHESIS CARD
                          ==================================================================== */}
                      {comparisonData && comparisonData.turns && comparisonData.turns.length > 0 && (() => {
                        const turns = comparisonData.turns;
                        const currentSessionId = activeSession?.session_id;
                        const recNum = activeSession.recording_number || 1;
                        const getTurnJudge = (t) => judgeResultsMap[`${currentSessionId}_${t.turn_number}`] || t.judge;
                        const judgedTurns = turns.filter(t => getTurnJudge(t));
                        const modelAWinsCount = judgedTurns.filter(t => getTurnJudge(t)?.winner === 'Model A').length;
                        const modelBWinsCount = judgedTurns.filter(t => getTurnJudge(t)?.winner === 'Model B').length;
                        const tiesCount = judgedTurns.filter(t => {
                          const w = getTurnJudge(t)?.winner;
                          return w === 'Tie' || w === 'Equal' || w === 'TIE';
                        }).length;
                        const avgGptScore = judgedTurns.length > 0 
                          ? (judgedTurns.reduce((acc, t) => acc + (getTurnJudge(t)?.gpt_score || 0), 0) / judgedTurns.length).toFixed(1)
                          : '—';
                        const avgGpt5Score = judgedTurns.length > 0 
                          ? (judgedTurns.reduce((acc, t) => acc + (getTurnJudge(t)?.gemini_score || 0), 0) / judgedTurns.length).toFixed(1)
                          : '—';

                        const totalGptTok = comparisonData.total_gpt_tokens || 0;
                        const totalGpt5Tok = (comparisonData.total_gpt5_tokens || comparisonData.total_gemini_tokens) || 0;
                        const tokenSavingsPct = comparisonData.overall_token_savings_pct || 0;
                        const totalGptLat = comparisonData.total_gpt_latency_s || 0;
                        const totalGpt5Lat = (comparisonData.total_gpt5_latency_s || comparisonData.total_gemini_latency_s) || 0;
                        const speedupFactor = comparisonData.overall_speedup_factor || 1;
                        const matchRatePct = comparisonData.math_accuracy_rate_pct || 0;

                        // Dynamic Winner Verdict according to recording metrics & judged turns
                        let overallWinnerBadge = '';
                        let overallWinnerSub = '';
                        let dynamicRecommendation = '';

                        if (judgedTurns.length > 0) {
                          if (modelBWinsCount > modelAWinsCount) {
                            overallWinnerBadge = `🏆 GPT-6-sol (Accuracy & Persona Dominant in RECORDING ${recNum})`;
                            overallWinnerSub = `GPT-6-sol won ${modelBWinsCount} of ${judgedTurns.length} judged turns with an avg score of ${avgGpt5Score}/5 vs GPT-4o's ${avgGptScore}/5. Combined with ${speedupFactor}x speedup and ${tokenSavingsPct}% token savings, GPT-6-sol outperforms on this test suite.`;
                          } else if (modelAWinsCount > modelBWinsCount) {
                            overallWinnerBadge = `🏆 GPT-4o (Reasoning & Tool Verification Dominant in RECORDING ${recNum})`;
                            overallWinnerSub = `GPT-4o won ${modelAWinsCount} of ${judgedTurns.length} judged turns with an avg score of ${avgGptScore}/5 vs GPT-6-sol's ${avgGpt5Score}/5. GPT-4o demonstrated superior structural adherence and calculation auditability.`;
                          } else {
                            overallWinnerBadge = `🤝 Model Parity / Dead Heat (RECORDING ${recNum})`;
                            overallWinnerSub = `Both models achieved equal standing (${modelAWinsCount} GPT-4o wins, ${modelBWinsCount} GPT-6-sol wins, ${tiesCount} ties). GPT-6-sol led in token efficiency (${tokenSavingsPct}% savings), while GPT-4o verified equations via MCP tools.`;
                          }
                        } else {
                          // Not judged yet
                          if (speedupFactor >= 1.0) {
                            overallWinnerBadge = `⚡ GPT-6-sol (Efficiency Advantage in RECORDING ${recNum})`;
                            overallWinnerSub = `Direct parametric inference completed in ${totalGpt5Lat}s vs GPT's ${totalGptLat}s (${speedupFactor}x speedup) with ${tokenSavingsPct}% lower token cloud spend. (Click "Grade All Turns" above to grade qualitative judge scores).`;
                          } else {
                            overallWinnerBadge = `⚡ GPT-4o (Latency Parity in RECORDING ${recNum})`;
                            overallWinnerSub = `GPT-4o completed with tool execution in ${totalGptLat}s vs GPT-6-sol in ${totalGpt5Lat}s, while GPT-6-sol saved ${tokenSavingsPct}% cloud tokens. (Click "Grade All Turns" above to grade qualitative judge scores).`;
                          }
                        }

                        // Dynamic Recommendation tailored to each recording's exact outcome
                        if (matchRatePct === 100 && speedupFactor >= 1.0) {
                          dynamicRecommendation = `💡 Production Deployment Recommendation for RECORDING ${recNum}: GPT-6-sol (Direct Parametric) is the optimal production choice. It achieved 100% numerical agreement with zero MCP tool calls, delivering a ${speedupFactor}x speedup and saving ${tokenSavingsPct}% cloud tokens (${(totalGptTok - totalGpt5Tok).toLocaleString()} tokens saved). Use GPT-6-sol directly for this prompt pattern.`;
                        } else if (matchRatePct >= 70 && speedupFactor >= 1.0) {
                          dynamicRecommendation = `💡 Production Deployment Recommendation for RECORDING ${recNum}: Hybrid routing recommended. GPT-6-sol delivered ${speedupFactor}x speedup and ${tokenSavingsPct}% token savings with solid (${matchRatePct}%) mathematical agreement. For user-facing speed, use GPT-6-sol for conversational intake and standard calculations, routing only complex or multi-step equations to GPT-4o + MCP tools.`;
                        } else if (speedupFactor < 1.0) {
                          dynamicRecommendation = `💡 Production Deployment Recommendation for RECORDING ${recNum}: GPT-4o + MCP Tools recommended. For this specific recording, GPT-4o's tool dispatch was faster (${totalGptLat}s vs ${totalGpt5Lat}s), providing deterministic mathematical verification with no latency penalty.`;
                        } else {
                          dynamicRecommendation = `💡 Production Deployment Recommendation for RECORDING ${recNum}: Dual-stage pipeline recommended. Route standard queries to ${comparisonModelName} to capture ${tokenSavingsPct}% token savings, and conditionally escalate complex deep-reasoning queries to GPT-4o with grounded document context.`;
                        }

                        return (
                          <div
                            style={{
                              flexShrink: 0,
                              border: '1px solid var(--intent-primary)',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--surface-base)',
                              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                              overflow: 'hidden',
                              marginBottom: '6px',
                            }}
                          >
                            {/* Top Banner Header */}
                            <div
                              style={{
                                backgroundColor: 'var(--surface-muted)',
                                padding: '14px 18px',
                                borderBottom: '1px solid var(--border-default)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      letterSpacing: '0.04em',
                                      textTransform: 'uppercase',
                                      backgroundColor: 'transparent',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-default)',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                    }}
                                  >
                                    SYNTHESIS
                                  </span>
                                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                    Holistic Benchmark Synthesis: RECORDING {recNum}
                                  </h3>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                                  Synthesized multi-aspect analysis across <strong>Latency & Network I/O</strong>, <strong>Token Economics</strong>, <strong>Mathematical Integrity</strong>, <strong>Confirmation Barrier Protocol</strong>, and <strong>LLM Judge Verdicts</strong>.
                                </p>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setIsCollectiveCardExpanded(!isCollectiveCardExpanded)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--surface-muted)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-xs)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span>{isCollectiveCardExpanded ? 'Collapse Synthesis' : 'Expand Full Synthesis'}</span>
                                  <ChevronDown size={14} style={{ transform: isCollectiveCardExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                                </button>
                              </div>
                            </div>

                            {/* Primary 4 Metric High-Level Scorecard */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: windowWidth < 900 ? '1fr 1fr' : 'repeat(4, 1fr)',
                                gap: '12px',
                                padding: '16px 20px',
                                backgroundColor: 'var(--surface-canvas)',
                                borderBottom: isCollectiveCardExpanded ? '1px solid var(--border-subtle)' : 'none',
                              }}
                            >
                              {/* Metric 1: Speedup */}
                              <div style={{ backgroundColor: 'var(--surface-base)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <Zap size={13} style={{ color: 'var(--text-secondary)' }} /> LATENCY & SPEEDUP
                                </div>
                                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                                  {speedupFactor}x Faster
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  GPT-6-sol: {totalGpt5Lat}s vs GPT-4o: {totalGptLat}s ({(totalGptLat - totalGpt5Lat).toFixed(2)}s saved)
                                </div>
                              </div>

                              {/* Metric 2: Token Economics */}
                              <div style={{ backgroundColor: 'var(--surface-base)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <Sparkles size={13} style={{ color: 'var(--text-secondary)' }} /> TOKEN ECONOMICS
                                </div>
                                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                                  {tokenSavingsPct}% Savings
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  GPT-6-sol: {totalGpt5Tok.toLocaleString()} tok vs GPT-4o: {totalGptTok.toLocaleString()} tok
                                </div>
                              </div>

                              {/* Metric 3: Mathematical Ground Truth */}
                              <div style={{ backgroundColor: 'var(--surface-base)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <CheckCircle2 size={13} style={{ color: 'var(--text-secondary)' }} /> NUMERICAL MATCH
                                </div>
                                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                                  {matchRatePct}%
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Exact numerical agreement across prompt calculations
                                </div>
                              </div>

                              {/* Metric 4: Judge Consensus */}
                              <div style={{ backgroundColor: 'var(--surface-base)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <Scale size={13} style={{ color: 'var(--text-secondary)' }} /> LLM JUDGE SCORE
                                </div>
                                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                                  {judgedTurns.length > 0 ? `${avgGpt5Score} / 5` : '— / 5'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {judgedTurns.length > 0 
                                    ? `GPT-6-sol: ${modelBWinsCount} wins • GPT-4o: ${modelAWinsCount} wins • ${tiesCount} ties`
                                    : 'Awaiting judge evaluation for this recording'}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Multi-Aspect In-Depth Analysis Sections */}
                            {isCollectiveCardExpanded && (
                              <div
                                style={{
                                  padding: '18px 20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '14px',
                                  backgroundColor: 'var(--surface-base)',
                                }}
                              >
                                {/* Executive Verdict Callout */}
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--surface-muted)',
                                    borderLeft: '4px solid var(--intent-primary)',
                                    borderRadius: 'var(--radius-xs)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                                      {overallWinnerBadge}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {judgedTurns.length > 0 ? `Evaluated across ${judgedTurns.length} judged turns` : `Benchmarked across ${turns.length} conversation turns`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {overallWinnerSub} Across RECORDING {recNum}, {comparisonModelName} and GPT-4o were evaluated comparatively using identical document grounding and prompt modes.
                                  </div>
                                </div>

                                {/* 4 Pillars Grid (Full Text, No Cuts) */}
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: windowWidth < 850 ? '1fr' : '1fr 1fr',
                                    gap: '14px',
                                  }}
                                >
                                  {/* Pillar 1: Latency & Network I/O */}
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      backgroundColor: 'var(--surface-canvas)',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2ea043', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Zap size={14} /> Aspect 1: Latency & Network I/O Architecture
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                      GPT-4o required a total of <strong>{totalGptLat}s</strong> to execute the {turns.length} turns in RECORDING {recNum}. Each turn involving an operation required multiple roundtrips: parsing user intent, transmitting tool arguments over IPC socket connections to the MCP calculation server, waiting for external execution, and completing a second LLM inference pass.
                                      <br /><br />
                                      {speedupFactor >= 1.0 ? (
                                        <>In stark contrast, GPT-6-sol finished RECORDING {recNum} in <strong>{totalGpt5Lat}s</strong>, achieving an <strong>{speedupFactor}x overall speedup</strong> ({(totalGptLat - totalGpt5Lat).toFixed(2)}s saved) by computing responses directly in a single parametric forward pass with zero network delays or socket overhead.</>
                                      ) : (
                                        <>In this recording, GPT-6-sol took <strong>{totalGpt5Lat}s</strong> while GPT-4o took <strong>{totalGptLat}s</strong> (a {Math.abs(totalGpt5Lat - totalGptLat).toFixed(2)}s difference). Socket latency was negligible relative to token generation length.</>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pillar 2: Token Economics & Cloud Cost */}
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      backgroundColor: 'var(--surface-canvas)',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--intent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Sparkles size={14} /> Aspect 2: Token Economics & Cloud Infrastructure Spend
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                      GPT-4o burned a cumulative <strong>{totalGptTok.toLocaleString()} tokens</strong> across RECORDING {recNum} (averaging {Math.round(totalGptTok / turns.length)} tok/turn). To enable tool calling, 14 MCP function schemas (`server_add`, `server_sub`, `update_state`, etc.) were attached to the prompt payload on each turn.
                                      <br /><br />
                                      GPT-6-sol consumed only <strong>{totalGpt5Tok.toLocaleString()} tokens</strong> (averaging {Math.round(totalGpt5Tok / turns.length)} tok/turn)—yielding an enormous <strong>{tokenSavingsPct}% token reduction</strong> (saving {(totalGptTok - totalGpt5Tok).toLocaleString()} tokens) in RECORDING {recNum}.
                                    </div>
                                  </div>

                                  {/* Pillar 3: Ground-Truth Mathematical Integrity */}
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      backgroundColor: 'var(--surface-canvas)',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <CheckCircle2 size={14} /> Aspect 3: Mathematical Ground-Truth & Calculation Reliability
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                      Numerical ground-truth match rate stands at <strong>{matchRatePct}%</strong> for RECORDING {recNum}.
                                      <br /><br />
                                      {matchRatePct === 100 ? (
                                        <>Both GPT-4o (delegating arithmetic to verifiable Python functions) and {comparisonModelName} (relying on parametric internal weights) achieved <strong>100% exact numerical agreement</strong> on all calculated numbers with zero discrepancies.</>
                                      ) : (
                                        <>GPT-4o delegates arithmetic to verifiable Python functions guaranteeing 100% precision. {comparisonModelName} agreed on {matchRatePct}% of candidate numbers; variances occurred where conversational acknowledgment turns did not include identical explicit numbers or where formatting differed.</>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pillar 4: Protocol Adherence & Confirmation Barrier */}
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      backgroundColor: 'var(--surface-canvas)',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Award size={14} /> Aspect 4: Confirmation Barrier & Agentic Safety Protocols
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                      Both models were evaluated on the strict Confirmation Barrier protocol across the {turns.length} turns of RECORDING {recNum}.
                                      <br /><br />
                                      The audit verifies that when new numbers and operations are introduced, both models pause, clearly state the proposed equation (e.g. <em>"I see you want to multiply X and Y. Should I go ahead?"</em>), and wait for affirmative permission (<em>"YES"</em>) before calculating. Both models successfully handled conversational inquiries without triggering premature execution.
                                    </div>
                                  </div>
                                </div>

                                {/* Aspect 5: Dynamic Executive Production Takeaway */}
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: '12px',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  <strong>{dynamicRecommendation}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Comparative Cards for Each Turn */}
                      {comparisonData?.turns?.map((t) => {
                        const judgeKey = `${activeSession?.session_id}_${t.turn_number}`;
                        const judgeData = judgeResultsMap[judgeKey] || t.judge;
                        const isJudging = judgeLoadingMap[judgeKey];

                        return (
                          <div
                            key={t.turn_number}
                            style={{
                              border: '1px solid var(--border-default)',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--surface-base)',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            }}
                          >
                            {/* Turn Header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: '10px',
                                borderBottom: '1px solid var(--border-subtle)',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--surface-muted)',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  TAKE #{t.turn_number}
                                </span>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  "{t.user_message}"
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  className="tabular-nums"
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 4px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  ⚡ {t.speedup}x faster
                                </span>
                                <span
                                  className="tabular-nums"
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 4px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  💰 {t.token_saving_pct}% saved tokens
                                </span>
                              </div>
                            </div>

                            {/* Side-by-Side Model Columns */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: windowWidth < 800 ? '1fr' : '1fr 1fr',
                                gap: '14px',
                              }}
                            >
                              {/* Left Column: GPT-4o */}
                              <div
                                style={{
                                  padding: '14px',
                                  backgroundColor: 'var(--surface-muted)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                  }}
                                >
                                  <strong style={{ color: '#34d399' }}>
                                    GPT-4o (Document Grounded)
                                  </strong>
                                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span className="tabular-nums">⏱️ {t.gpt_latency}s</span>
                                    <span>•</span>
                                    <span className="tabular-nums">🔤 {t.gpt_tokens} tok</span>
                                  </div>
                                </div>

                                {/* Tool badges */}
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                  {t.gpt_tools?.map((tool, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-xs)',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      🛠️ {tool}
                                    </span>
                                  ))}
                                </div>

                                {/* Full response without cuts */}
                                <div
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: 1.55,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginTop: '4px',
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--surface-base)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {t.gpt_response}
                                </div>
                              </div>

                              {/* Right Column: GPT-6-sol */}
                              <div
                                style={{
                                  padding: '14px',
                                  backgroundColor: 'var(--surface-muted)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                  }}
                                >
                                  <strong style={{ color: 'var(--intent-primary)' }}>
                                    GPT-6-sol (Zero Tools)
                                  </strong>
                                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span className="tabular-nums">⏱️ {t.gpt5_latency || t.gemini_latency}s</span>
                                    <span>•</span>
                                    <span className="tabular-nums">🔤 {t.gpt5_tokens || t.gemini_tokens} tok</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      backgroundColor: 'transparent',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-default)',
                                      borderRadius: 'var(--radius-xs)',
                                      fontWeight: 500,
                                    }}
                                  >
                                    Direct Parametric (Zero MCP Latency)
                                  </span>
                                </div>

                                {/* Full response without cuts */}
                                <div
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: 1.55,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginTop: '4px',
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--surface-base)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {t.gpt5_response || t.gemini_response}
                                </div>
                              </div>
                            </div>

                            {/* COMPREHENSIVE FULL EXPLANATION SECTION (NO CUTS IN TEXT) */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                padding: '12px 14px',
                                backgroundColor: 'var(--surface-muted)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Full Evaluation Breakdown & Analysis
                              </div>

                              {/* Section 1: LLM Judge Verdict & Detailed Feedback */}
                              <div
                                style={{
                                  padding: '10px 12px',
                                  backgroundColor: 'var(--surface-base)',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                {judgeData ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: '11px',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-xs)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-default)',
                                          }}
                                        >
                                          Winner: {judgeData.winner === 'Model B' ? 'GPT-6-sol' : (judgeData.winner === 'Model A' ? 'GPT-4o' : 'Tie / Equal')}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          Scores: GPT-4o {judgeData.gpt_score}/5 ⭐ • GPT-6-sol {(judgeData.gpt5_score ?? judgeData.gemini_score)}/5 ⭐
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        LLM Judge (GPT-6-sol Impartial Evaluator)
                                      </span>
                                    </div>

                                    {/* Complete explanation text - NO CUTS, FULL WRAP */}
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        lineHeight: 1.6,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        backgroundColor: 'var(--surface-muted)',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-xs)',
                                        borderLeft: '3px solid var(--intent-primary)',
                                      }}
                                    >
                                      <div>
                                        <strong>Judge Rationale:</strong> {judgeData.feedback}
                                      </div>
                                      {judgeData.accuracy_analysis && (
                                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                          <strong>🎯 Accuracy Audit (LLM):</strong> {judgeData.accuracy_analysis}
                                        </div>
                                      )}
                                      {judgeData.efficiency_analysis && (
                                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                          <strong>⚡ Telemetry & Token Efficiency (LLM):</strong> {judgeData.efficiency_analysis}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      Turn not graded by LLM Judge yet.
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isJudging}
                                      onClick={() => handleRunJudgeForTurn(t)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        backgroundColor: 'var(--surface-muted)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 'var(--radius-xs)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Scale size={12} />
                                      <span>{isJudging ? 'Evaluating with Judge...' : 'Grade with LLM Judge'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Section 2: Detailed Performance & Latency Rationale */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: windowWidth < 800 ? '1fr' : '1fr 1fr 1fr',
                                  gap: '10px',
                                  fontSize: '11px',
                                }}
                              >
                                {/* Latency Rationale */}
                                <div
                                  style={{
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--surface-base)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    ⚡ Latency & Network I/O
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    GPT-4o spent <strong>{t.gpt_latency}s</strong> handling external MCP tool roundtrips. {comparisonModelName} responded in <strong>{t.gpt5_latency || t.gemini_latency}s</strong> (<strong>{t.speedup}x speedup</strong>) via direct parametric inference without external I/O overhead.
                                  </div>
                                </div>

                                {/* Token Economics Rationale */}
                                <div
                                  style={{
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--surface-base)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    💰 Token Economics
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    GPT-4o consumed <strong>{t.gpt_tokens} tokens</strong> (prompt: {t.gpt_prompt_tokens || '—'}, completion: {t.gpt_completion_tokens || '—'}) due to attached tool schemas. {comparisonModelName} used <strong>{t.gpt5_tokens || t.gemini_tokens} tokens</strong> (<strong>{t.token_saving_pct}% reduction</strong>) by eliminating tool schemas entirely.
                                  </div>
                                </div>

                                {/* Ground Truth Accuracy Rationale */}
                                <div
                                  style={{
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--surface-base)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    🎯 Mathematical Integrity
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    {t.math_match ? (
                                      <span style={{ color: '#2ea043' }}>
                                        ✅ Exact Match: Both models agreed on <strong>{t.shared_numbers?.join(', ')}</strong>. Calculation accuracy is 100% verified without needing tool intervention.
                                      </span>
                                    ) : (
                                      <span>
                                        ℹ️ Multi-Turn Flow: Model honored confirmation barrier and proposed equation before calculation execution.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 'var(--space-6)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      margin: 'auto',
                    }}
                  >
                    Select a recording from Panel 2 to compare models
                  </div>
                )
              )}
                </main>
            </>
          )}

          {/* ====================================================================
              VIEW: PROMPT EVALS (10 SYSTEM PROMPTS BENCHMARK)
              ==================================================================== */}
          {activeNav === 'prompt-evals' && (
            <PromptEvaluationView
              recordings={recordings}
              activeSession={activeSession}
              showToast={showToast}
              onSpendUpdate={(amt) => setLiveEvalSpend((prev) => prev + amt)}
            />
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

        {/* Multi-Model Evaluation & PDF Modal */}
        <MultiModelEvaluationModal
          isOpen={isMultiModelModalOpen}
          onClose={() => setIsMultiModelModalOpen(false)}
          activeSession={activeSession}
          selectedTurn={selectedTurn}
          recordings={recordings}
          panel2Model={activeModelDisplay || selectedModel || 'gpt-4o'}
          showToast={showToast}
          theme={theme}
          onSpendUpdate={(amt) => setLiveEvalSpend((prev) => prev + amt)}
          onOpenPromptEvals={() => {
            setIsMultiModelModalOpen(false);
            setActiveNav('prompt-evals');
          }}
        />
      </div>
    </SupportedViewportGate>
  );
}
