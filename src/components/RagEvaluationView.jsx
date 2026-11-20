import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Layers,
  FileText,
  Activity,
  Database,
  Search,
  RefreshCw,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Send,
  Sliders,
  ChevronRight,
  Info,
  Plus,
  Play,
  Upload,
  Table as TableIcon,
  ChevronLeft,
  FileCode,
  FileType,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { SupportedViewportGate } from './SupportedViewportGate.jsx';

const AVAILABLE_MODELS = [
  'gpt-6-astra',
  'gpt-6.1-sol',
  'gpt-5.5',
  'gpt-4o',
  'gpt-4o-mini'
];

const BENCHMARK_QUESTIONS = [
  {
    doc: 'it_security_compliance.txt',
    query: 'What are the minimum password requirements and when are corporate accounts locked out?'
  },
  {
    doc: 'cloud_disaster_recovery.txt',
    query: 'What are the strict RPO and RTO limits for Tier-1 mission-critical systems and what is the maximum replication lag?'
  },
  {
    doc: 'enterprise_sla_agreement.txt',
    query: 'What is the monthly uptime commitment and what financial service credit applies if uptime drops below 99.0%?'
  },
  {
    doc: 'health_insurance_benefits.txt',
    query: 'What are the annual individual and family medical deductibles, and how many free therapy sessions are provided?'
  },
  {
    doc: 'data_retention_gdpr.txt',
    query: 'Within how many calendar days must GDPR Right to Erasure requests be fulfilled, and how long are financial transaction logs retained?'
  },
  {
    doc: 'code_review_security_policy.txt',
    query: 'How many peer approvals are required for pull requests to main and when does the weekend deployment freeze start?'
  },
  {
    doc: 'procurement_vendor_policy.txt',
    query: 'What approvals and competitive bids are mandatory for purchases exceeding $5,000 and $25,000?'
  },
  {
    doc: 'incident_response_sev1.txt',
    query: 'How quickly must the incident war room bridge be initiated and what is the public status update cadence?'
  },
  {
    doc: 'employee_leave_parental.txt',
    query: 'How many weeks of fully paid parental leave are provided, and how many vacation days may be rolled over?'
  },
  {
    doc: 'intellectual_property_inventions.txt',
    query: 'How long does the non-solicitation and non-compete restriction last following separation of employment?'
  },
  {
    doc: 'api_rate_limits_spec.pdf',
    query: 'What are the request limits for the Standard Developer Tier and what algorithm is used to enforce limits?'
  },
  {
    doc: 'remote_work_ergonomics.pdf',
    query: 'What is the maximum equipment allowance for remote employees and what are the monitor display specifications?'
  },
  {
    doc: 'cryptographic_key_management.pdf',
    query: 'What encryption algorithm is mandatory for data at rest and how frequently must SSH host keys and API keys be rotated?'
  },
  {
    doc: 'travel_per_diem_policy.pdf',
    query: 'What is the maximum daily meal per diem and when is business class permitted for flights?'
  },
  {
    doc: 'customer_data_classification.pdf',
    query: 'What classification tier covers PII and credit card data, and how quickly must security spillages be isolated?'
  },
  {
    doc: 'continuous_deployment_policy.pdf',
    query: 'What are the three canary rollout traffic percentages and what error rate triggers an automated rollback?'
  },
  {
    doc: 'contractor_onboarding_hardware.pdf',
    query: 'Within how many business days must company-issued laptops be returned after contractor termination?'
  },
  {
    doc: 'production_infrastructure_deep.md',
    query: 'According to our production infrastructure, disaster recovery, and continuous deployment standards: What are the strict RPO and RTO thresholds for Tier-1 mission-critical systems, what is the maximum allowable cross-region database replication lag, what exact traffic percentages and soak periods define the canary deployment stages, and what specific error spike or latency degradation triggers an automated rollback?'
  }
];

export function RagEvaluationView({ showToast: propShowToast, theme: initialTheme = 'light' }) {
  // Viewport tracking for §3 Viewport Gate (min 900x600)
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Nav drawer state (§5 Compact Overlay Navigation)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState('evals'); // 'evals' | 'database' | 'docs'

  const [theme, setTheme] = useState(initialTheme || 'light');

  // Sync theme if prop changes
  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Semantic score coloring helper functions
  const getScoreColor = (pct) => {
    if (pct == null) return 'var(--text-muted)';
    if (pct >= 85) return 'var(--intent-success)';
    if (pct >= 70) return 'var(--intent-warning)';
    return 'var(--intent-danger)';
  };

  const getScoreBg = (pct) => {
    return 'transparent';
  };

  const getScoreBorder = (pct) => {
    return 'transparent';
  };

  // Preprocesses model outputs for crisp enterprise markdown rendering & repairs broken tables
  const formatGroundedMarkdown = (text) => {
    if (!text) return '';
    let str = text.replace(/\r\n/g, '\n');

    // 1. Ensure headings have clean margins before them
    str = str.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');

    // 2. Separate jammed bullet list items
    str = str.replace(/([.?!])\s+(-\s+\*\*)/g, '$1\n- **');
    str = str.replace(/(#{1,6}\s+[^\n]+)\s+(-\s+\*\*)/g, '$1\n\n$2');

    // 3. Robust Table Reconstruction (Removes any accidental blank lines between table rows)
    const lines = str.split('\n');
    const cleanedLines = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isTableRow = trimmed.includes('|') && (trimmed.startsWith('|') || /^\|?.+\|.+/.test(trimmed));

      if (isTableRow) {
        if (!inTable) {
          // Entering a table: ensure exactly one blank line before the table
          if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() !== '') {
            cleanedLines.push('');
          }
          inTable = true;
        }
        cleanedLines.push(trimmed);
      } else if (inTable && trimmed === '') {
        // Empty line while in table mode: peek ahead to see if the table continues
        let nextIsRow = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextTrim = lines[j].trim();
          if (nextTrim === '') continue;
          if (nextTrim.includes('|') && (nextTrim.startsWith('|') || /^\|?.+\|.+/.test(nextTrim))) {
            nextIsRow = true;
          }
          break;
        }
        if (nextIsRow) {
          // Skip the empty line inside the table block so markdown parser keeps table intact
          continue;
        } else {
          inTable = false;
          cleanedLines.push('');
        }
      } else {
        if (inTable) {
          inTable = false;
          if (trimmed !== '') {
            cleanedLines.push('');
          }
        }
        cleanedLines.push(line);
      }
    }

    return cleanedLines.join('\n');
  };

  // Resizable Panel 2 state (§4 Geometry constants: 300px - 600px, nominal 364px)
  const [panel2Width, setPanel2Width] = useState(() => {
    const saved = localStorage.getItem('v2_panel2_width');
    return saved ? Math.min(600, Math.max(300, Number(saved))) : 364;
  });
  const [isDraggingP2, setIsDraggingP2] = useState(false);

  // Evaluation & Query data states
  const [evaluations, setEvaluations] = useState([]);
  const [customQueries, setCustomQueries] = useState(() => {
    try {
      const saved = localStorage.getItem('v2_custom_queries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected question and per-question model tracking
  const [selectedQueryText, setSelectedQueryText] = useState(() => {
    return localStorage.getItem('v2_selected_query') || BENCHMARK_QUESTIONS[0].query;
  });
  const [selectedModelsByQuery, setSelectedModelsByQuery] = useState(() => {
    try {
      const saved = localStorage.getItem('v2_model_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // UI status states
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'evaluated' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'claims' | 'contexts'
  const [toastMessage, setToastMessage] = useState(null);
  const [topK, setTopK] = useState(() => {
    return parseInt(localStorage.getItem('v2_top_k') || '8', 10);
  });

  // Modals state
  const [isAddQueryModalOpen, setIsAddQueryModalOpen] = useState(false);
  const [newQueryInput, setNewQueryInput] = useState('');
  const [newQueryDocInput, setNewQueryDocInput] = useState('');
  const [newQueryModel, setNewQueryModel] = useState('gpt-6-astra');

  // Ingest Modal: Upload File (PDF, DOCX, TXT...) or Paste Text (Choose from Server Docs removed)
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestMode, setIngestMode] = useState('upload'); // 'upload' | 'paste'
  const [fileToUpload, setFileToUpload] = useState(null);
  const [ingestFilename, setIngestFilename] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const fileInputRef = useRef(null);

  // Database Explorer states
  const [dbTables, setDbTables] = useState([]);
  const [selectedDbTable, setSelectedDbTable] = useState('document_embeddings');
  const [dbTableData, setDbTableData] = useState({ rows: [], total: 0, limit: 50, offset: 0 });
  const [dbPageOffset, setDbPageOffset] = useState(0);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSelectedRow, setDbSelectedRow] = useState(null);

  // Ingested Documents Viewer states
  const [documentsList, setDocumentsList] = useState([]);
  const [selectedDocName, setSelectedDocName] = useState(() => {
    return localStorage.getItem('v2_selected_doc') || 'customer_data_classification.pdf';
  });
  const [selectedDocContent, setSelectedDocContent] = useState(null);
  const [isLoadingDocContent, setIsLoadingDocContent] = useState(false);
  const [docViewerTab, setDocViewerTab] = useState('preview'); // 'preview' | 'chunks' | 'text'

  // Resize listener for hard gate
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Splitter 2 Mouse Drag Handler (§4 / §10: 300px min, 600px max, Panel 3 floor 480px)
  useEffect(() => {
    if (!isDraggingP2) return;

    const handleMouseMove = (e) => {
      const p1Width = isDrawerOpen && viewport.width >= 1440 ? 220 : 56;
      const rawWidth = e.clientX - p1Width;
      const maxAllowed = Math.min(600, window.innerWidth - p1Width - 480);
      const clamped = Math.max(300, Math.min(maxAllowed, rawWidth));
      setPanel2Width(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingP2(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingP2, isDrawerOpen, viewport.width]);

  useEffect(() => {
    localStorage.setItem('v2_panel2_width', String(panel2Width));
  }, [panel2Width]);

  // Escape key closes modals & drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (isAddQueryModalOpen) setIsAddQueryModalOpen(false);
        if (isIngestModalOpen) setIsIngestModalOpen(false);
        if (dbSelectedRow) setDbSelectedRow(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isAddQueryModalOpen, isIngestModalOpen, dbSelectedRow]);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (propShowToast) propShowToast(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Fetch Evaluations from API
  const fetchEvals = async (targetId = null) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/evaluations?limit=100');
      const data = await res.json();
      setEvaluations(data);
      if (targetId && data.some((item) => Number(item.id) === Number(targetId))) {
        const found = data.find((item) => Number(item.id) === Number(targetId));
        if (found) {
          setSelectedQueryText(found.query);
          localStorage.setItem('v2_selected_query', found.query);
        }
      }
    } catch (err) {
      console.error('Failed to fetch evaluations:', err);
      showToast('Error loading evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch DB Overview
  const fetchDbOverview = async () => {
    setIsDbLoading(true);
    try {
      const res = await fetch('/api/db/overview');
      const data = await res.json();
      setDbTables(data.tables || []);
    } catch (err) {
      console.error('Failed to fetch DB overview:', err);
    } finally {
      setIsDbLoading(false);
    }
  };

  // Fetch DB Table Data
  const fetchDbTableData = async (table = selectedDbTable, offset = 0) => {
    setIsDbLoading(true);
    try {
      const res = await fetch(`/api/db/table/${table}?limit=50&offset=${offset}`);
      const data = await res.json();
      setDbTableData(data);
      setDbPageOffset(offset);
    } catch (err) {
      console.error(`Failed to fetch table ${table}:`, err);
      showToast(`Error fetching table ${table}`);
    } finally {
      setIsDbLoading(false);
    }
  };

  // Fetch Documents List
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocumentsList(data || []);
      if (!selectedDocName && data.length > 0) {
        setSelectedDocName(data[0].document_name);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  // Fetch Document Content (for viewer)
  const fetchDocContent = async (docName) => {
    if (!docName) return;
    setIsLoadingDocContent(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docName)}/content`);
      const data = await res.json();
      setSelectedDocContent(data);
      // Auto-set viewer tab: preview if PDF, text if TXT/DOCX
      if (data.is_pdf) {
        setDocViewerTab('preview');
      } else {
        setDocViewerTab('text');
      }
    } catch (err) {
      console.error('Failed to fetch doc content:', err);
      showToast(`Error loading content for ${docName}`);
    } finally {
      setIsLoadingDocContent(false);
    }
  };

  useEffect(() => {
    fetchEvals();
    fetchDbOverview();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeDestination === 'database') {
      fetchDbOverview();
      fetchDbTableData(selectedDbTable, 0);
    } else if (activeDestination === 'docs') {
      fetchDocuments();
      if (selectedDocName) {
        fetchDocContent(selectedDocName);
      }
    }
  }, [activeDestination, selectedDbTable]);

  useEffect(() => {
    if (activeDestination === 'docs' && selectedDocName) {
      fetchDocContent(selectedDocName);
    }
  }, [selectedDocName]);

  // Persist custom queries
  useEffect(() => {
    localStorage.setItem('v2_custom_queries', JSON.stringify(customQueries));
  }, [customQueries]);

  // Persist model map
  useEffect(() => {
    localStorage.setItem('v2_model_map', JSON.stringify(selectedModelsByQuery));
  }, [selectedModelsByQuery]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Live Cost Estimation
  const costStats = useMemo(() => {
    const embeddingBaseCost = 0.13; // text-embedding-3-large across 11 books
    const evalCount = evaluations.length || 0;
    // System A (GPT-4o) ~$0.0075 + System B (Cloud RAG GPT-4o) ~$0.0075 + Judge (GPT-6.2 Sol) ~$0.018 = ~$0.033 / query
    const totalEvalCost = evalCount * 0.033;
    const total = embeddingBaseCost + totalEvalCost;
    return {
      embeddingCost: embeddingBaseCost,
      evalCost: totalEvalCost,
      totalCost: total,
      evalCount
    };
  }, [evaluations.length]);

  // Unified Questions List
  const questionsList = useMemo(() => {
    const map = new Map();

    // 1. Existing evaluations in DB
    evaluations.forEach((e) => {
      if (e.query && e.query.trim()) {
        const key = e.query.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `eval-${e.id}`,
            query: e.query.trim(),
            doc: e.document_name || 'Ingested Document',
            isCustom: false
          });
        }
      }
    });

    // 2. Benchmark queries
    BENCHMARK_QUESTIONS.forEach((b, idx) => {
      const key = b.query.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `bench-${idx}`,
          query: b.query.trim(),
          doc: b.doc,
          isCustom: false
        });
      }
    });

    // 3. User custom queries
    customQueries.forEach((c, idx) => {
      const key = c.query.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `custom-${idx}`,
          query: c.query.trim(),
          doc: c.doc || 'Custom Document',
          isCustom: true
        });
      }
    });

    return Array.from(map.values());
  }, [evaluations, customQueries]);

  // Active question and model helper functions
  const activeQuestion = selectedQueryText || (questionsList.length > 0 ? questionsList[0].query : '');
  const activeModel = selectedModelsByQuery[activeQuestion] || 'gpt-6-astra';

  const findEvalForQuestionAndModel = (qText, model) => {
    if (!qText) return null;
    const qLower = qText.trim().toLowerCase();
    const exact = evaluations.find(
      (e) => e.query?.trim().toLowerCase() === qLower && e.model_id === model
    );
    if (exact) return exact;
    return evaluations.find((e) => e.query?.trim().toLowerCase() === qLower);
  };

  const activeEval = findEvalForQuestionAndModel(activeQuestion, activeModel);

  const parseComparisonData = (evaluation) => {
    if (!evaluation) return null;
    const expl = evaluation.explanations || {};
    let winner = expl.winner || '';
    let scoreA = expl.system_a_score;
    let scoreB = expl.system_b_score;
    let reasoning = expl.reasoning || '';
    let ansA = expl.system_a_answer || '';
    let ansB = expl.system_b_answer || '';

    const resp = evaluation.response || '';
    if (!ansA && resp.includes('[System A]') && resp.includes('[System B]')) {
      const parts = resp.split(/####\s+/);
      for (const p of parts) {
        if (p.includes('[System A]')) {
          ansA = p.replace(/.*?\[System A\].*?\n/, '').trim();
        } else if (p.includes('[System B]')) {
          ansB = p.replace(/.*?\[System B\].*?\n/, '').trim();
        } else if (p.includes('GPT-6.2 Sol') || p.includes('Judge Analysis')) {
          reasoning = p.replace(/.*?Judge Analysis.*?\n/, '').trim();
        }
      }
    }

    if (!winner && evaluation.verdict?.startsWith('WINNER:')) {
      winner = evaluation.verdict.replace('WINNER:', '').trim();
    }

    if (ansA || ansB || winner) {
      return {
        isComparison: true,
        winner: winner || 'Tie',
        scoreA: scoreA !== undefined ? scoreA : 7,
        scoreB: scoreB !== undefined ? scoreB : 7,
        ansA,
        ansB,
        reasoning: reasoning || 'Evaluation completed by GPT-6.2 Sol.'
      };
    }
    return null;
  };

  const comparisonData = useMemo(() => parseComparisonData(activeEval), [activeEval]);
  const currentTab = comparisonData && activeTab === 'overview' ? 'comparison' : activeTab;

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questionsList.filter((item) => {
      const curModel = selectedModelsByQuery[item.query] || 'gpt-6-astra';
      const evalMatch = findEvalForQuestionAndModel(item.query, curModel);

      if (filterMode === 'evaluated' && !evalMatch) return false;
      if (filterMode === 'pending' && evalMatch) return false;

      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const matchQ = item.query?.toLowerCase().includes(sq);
        const matchDoc = item.doc?.toLowerCase().includes(sq);
        return matchQ || matchDoc;
      }
      return true;
    });
  }, [questionsList, selectedModelsByQuery, evaluations, filterMode, searchQuery]);

  // Run live evaluation (Strictly NO hardcoded results)
  const handleRunSpecificEvaluation = async (queryText, modelId, docName = null, topKCount = null) => {
    if (!queryText || isQuerying) return;
    const finalTopK = topKCount || topK || 8;
    setIsQuerying(true);
    showToast(`Retrieving ${finalTopK} chunks & evaluating with ${modelId}...`);

    try {
      const itemMatch = questionsList.find(
        (q) => q.query.trim().toLowerCase() === queryText.trim().toLowerCase()
      );
      const targetDoc = docName || (itemMatch ? itemMatch.doc : null);

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          model_id: modelId,
          document_name: targetDoc,
          top_k: finalTopK,
          async_eval: false
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Evaluation completed with ${modelId} (${data.sources?.length || finalTopK} chunks retrieved)!`);
        await fetchEvals(data.evaluation_id);
      } else {
        showToast(`Error: ${data.detail || 'Evaluation failed'}`);
      }
    } catch (err) {
      showToast(`Execution error: ${err.message}`);
    } finally {
      setIsQuerying(false);
    }
  };

  // Deduplicate evaluations
  const handleDeleteDuplicates = async () => {
    try {
      const res = await fetch('/api/evaluations/duplicates', { method: 'DELETE' });
      const data = await res.json();
      await fetchEvals();
      showToast(`Deduplicated: removed ${data.deleted_count || 0} duplicate evaluations`);
    } catch (err) {
      showToast('Failed to deduplicate: ' + err.message);
    }
  };

  // Add Custom Query
  const handleAddCustomQuery = (e) => {
    e.preventDefault();
    if (!newQueryInput.trim()) return;

    const trimmed = newQueryInput.trim();
    const newEntry = {
      query: trimmed,
      doc: newQueryDocInput.trim() || 'Auto-Detected Vector Doc',
      isCustom: true
    };

    setCustomQueries((prev) => [newEntry, ...prev]);
    setSelectedQueryText(trimmed);
    setSelectedModelsByQuery((prev) => ({ ...prev, [trimmed]: newQueryModel }));
    localStorage.setItem('v2_selected_query', trimmed);

    setIsAddQueryModalOpen(false);
    setNewQueryInput('');
    setNewQueryDocInput('');
    showToast('New query added to benchmark list! Click Run to evaluate.');
  };

  // Ingest Document (supports File Upload and Paste Text)
  const handleIngestDocument = async (e) => {
    e.preventDefault();
    setIsIngesting(true);
    showToast('Ingesting document into PostgreSQL vector database...');

    try {
      let res;
      if (ingestMode === 'upload' && fileToUpload) {
        // Multipart file upload (PDF, DOCX, TXT, MD, etc.)
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('dataset_name', 'default_kb');

        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
      } else {
        // Paste text
        res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: ingestFilename.trim() || 'custom_document.txt',
            content: ingestContent,
            dataset_name: 'default_kb'
          })
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(`Ingested ${data.chunks_ingested || 1} chunks into PostgreSQL vector DB!`);
        setIsIngestModalOpen(false);
        setFileToUpload(null);
        setIngestFilename('');
        setIngestContent('');
        await fetchDbOverview();
        await fetchDocuments();
      } else {
        showToast(`Ingest error: ${data.detail || 'Failed to ingest'}`);
      }
    } catch (err) {
      showToast(`Ingest error: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  const handleExportList = () => {
    const jsonStr = JSON.stringify(evaluations, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluations_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Exported evaluations JSON');
  };

  // Viewport Hard Gate (§3: 900x600 floor)
  if (viewport.width < 900 || viewport.height < 600) {
    return <SupportedViewportGate width={viewport.width} height={viewport.height} />;
  }

  const isCompactNav = viewport.width < 1440;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* ─────────────────────────────────────────────────────────────────────────────
          §6 GLOBAL BAR (48px)
          ───────────────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          height: 'var(--topbar-height)',
          minHeight: 'var(--topbar-height)',
          backgroundColor: 'var(--surface-base)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 950
        }}
      >
        {/* Left: Nav Toggle + Title + Navigation Modes (All corporate blue styled) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            aria-expanded={isDrawerOpen}
            title={isDrawerOpen ? 'Close Navigation' : 'Open Navigation'}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--intent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            <Menu size={18} />
          </button>

          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '5px',
              backgroundColor: 'var(--intent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Layers size={14} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Evaluation Console
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--intent-primary-subtle)',
                color: 'var(--intent-primary)',
                border: '1px solid var(--intent-primary-border)'
              }}
            >
              v2.0
            </span>
          </div>

          {/* Quick Nav Destination Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '12px', backgroundColor: 'var(--surface-panel2)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
            <button
              onClick={() => setActiveDestination('evals')}
              style={{
                height: '26px',
                padding: '0 10px',
                fontSize: '11px',
                fontWeight: activeDestination === 'evals' ? 600 : 500,
                backgroundColor: activeDestination === 'evals' ? 'var(--intent-primary-subtle)' : 'transparent',
                color: activeDestination === 'evals' ? 'var(--intent-primary)' : 'var(--text-muted)',
                border: activeDestination === 'evals' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Activity size={13} color="var(--intent-primary)" /> Evaluations
            </button>
            <button
              onClick={() => setActiveDestination('database')}
              style={{
                height: '26px',
                padding: '0 10px',
                fontSize: '11px',
                fontWeight: activeDestination === 'database' ? 600 : 500,
                backgroundColor: activeDestination === 'database' ? 'var(--intent-primary-subtle)' : 'transparent',
                color: activeDestination === 'database' ? 'var(--intent-primary)' : 'var(--text-muted)',
                border: activeDestination === 'database' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Database size={13} color="var(--intent-primary)" /> Database View
            </button>
            <button
              onClick={() => setActiveDestination('docs')}
              style={{
                height: '26px',
                padding: '0 10px',
                fontSize: '11px',
                fontWeight: activeDestination === 'docs' ? 600 : 500,
                backgroundColor: activeDestination === 'docs' ? 'var(--intent-primary-subtle)' : 'transparent',
                color: activeDestination === 'docs' ? 'var(--intent-primary)' : 'var(--text-muted)',
                border: activeDestination === 'docs' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FileText size={13} color="var(--intent-primary)" /> Ingested Docs ({documentsList.length})
            </button>
          </div>
        </div>

        {/* Right Action Controls: Add Query, Ingest Doc, Theme Toggle (Electric Blue Action Buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live Process Cost Meter */}
          <div
            title={`Total Pipeline Cost:\n• Ingestion (text-embedding-3-large): $${costStats.embeddingCost.toFixed(2)}\n• Dual Evaluations (Evaluation Console + Cloud RAG): $${(costStats.evalCost * 0.45).toFixed(3)}\n• LLM Judge (GPT-6.2 Sol): $${(costStats.evalCost * 0.55).toFixed(3)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '4px',
              backgroundColor: 'var(--surface-panel2)',
              border: '1px solid var(--border-hairline)',
              fontSize: '11px',
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', fontWeight: 700 }}>
              <DollarSign size={13} strokeWidth={2.5} />
              <span>Cost:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${costStats.totalCost.toFixed(2)}</span>
            </div>
            <span style={{ color: 'var(--border-hairline)' }}>|</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {costStats.evalCount} evals (~$0.033/q)
            </span>
          </div>

          <button
            className="btn-electric"
            onClick={() => setIsAddQueryModalOpen(true)}
            style={{
              height: '28px',
              padding: '0 12px',
              borderRadius: '4px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Plus size={13} strokeWidth={2.5} /> Add Query
          </button>

          <button
            className="btn-electric"
            onClick={() => {
              setIngestMode('upload');
              setIsIngestModalOpen(true);
            }}
            style={{
              height: '28px',
              padding: '0 12px',
              borderRadius: '4px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Upload size={13} strokeWidth={2.5} /> Ingest Document
          </button>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light (White)' : 'Switch to Dark'}
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--intent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            {theme === 'dark' ? <Sun size={14} color="var(--intent-primary)" /> : <Moon size={14} color="var(--intent-primary)" />}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          WORKSPACE: HORIZONTAL THREE-PANEL SHELL (§4)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - var(--topbar-height))', overflow: 'hidden', position: 'relative' }}>

        {/* Transparent Backdrop for Compact Drawer (§5) */}
        {isCompactNav && isDrawerOpen && (
          <div className="p1-drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
        )}

        {/* 56px Spacer in flex-flow */}
        <div className="nav-compact-spacer" />

        {/* ── PANEL 1: NAVIGATION RAIL (§7) ────────────────────────────────────── */}
        <aside
          className={`panel-1 nav-compact ${isDrawerOpen ? 'drawer-open' : 'p1-collapsed'}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '12px 0'
          }}
        >
          <div>
            {isDrawerOpen && (
              <div
                style={{
                  padding: '4px 16px 8px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--intent-primary)'
                }}
              >
                Navigation
              </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Destination 1: Evaluations */}
              <div
                onClick={() => { setActiveDestination('evals'); setIsDrawerOpen(false); }}
                title="Evaluations Console"
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  borderLeft: activeDestination === 'evals' ? '3px solid var(--intent-primary)' : '3px solid transparent',
                  backgroundColor: activeDestination === 'evals' ? 'var(--intent-primary-subtle)' : 'transparent',
                  color: activeDestination === 'evals' ? 'var(--intent-primary)' : 'var(--text-secondary)'
                }}
              >
                <Layers size={15} color="var(--intent-primary)" />
                {isDrawerOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: activeDestination === 'evals' ? 600 : 400 }}>
                      Evaluations
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {evaluations.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Destination 2: Database Explorer */}
              <div
                onClick={() => { setActiveDestination('database'); setIsDrawerOpen(false); }}
                title="Live PostgreSQL Database"
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  borderLeft: activeDestination === 'database' ? '3px solid var(--intent-primary)' : '3px solid transparent',
                  backgroundColor: activeDestination === 'database' ? 'var(--surface-selected)' : 'transparent',
                  color: activeDestination === 'database' ? 'var(--intent-primary)' : 'var(--text-secondary)'
                }}
              >
                <Database size={15} color="var(--intent-primary)" />
                {isDrawerOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: activeDestination === 'database' ? 600 : 400 }}>
                      Database View
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Port: 5434
                    </span>
                  </div>
                )}
              </div>

              {/* Destination 3: Documents */}
              <div
                onClick={() => { setActiveDestination('docs'); setIsDrawerOpen(false); }}
                title="Ingested Knowledge Base"
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  borderLeft: activeDestination === 'docs' ? '3px solid var(--intent-primary)' : '3px solid transparent',
                  backgroundColor: activeDestination === 'docs' ? 'var(--surface-selected)' : 'transparent',
                  color: activeDestination === 'docs' ? 'var(--intent-primary)' : 'var(--text-secondary)'
                }}
              >
                <FileText size={15} color="var(--intent-primary)" />
                {isDrawerOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: activeDestination === 'docs' ? 600 : 400 }}>
                      Documents
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {documentsList.length || 22}
                    </span>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {isDrawerOpen && (
            <div style={{ padding: '0 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div>EGM Console v2.0</div>
              <div style={{ fontSize: '10px', marginTop: '2px', color: 'var(--intent-primary)' }}>Corporate Blue Edition</div>
            </div>
          )}
        </aside>

        {/* ── DESTINATION 1: EVALUATIONS BENCHMARKING CONSOLE ──────────────────── */}
        {activeDestination === 'evals' && (
          <>
            {/* ── PANEL 2: MASTER LIST OF QUESTIONS & BENCHMARKS (RESIZABLE) ──── */}
            <section
              style={{
                width: `${panel2Width}px`,
                minWidth: '300px',
                maxWidth: '600px',
                backgroundColor: 'var(--surface-panel2)',
                borderRight: '1px solid var(--border-hairline)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              {/* Header Row: Title + Action Controls */}
              <div
                style={{
                  height: '38px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-hairline)'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--intent-primary)' }}>
                  Questions ({filteredQuestions.length})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={handleDeleteDuplicates}
                    title="Remove duplicate question evaluations from DB"
                    style={{
                      height: '24px',
                      padding: '0 6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--intent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px'
                    }}
                  >
                    <ShieldCheck size={12} color="var(--intent-primary)" /> Dedupe
                  </button>

                  <button
                    onClick={handleExportList}
                    title="Export evaluations JSON"
                    style={{
                      height: '24px',
                      padding: '0 6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--intent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px'
                    }}
                  >
                    <Download size={12} color="var(--intent-primary)" /> Export
                  </button>

                  <button
                    onClick={() => fetchEvals()}
                    title="Refresh evaluations"
                    style={{
                      height: '24px',
                      width: '24px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--intent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <RefreshCw size={12} color="var(--intent-primary)" className={isLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Search Strip */}
              <div
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'var(--surface-base)',
                  borderBottom: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Search size={13} color="var(--intent-primary)" />
                <input
                  type="text"
                  placeholder="Search questions or target documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Filter Chips */}
              <div
                style={{
                  padding: '6px 10px',
                  display: 'flex',
                  gap: '4px',
                  borderBottom: '1px solid var(--border-hairline)'
                }}
              >
                {[
                  { id: 'all', label: 'All Questions' },
                  { id: 'evaluated', label: 'Evaluated' },
                  { id: 'pending', label: 'Pending / New' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterMode(f.id)}
                    style={{
                      flex: 1,
                      height: '22px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '3px',
                      border: filterMode === f.id ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                      backgroundColor: filterMode === f.id ? 'var(--intent-primary-subtle)' : 'transparent',
                      color: filterMode === f.id ? 'var(--intent-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0 4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Questions List with In-Row Model Dropdown */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredQuestions.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No questions match the current filter.
                  </div>
                ) : (
                  filteredQuestions.map((item, idx) => {
                    const isSelected = item.query.trim().toLowerCase() === activeQuestion.trim().toLowerCase();
                    const rowModel = selectedModelsByQuery[item.query] || 'gpt-6-astra';
                    const evalMatch = findEvalForQuestionAndModel(item.query, rowModel);

                    const confPct = evalMatch ? Math.round((evalMatch.confidence_score || 0) * 100) : null;

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => {
                          setSelectedQueryText(item.query);
                          localStorage.setItem('v2_selected_query', item.query);
                        }}
                        style={{
                          minHeight: '52px',
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--border-hairline)',
                          backgroundColor: isSelected ? 'var(--intent-primary-subtle)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--intent-primary)' : '3px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        {/* Line 1: Document Name + IN-LIST Model Dropdown + Evaluation Status Pill */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isSelected ? 'var(--intent-primary)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '135px'
                            }}
                            title={item.doc}
                          >
                            {item.doc}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {/* MODEL DROPDOWN IN THE LIST ITSELF */}
                            <select
                              value={rowModel}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const nextModel = e.target.value;
                                setSelectedModelsByQuery((prev) => ({
                                  ...prev,
                                  [item.query]: nextModel
                                }));
                                setSelectedQueryText(item.query);
                                localStorage.setItem('v2_selected_query', item.query);
                              }}
                              style={{
                                height: '22px',
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--intent-primary-border)',
                                borderRadius: '3px',
                                color: 'var(--intent-primary)',
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '0 4px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              {AVAILABLE_MODELS.map((m) => {
                                const hasResult = Boolean(findEvalForQuestionAndModel(item.query, m));
                                return (
                                  <option key={m} value={m}>
                                    {m} {hasResult ? '✓' : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {/* Confidence Score (Semantic Green/Amber/Red) or Pending Badge */}
                            {evalMatch ? (
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  minWidth: '38px',
                                  textAlign: 'center',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  color: getScoreColor(confPct),
                                  backgroundColor: getScoreBg(confPct),
                                  border: `1px solid ${getScoreBorder(confPct)}`
                                }}
                              >
                                {confPct}%
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--surface-base)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-subtle)',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Not Run
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Line 2: Full Question Snippet */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={item.query}
                        >
                          {item.query}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ── INTERACTIVE 5PX SPLITTER (§4 / §10: PANE-SPLITTER) ─────────── */}
            <div
              className="pane-splitter"
              onMouseDown={() => setIsDraggingP2(true)}
              title="Drag to resize Panel 2 and Panel 3 (300px - 600px)"
              style={{
                width: '5px',
                minWidth: '5px',
                cursor: 'col-resize',
                backgroundColor: isDraggingP2 ? 'var(--intent-primary)' : 'transparent',
                borderRight: '1px solid var(--border-hairline)',
                zIndex: 10
              }}
            />

            {/* ── PANEL 3: DETAIL & RUN ACTION VIEW (NO FOOTER BAR) ───────────── */}
            <main
              style={{
                flex: 1,
                backgroundColor: 'var(--surface-panel3)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                minWidth: '480px'
              }}
            >
              {activeEval ? (
                /* STATE 1: EVALUATION ALREADY RUN FOR (activeQuestion, activeModel) */
                <>
                  {/* Top Dossier Toolbar */}
                  <div
                    style={{
                      height: '42px',
                      padding: '0 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-hairline)',
                      backgroundColor: 'var(--surface-base)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Evaluation Dossier #{activeEval.id}
                      </span>
                      <button
                        onClick={() => handleCopy(activeEval.id, 'Evaluation ID')}
                        title="Copy Evaluation ID"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--intent-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px 4px'
                        }}
                      >
                        <Copy size={12} color="var(--intent-primary)" />
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {activeEval.created_at ? new Date(activeEval.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'Recorded'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--intent-primary-subtle)',
                          color: 'var(--intent-primary)',
                          border: '1px solid var(--intent-primary-border)'
                        }}
                      >
                        {activeEval.model_id}
                      </span>

                      {/* Top-K Chunks Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Chunks:</span>
                        <select
                          value={topK}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setTopK(val);
                            localStorage.setItem('v2_top_k', String(val));
                          }}
                          style={{
                            height: '22px',
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: '3px',
                            color: 'var(--intent-primary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '0 4px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                          title="Retrieval Chunk Depth"
                        >
                          <option value={4}>4 Chunks</option>
                          <option value={8}>8 Chunks (Default)</option>
                          <option value={12}>12 Chunks (Deep)</option>
                          <option value={16}>16 Chunks (Broad)</option>
                          <option value={20}>20 Chunks (Comprehensive)</option>
                        </select>
                      </div>

                      {/* Quick Re-evaluate Button */}
                      <button
                        onClick={() => handleRunSpecificEvaluation(activeQuestion, activeModel, null, topK)}
                        disabled={isQuerying}
                        title="Re-run evaluation with current model and chunk depth"
                        style={{
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: 'var(--intent-primary-subtle)',
                          color: 'var(--intent-primary)',
                          border: '1px solid var(--intent-primary-border)',
                          cursor: isQuerying ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={11} className={isQuerying ? 'animate-spin' : ''} />
                        Re-evaluate
                      </button>

                      {activeEval.latency_ms && (
                        <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {activeEval.latency_ms} ms
                        </span>
                      )}

                      <a
                        href="http://localhost:3000"
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Grafana"
                        style={{
                          color: 'var(--intent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          textDecoration: 'none',
                          marginLeft: '4px'
                        }}
                      >
                        <ExternalLink size={12} color="var(--intent-primary)" /> Grafana
                      </a>
                    </div>
                  </div>

                  {/* Four-Gauge Metrics Strip with Semantic Multi-Color Percentages */}
                  {(() => {
                    const compPct = Math.round((activeEval.confidence_score || 0) * 100);
                    const faithPct = Math.round((activeEval.faithfulness_score || 0) * 100);
                    const ctxPct = Math.round((activeEval.context_relevance_score || 0) * 100);
                    const ansPct = Math.round((activeEval.answer_relevance_score || 0) * 100);

                    return (
                      <div
                        style={{
                          padding: '14px 20px',
                          backgroundColor: 'var(--surface-base)',
                          borderBottom: '1px solid var(--border-hairline)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '12px'
                        }}
                      >
                        {/* Gauge 1: Composite Confidence */}
                        <div style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Composite Confidence
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: getScoreColor(compPct) }}>
                              {compPct}%
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                color: getScoreColor(compPct),
                                backgroundColor: getScoreBg(compPct),
                                border: `1px solid ${getScoreBorder(compPct)}`
                              }}
                            >
                              {activeEval.verdict}
                            </span>
                          </div>
                          <div style={{ marginTop: '8px', height: '4px', width: '100%', backgroundColor: 'var(--surface-panel1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${compPct}%`, backgroundColor: getScoreColor(compPct), borderRadius: '2px' }} />
                          </div>
                        </div>

                        {/* Gauge 2: Faithfulness */}
                        <div style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Faithfulness (Grounded)
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: getScoreColor(faithPct) }}>
                              {faithPct}%
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Grounded against context</span>
                          </div>
                          <div style={{ marginTop: '8px', height: '4px', width: '100%', backgroundColor: 'var(--surface-panel1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${faithPct}%`, backgroundColor: getScoreColor(faithPct), borderRadius: '2px' }} />
                          </div>
                        </div>

                        {/* Gauge 3: Context Relevance */}
                        <div style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Context Relevance
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: getScoreColor(ctxPct) }}>
                              {ctxPct}%
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Retrieval signal-to-noise</span>
                          </div>
                          <div style={{ marginTop: '8px', height: '4px', width: '100%', backgroundColor: 'var(--surface-panel1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${ctxPct}%`, backgroundColor: getScoreColor(ctxPct), borderRadius: '2px' }} />
                          </div>
                        </div>

                        {/* Gauge 4: Answer Relevancy */}
                        <div style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Answer Relevancy
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: getScoreColor(ansPct) }}>
                              {ansPct}%
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Intent satisfaction</span>
                          </div>
                          <div style={{ marginTop: '8px', height: '4px', width: '100%', backgroundColor: 'var(--surface-panel1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${ansPct}%`, backgroundColor: getScoreColor(ansPct), borderRadius: '2px' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabs Strip */}
                  <div
                    style={{
                      height: '34px',
                            padding: '0 20px',
                            backgroundColor: 'var(--surface-base)',
                            borderBottom: '1px solid var(--border-hairline)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {[
                            ...(comparisonData ? [{ id: 'comparison', label: '⚔️ Dual RAG Comparison' }] : []),
                            { id: 'overview', label: 'Response & Evidence' },
                            { id: 'claims', label: `Atomic Claims (${activeEval.claims_analysis?.length || 0})` },
                            { id: 'contexts', label: `Retrieved Chunks (${activeEval.retrieved_contexts?.length || 0})` }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setActiveTab(t.id)}
                              style={{
                                height: '24px',
                                padding: '0 10px',
                                fontSize: '11px',
                                fontWeight: currentTab === t.id ? 600 : 400,
                                backgroundColor: currentTab === t.id ? 'var(--intent-primary-subtle)' : 'transparent',
                                color: currentTab === t.id ? 'var(--intent-primary)' : 'var(--text-muted)',
                                border: currentTab === t.id ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Scrollable Tab Content Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                          {currentTab === 'comparison' && comparisonData && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* 1. Winner Banner */}
                              <div
                                style={{
                                  backgroundColor:
                                    comparisonData.winner === 'Evaluation Console'
                                      ? 'rgba(37, 99, 235, 0.08)'
                                      : comparisonData.winner === 'Cloud RAG - RAGFlow'
                                      ? 'rgba(16, 185, 129, 0.08)'
                                      : 'rgba(217, 119, 6, 0.08)',
                                  border: `1.5px solid ${
                                    comparisonData.winner === 'Evaluation Console'
                                      ? '#2563eb'
                                      : comparisonData.winner === 'Cloud RAG - RAGFlow'
                                      ? '#10b981'
                                      : '#d97706'
                                  }`,
                                  borderRadius: '6px',
                                  padding: '14px 18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      backgroundColor:
                                        comparisonData.winner === 'Evaluation Console'
                                          ? '#2563eb'
                                          : comparisonData.winner === 'Cloud RAG - RAGFlow'
                                          ? '#10b981'
                                          : '#d97706',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '18px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                    }}
                                  >
                                    🏆
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                                      GPT-6.2 Sol Benchmark Verdict
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                      WINNER: {comparisonData.winner.toUpperCase()}
                                    </div>
                                  </div>
                                </div>

                                {/* Head-to-Head Scores */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '4px', backgroundColor: 'var(--surface-card)', border: '1px solid #2563eb' }}>
                                    <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>EVAL CONSOLE</div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                      {comparisonData.scoreA} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 10</span>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>VS</span>
                                  <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '4px', backgroundColor: 'var(--surface-card)', border: '1px solid #10b981' }}>
                                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>CLOUD RAG</div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                      {comparisonData.scoreB} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 10</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Benchmark Query Box */}
                              <div
                                style={{
                                  backgroundColor: 'var(--surface-card)',
                                  border: '1px solid var(--border-subtle)',
                                  borderLeft: '4px solid var(--intent-primary)',
                                  borderRadius: '4px',
                                  padding: '12px 16px'
                                }}
                              >
                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--intent-primary)', marginBottom: '4px' }}>
                                  Philosophical Inquiry
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                  {activeEval.query}
                                </div>
                              </div>

                              {/* 2. Side-by-Side Dual Answer Columns */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {/* System A Card */}
                                <div
                                  style={{
                                    backgroundColor: 'var(--surface-card)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'rgba(37, 99, 235, 0.06)',
                                      borderBottom: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px' }}>🏛️</span>
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>Evaluation Console</span>
                                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-hairline)', color: 'var(--text-muted)' }}>
                                        Local pgvector
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCopy(comparisonData.ansA, 'System A answer')}
                                      style={{
                                        height: '22px',
                                        padding: '0 6px',
                                        backgroundColor: 'var(--surface-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '3px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px'
                                      }}
                                    >
                                      <Copy size={10} /> Copy
                                    </button>
                                  </div>
                                  <div style={{ padding: '14px', fontSize: '12px', lineHeight: 1.6, overflowY: 'auto', maxHeight: '450px' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                      {comparisonData.ansA || 'No response generated'}
                                    </ReactMarkdown>
                                  </div>
                                </div>

                                {/* System B Card */}
                                <div
                                  style={{
                                    backgroundColor: 'var(--surface-card)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.06)',
                                      borderBottom: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px' }}>☁️</span>
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Cloud RAG - RAGFlow</span>
                                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-hairline)', color: 'var(--text-muted)' }}>
                                        Cloud Vector Store
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCopy(comparisonData.ansB, 'System B answer')}
                                      style={{
                                        height: '22px',
                                        padding: '0 6px',
                                        backgroundColor: 'var(--surface-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '3px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px'
                                      }}
                                    >
                                      <Copy size={10} /> Copy
                                    </button>
                                  </div>
                                  <div style={{ padding: '14px', fontSize: '12px', lineHeight: 1.6, overflowY: 'auto', maxHeight: '450px' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                      {comparisonData.ansB || 'No response generated'}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Judge Critique Box */}
                              <div
                                style={{
                                  backgroundColor: 'var(--surface-card)',
                                  border: '1px solid var(--border-subtle)',
                                  borderLeft: '4px solid #7c2d12',
                                  borderRadius: '4px',
                                  padding: '14px 18px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '14px' }}>⚖️</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    GPT-6.2 Sol Impartial Judge Analysis & Critique
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                  {comparisonData.reasoning}
                                </div>
                              </div>
                            </div>
                          )}

                          {currentTab === 'overview' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Benchmark Query Box */}
                        <div
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--border-subtle)',
                            borderLeft: '4px solid var(--intent-primary)',
                            borderRadius: '4px',
                            padding: '12px 16px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--intent-primary)' }}>
                              Benchmark Query
                            </div>
                            <button
                              onClick={() => handleCopy(activeEval.query, 'Query text')}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px'
                              }}
                            >
                              <Copy size={11} /> Copy Query
                            </button>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            {activeEval.query}
                          </div>
                        </div>

                        {/* Neat Executive Grounded Model Output View */}
                        <div className="grounded-output-container">
                          {/* Executive Header Toolbar */}
                          <div className="grounded-output-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--intent-primary-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Sparkles size={13} color="var(--intent-primary)" />
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Grounded Model Output
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '1px 7px',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--intent-primary-subtle)',
                                  color: 'var(--intent-primary)',
                                  border: '1px solid var(--intent-primary-border)'
                                }}
                              >
                                {activeEval.model_id}
                              </span>
                              {activeEval.faithfulness_score >= 0.85 ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    color: 'var(--intent-success)',
                                    backgroundColor: 'var(--intent-success-subtle)',
                                    border: '1px solid var(--intent-success-border)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <CheckCircle2 size={11} /> 100% Grounded
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    color: 'var(--intent-warning)',
                                    backgroundColor: 'var(--intent-warning-subtle)',
                                    border: '1px solid var(--intent-warning-border)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <AlertTriangle size={11} /> Review Needed
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Source: <strong style={{ color: 'var(--text-primary)' }}>{activeEval.document_name}</strong>
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {activeEval.response ? `${activeEval.response.trim().split(/\s+/).length} words` : ''}
                              </span>
                              <button
                                onClick={() => handleCopy(activeEval.response, 'Response text')}
                                style={{
                                  height: '24px',
                                  padding: '0 8px',
                                  backgroundColor: 'var(--surface-card)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '3px',
                                  color: 'var(--intent-primary)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}
                              >
                                <Copy size={11} color="var(--intent-primary)" /> Copy Output
                              </button>
                            </div>
                          </div>

                          {/* Rendered Markdown Body */}
                          <div className="grounded-output-content">
                            <div className="markdown-answer-body">
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {formatGroundedMarkdown(activeEval.response)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'claims' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Deconstructed atomic claims extracted by the Goldfish Evaluator ({activeEval.claims_analysis?.length || 0} claims):
                        </div>

                        {activeEval.claims_analysis && activeEval.claims_analysis.length > 0 ? (
                          activeEval.claims_analysis.map((c, i) => {
                            const isSupp = Boolean(c.is_supported);
                            const claimColor = isSupp ? 'var(--intent-success)' : 'var(--intent-danger)';
                            const claimBg = isSupp ? 'var(--intent-success-subtle)' : 'var(--intent-danger-subtle)';
                            const claimBorder = isSupp ? 'var(--intent-success-border)' : 'var(--intent-danger-border)';

                            return (
                              <div
                                key={i}
                                style={{
                                  backgroundColor: 'var(--surface-card)',
                                  border: '1px solid var(--border-subtle)',
                                  borderLeft: `3px solid ${claimColor}`,
                                  borderRadius: '3px',
                                  padding: '10px 12px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Claim #{i + 1}: {c.claim}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      color: claimColor,
                                      backgroundColor: claimBg,
                                      border: `1px solid ${claimBorder}`
                                    }}
                                  >
                                    {isSupp ? '✓ SUPPORTED' : '✗ UNSUPPORTED'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  <strong style={{ color: claimColor }}>Reasoning:</strong> {c.reasoning}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Zero unsupported claims. All micro-facts verified.
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'contexts' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Retrieved <strong style={{ color: 'var(--intent-primary)' }}>{activeEval.retrieved_contexts?.length || 0}</strong> context chunks from <strong style={{ color: 'var(--intent-primary)' }}>{activeEval.document_name}</strong>:
                        </div>

                        {activeEval.retrieved_contexts && activeEval.retrieved_contexts.map((ctx, i) => {
                          const chunkText = typeof ctx === 'string' ? ctx : (ctx.chunk_text || ctx.content || JSON.stringify(ctx));
                          const sourceDoc = (typeof ctx === 'object' && ctx.document_name) ? ctx.document_name : null;
                          const simScore = (typeof ctx === 'object' && ctx.similarity_score) ? ctx.similarity_score : null;

                          return (
                            <div
                              key={i}
                              style={{
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '3px',
                                padding: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                                  CONTEXT CHUNK {i + 1}
                                </div>
                                {(sourceDoc || simScore) && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    {sourceDoc && <span>{sourceDoc} </span>}
                                    {simScore && <span style={{ fontFamily: 'monospace' }}>({(simScore * 100).toFixed(1)}%)</span>}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                                {chunkText}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* STATE 2: EVALUATION NOT RUN YET FOR (activeQuestion, activeModel)
                   --> Clean, centered Run Action right in the middle of 3rd pane */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px' }}>
                  <div
                    style={{
                      maxWidth: '520px',
                      width: '100%',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 4px 16px rgba(0, 120, 212, 0.08)'
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '23px',
                        backgroundColor: 'var(--intent-primary-subtle)',
                        color: 'var(--intent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Sparkles size={22} color="var(--intent-primary)" />
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Evaluation Ready
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Ready to run RAG retrieval and Goldfish evaluation with model <strong style={{ color: 'var(--intent-primary)' }}>{activeModel}</strong>.
                      </div>
                    </div>

                    {/* Query Box */}
                    <div
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--surface-base)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--intent-primary)', marginBottom: '4px' }}>
                        Question:
                      </div>
                      {activeQuestion}
                    </div>

                    {/* Retrieval Depth Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Retrieval Depth:</span>
                      <select
                        value={topK}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setTopK(val);
                          localStorage.setItem('v2_top_k', String(val));
                        }}
                        style={{
                          height: '28px',
                          backgroundColor: 'var(--surface-base)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: '4px',
                          color: 'var(--intent-primary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '0 8px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={4}>4 Chunks (Fast)</option>
                        <option value={8}>8 Chunks (Recommended)</option>
                        <option value={12}>12 Chunks (Deep)</option>
                        <option value={16}>16 Chunks (Broad)</option>
                        <option value={20}>20 Chunks (Comprehensive)</option>
                      </select>
                    </div>

                    {/* Middle Run Button (Electric Blue) */}
                    <button
                      className="btn-electric"
                      onClick={() => handleRunSpecificEvaluation(activeQuestion, activeModel, null, topK)}
                      disabled={isQuerying}
                      style={{
                        height: '40px',
                        padding: '0 26px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isQuerying ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {isQuerying ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Evaluating with {activeModel}...
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="#ffffff" />
                          Run Evaluation with {activeModel}
                        </>
                      )}
                    </button>

                    {isQuerying && (
                      <div style={{ fontSize: '11px', color: 'var(--intent-primary)' }}>
                        Retrieving chunks from pgvector & auditing via Goldfish Evaluator...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </>
        )}

        {/* ── DESTINATION 2: DATABASE EXPLORER VIEW (PostgreSQL Live) ──────────── */}
        {activeDestination === 'database' && (
          <>
            {/* Panel 2: Table Selector (Resizable) */}
            <section
              style={{
                width: `${panel2Width}px`,
                minWidth: '300px',
                maxWidth: '600px',
                backgroundColor: 'var(--surface-panel2)',
                borderRight: '1px solid var(--border-hairline)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <div
                style={{
                  height: '38px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-hairline)'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--intent-primary)' }}>
                  PostgreSQL Tables ({dbTables.length})
                </div>
                <button
                  onClick={() => { fetchDbOverview(); fetchDbTableData(selectedDbTable, 0); }}
                  title="Refresh Database View"
                  style={{
                    height: '24px',
                    width: '24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--intent-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RefreshCw size={12} color="var(--intent-primary)" className={isDbLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {dbTables.map((t) => {
                  const isSelected = t.table === selectedDbTable;
                  return (
                    <div
                      key={t.table}
                      onClick={() => {
                        setSelectedDbTable(t.table);
                        fetchDbTableData(t.table, 0);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-hairline)',
                        backgroundColor: isSelected ? 'var(--intent-primary-subtle)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--intent-primary)' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TableIcon size={14} color="var(--intent-primary)" />
                        <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--intent-primary)' : 'var(--text-primary)' }}>
                          {t.table}
                        </span>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'var(--intent-primary-subtle)', color: 'var(--intent-primary)' }}>
                        {t.row_count} rows
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Splitter 2 */}
            <div
              className="pane-splitter"
              onMouseDown={() => setIsDraggingP2(true)}
              title="Drag to resize panels"
              style={{
                width: '5px',
                minWidth: '5px',
                cursor: 'col-resize',
                backgroundColor: isDraggingP2 ? 'var(--intent-primary)' : 'transparent',
                borderRight: '1px solid var(--border-hairline)',
                zIndex: 10
              }}
            />

            {/* Panel 3: Live Table Grid with Accessible Corner Scrollbars */}
            <main
              style={{
                flex: 1,
                backgroundColor: 'var(--surface-panel3)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                minWidth: '480px'
              }}
            >
              {/* Table Toolbar */}
              <div
                style={{
                  height: '42px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--surface-base)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Table: {selectedDbTable}
                  </span>
                  <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({dbTableData.total} records in PostgreSQL)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--intent-primary)', backgroundColor: 'var(--intent-primary-subtle)', padding: '2px 8px', borderRadius: '3px', border: '1px solid var(--intent-primary-border)' }}>
                    Scrollbars enabled at corners (Horizontal & Vertical)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search loaded rows..."
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    style={{
                      height: '26px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '3px',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      padding: '0 8px',
                      outline: 'none',
                      width: '140px'
                    }}
                  />

                  {/* Previous 50 Button */}
                  <button
                    className={dbPageOffset > 0 ? "btn-electric" : ""}
                    onClick={() => {
                      const nextOffset = Math.max(0, dbPageOffset - 50);
                      fetchDbTableData(selectedDbTable, nextOffset);
                    }}
                    disabled={dbPageOffset <= 0 || isDbLoading}
                    title={dbPageOffset <= 0 ? 'Already at first page' : `Load rows ${Math.max(1, dbPageOffset - 49)}–${dbPageOffset}`}
                    style={{
                      height: '26px',
                      padding: '0 9px',
                      backgroundColor: dbPageOffset > 0 ? 'var(--electric-blue)' : 'var(--surface-card)',
                      border: dbPageOffset > 0 ? 'none' : '1px solid var(--border-subtle)',
                      borderRadius: '3px',
                      color: dbPageOffset > 0 ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: dbPageOffset <= 0 || isDbLoading ? 'not-allowed' : 'pointer',
                      opacity: dbPageOffset <= 0 ? 0.45 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <ChevronLeft size={13} /> Prev 50
                  </button>

                  {/* High-Visibility Page / Record Count Indicator */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '3px',
                      height: '26px'
                    }}
                  >
                    {isDbLoading ? (
                      <RefreshCw size={11} className="animate-spin" color="var(--intent-primary)" />
                    ) : null}
                    <span className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dbTableData.total > 0 ? `${dbPageOffset + 1}–${Math.min(dbPageOffset + 50, dbTableData.total)}` : '0'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      of {dbTableData.total}
                    </span>
                  </div>

                  {/* Next 50 Button */}
                  <button
                    className={dbPageOffset + 50 < dbTableData.total ? "btn-electric" : ""}
                    onClick={() => {
                      const nextOffset = dbPageOffset + 50;
                      fetchDbTableData(selectedDbTable, nextOffset);
                    }}
                    disabled={dbPageOffset + 50 >= dbTableData.total || isDbLoading}
                    title={dbPageOffset + 50 >= dbTableData.total ? 'Already at last page' : `Load rows ${dbPageOffset + 51}–${Math.min(dbPageOffset + 100, dbTableData.total)}`}
                    style={{
                      height: '26px',
                      padding: '0 9px',
                      backgroundColor: dbPageOffset + 50 < dbTableData.total ? 'var(--electric-blue)' : 'var(--surface-card)',
                      border: dbPageOffset + 50 < dbTableData.total ? 'none' : '1px solid var(--border-subtle)',
                      borderRadius: '3px',
                      color: dbPageOffset + 50 < dbTableData.total ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: dbPageOffset + 50 >= dbTableData.total || isDbLoading ? 'not-allowed' : 'pointer',
                      opacity: dbPageOffset + 50 >= dbTableData.total ? 0.45 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    Next 50 <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* 2D Scrollable Grid Area (Equipped with high-accessibility scrollbars and corner controllers) */}
              <div
                className="db-table-scroll-container"
                style={{
                  flex: 1,
                  overflowX: 'scroll',
                  overflowY: 'scroll',
                  position: 'relative'
                }}
              >
                {dbTableData.rows && dbTableData.rows.length > 0 ? (
                  <table
                    style={{
                      minWidth: '100%',
                      width: 'max-content',
                      borderCollapse: 'collapse',
                      fontSize: '11px',
                      textAlign: 'left'
                    }}
                  >
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'var(--surface-card)' }}>
                        {Object.keys(dbTableData.rows[0]).map((col) => (
                          <th
                            key={col}
                            style={{
                              padding: '10px 14px',
                              fontWeight: 700,
                              color: 'var(--intent-primary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                              borderBottom: '2px solid var(--intent-primary-border)',
                              borderRight: '1px solid var(--border-hairline)',
                              backgroundColor: 'var(--surface-card)'
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dbTableData.rows
                        .filter((r) => {
                          if (!dbSearchQuery) return true;
                          const str = JSON.stringify(r).toLowerCase();
                          return str.includes(dbSearchQuery.toLowerCase());
                        })
                        .map((row, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setDbSelectedRow(row)}
                            title="Click row to inspect full JSON payload"
                            style={{
                              borderBottom: '1px solid var(--border-hairline)',
                              cursor: 'pointer',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0, 120, 212, 0.02)'
                            }}
                          >
                            {Object.entries(row).map(([k, val], cidx) => {
                              const rendered = typeof val === 'object' ? JSON.stringify(val) : String(val);
                              return (
                                <td
                                  key={cidx}
                                  style={{
                                    padding: '8px 14px',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '420px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    borderRight: '1px solid var(--border-hairline)'
                                  }}
                                >
                                  {rendered}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No rows found in {selectedDbTable}.
                  </div>
                )}
              </div>
            </main>
          </>
        )}

        {/* ── DESTINATION 3: INGESTED DOCUMENTS VIEWER (IN-PANE PREVIEW, NO DOWNLOAD) ─ */}
        {activeDestination === 'docs' && (
          <>
            {/* Panel 2: Ingested Documents List (Resizable) */}
            <section
              style={{
                width: `${panel2Width}px`,
                minWidth: '300px',
                maxWidth: '600px',
                backgroundColor: 'var(--surface-panel2)',
                borderRight: '1px solid var(--border-hairline)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <div
                style={{
                  height: '38px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-hairline)'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--intent-primary)' }}>
                  Ingested Documents ({documentsList.length})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn-electric"
                    onClick={() => {
                      setIngestMode('upload');
                      setIsIngestModalOpen(true);
                    }}
                    title="Upload New Document"
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={11} strokeWidth={2.5} /> Ingest
                  </button>
                  <button
                    onClick={fetchDocuments}
                    title="Refresh list"
                    style={{ background: 'transparent', border: 'none', color: 'var(--intent-primary)', cursor: 'pointer' }}
                  >
                    <RefreshCw size={12} color="var(--intent-primary)" />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {documentsList.map((doc, idx) => {
                  const isSelected = doc.document_name === selectedDocName;
                  const ext = (doc.document_name.split('.').pop() || '').toLowerCase();
                  const isPdf = ext === 'pdf';
                  const isDocx = ext === 'docx';
                  const badgeClass = isPdf ? 'badge-pdf' : isDocx ? 'badge-docx' : 'badge-txt';

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDocName(doc.document_name);
                        localStorage.setItem('v2_selected_doc', doc.document_name);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-hairline)',
                        backgroundColor: isSelected ? 'var(--intent-primary-subtle)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--intent-primary)' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span
                          className={badgeClass}
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                            flexShrink: 0
                          }}
                        >
                          {ext}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'var(--intent-primary)' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {doc.document_name}
                        </span>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'var(--surface-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                        {doc.chunk_count} chunks
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Splitter 2 */}
            <div
              className="pane-splitter"
              onMouseDown={() => setIsDraggingP2(true)}
              title="Drag to resize panels"
              style={{
                width: '5px',
                minWidth: '5px',
                cursor: 'col-resize',
                backgroundColor: isDraggingP2 ? 'var(--intent-primary)' : 'transparent',
                borderRight: '1px solid var(--border-hairline)',
                zIndex: 10
              }}
            />

            {/* Panel 3: In-Pane Document Viewer (Direct PDF Preview, No Download) */}
            <main
              style={{
                flex: 1,
                backgroundColor: 'var(--surface-panel3)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                minWidth: '480px'
              }}
            >
              {selectedDocContent ? (
                <>
                  {/* Document Header Toolbar (No download button, pure preview tabs) */}
                  <div
                    style={{
                      height: '42px',
                      padding: '0 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-hairline)',
                      backgroundColor: 'var(--surface-base)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedDocContent.document_name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--intent-primary-subtle)',
                          color: 'var(--intent-primary)',
                          border: '1px solid var(--intent-primary-border)'
                        }}
                      >
                        {selectedDocContent.extension.toUpperCase()}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {selectedDocContent.chunk_count} pgvector chunks indexed
                      </span>
                      {selectedDocContent.file_size > 0 && (
                        <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          • {(selectedDocContent.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* View Tabs */}
                      {selectedDocContent.is_pdf && (
                        <button
                          onClick={() => setDocViewerTab('preview')}
                          style={{
                            height: '24px',
                            padding: '0 10px',
                            fontSize: '11px',
                            fontWeight: docViewerTab === 'preview' ? 600 : 400,
                            backgroundColor: docViewerTab === 'preview' ? 'var(--intent-primary-subtle)' : 'transparent',
                            color: docViewerTab === 'preview' ? 'var(--intent-primary)' : 'var(--text-muted)',
                            border: docViewerTab === 'preview' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          PDF Preview
                        </button>
                      )}
                      <button
                        onClick={() => setDocViewerTab('chunks')}
                        style={{
                          height: '24px',
                          padding: '0 10px',
                          fontSize: '11px',
                          fontWeight: docViewerTab === 'chunks' ? 600 : 400,
                          backgroundColor: docViewerTab === 'chunks' ? 'var(--intent-primary-subtle)' : 'transparent',
                          color: docViewerTab === 'chunks' ? 'var(--intent-primary)' : 'var(--text-muted)',
                          border: docViewerTab === 'chunks' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Indexed Chunks ({selectedDocContent.chunk_count})
                      </button>
                      <button
                        onClick={() => setDocViewerTab('text')}
                        style={{
                          height: '24px',
                          padding: '0 10px',
                          fontSize: '11px',
                          fontWeight: docViewerTab === 'text' ? 600 : 400,
                          backgroundColor: docViewerTab === 'text' ? 'var(--intent-primary-subtle)' : 'transparent',
                          color: docViewerTab === 'text' ? 'var(--intent-primary)' : 'var(--text-muted)',
                          border: docViewerTab === 'text' ? '1px solid var(--intent-primary-border)' : '1px solid transparent',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Extracted Text
                      </button>
                    </div>
                  </div>

                  {/* Viewer Content Area (Direct in-pane PDF preview) */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      overflow: selectedDocContent.is_pdf && docViewerTab === 'preview' ? 'hidden' : 'auto',
                      padding: selectedDocContent.is_pdf && docViewerTab === 'preview' ? '0' : '20px'
                    }}
                  >
                    {isLoadingDocContent ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--intent-primary)' }}>
                        <RefreshCw size={18} className="animate-spin" color="var(--intent-primary)" />
                        <div style={{ marginTop: '8px' }}>Loading document content...</div>
                      </div>
                    ) : selectedDocContent.is_pdf && docViewerTab === 'preview' ? (
                      /* Live Direct In-Pane PDF Viewer (No Download) */
                      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
                        <object
                          data={`/api/documents/${encodeURIComponent(selectedDocContent.document_name)}/file#toolbar=1&navpanes=0`}
                          type="application/pdf"
                          style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '650px',
                            border: 'none',
                            display: 'block'
                          }}
                        >
                          <iframe
                            src={`/api/documents/${encodeURIComponent(selectedDocContent.document_name)}/file#toolbar=1&navpanes=0`}
                            title={selectedDocContent.document_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: '650px',
                              border: 'none'
                            }}
                          >
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              Inline PDF preview unavailable in browser.
                              <button onClick={() => setDocViewerTab('text')} className="btn-electric" style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '4px' }}>
                                View Extracted Text
                              </button>
                            </div>
                          </iframe>
                        </object>
                      </div>
                    ) : docViewerTab === 'chunks' ? (
                      /* Chunks Breakdown */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          These chunks are embedded with 1536-dimensional vectors and searched by the RAG retriever:
                        </div>
                        {selectedDocContent.chunks.map((chunk, i) => (
                          <div
                            key={i}
                            style={{
                              backgroundColor: 'var(--surface-card)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '4px',
                              padding: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                                Chunk #{chunk.chunk_index + 1}
                              </span>
                              <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {chunk.chunk_text.length} characters
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                              {chunk.chunk_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Extracted Full Text */
                      <div
                        style={{
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '18px',
                          fontSize: '12px',
                          lineHeight: 1.7,
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        {selectedDocContent.full_text || 'No text extracted for this document.'}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Select an ingested document from Panel 2 to inspect.
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: ADD NEW QUERY
          ───────────────────────────────────────────────────────────────────────────── */}
      {isAddQueryModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setIsAddQueryModalOpen(false)}
        >
          <div
            style={{
              width: '460px',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '20px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                Add New Evaluation Question
              </span>
              <button onClick={() => setIsAddQueryModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomQuery} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Question / Prompt:
                </label>
                <textarea
                  required
                  placeholder="e.g. What is the maximum daily per diem allowance for travel?"
                  value={newQueryInput}
                  onChange={(e) => setNewQueryInput(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '8px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Target Document Name (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. travel_per_diem_policy.pdf (leave empty to auto-match)"
                  value={newQueryDocInput}
                  onChange={(e) => setNewQueryDocInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '0 8px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Initial Model:
                </label>
                <select
                  value={newQueryModel}
                  onChange={(e) => setNewQueryModel(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '0 8px',
                    outline: 'none'
                  }}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddQueryModalOpen(false)}
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-electric"
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: INGEST DOCUMENT (FILE UPLOAD OR PASTE TEXT)
          (Choose from Server Docs removed as requested)
          ───────────────────────────────────────────────────────────────────────────── */}
      {isIngestModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setIsIngestModalOpen(false)}
        >
          <div
            style={{
              width: '500px',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '20px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                Ingest Document into RAG Knowledge Base
              </span>
              <button onClick={() => setIsIngestModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={16} />
              </button>
            </div>

            {/* Ingest Mode Tabs: File Upload vs Paste Text */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setIngestMode('upload')}
                style={{
                  flex: 1,
                  height: '28px',
                  backgroundColor: ingestMode === 'upload' ? 'var(--intent-primary-subtle)' : 'var(--surface-base)',
                  border: ingestMode === 'upload' ? '1px solid var(--intent-primary-border)' : '1px solid var(--border-subtle)',
                  borderRadius: '3px',
                  color: 'var(--intent-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Upload File (PDF, DOCX, TXT...)
              </button>
              <button
                type="button"
                onClick={() => setIngestMode('paste')}
                style={{
                  flex: 1,
                  height: '28px',
                  backgroundColor: ingestMode === 'paste' ? 'var(--intent-primary-subtle)' : 'var(--surface-base)',
                  border: ingestMode === 'paste' ? '1px solid var(--intent-primary-border)' : '1px solid var(--border-subtle)',
                  borderRadius: '3px',
                  color: ingestMode === 'paste' ? 'var(--intent-primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Paste Text
              </button>
            </div>

            <form onSubmit={handleIngestDocument} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ingestMode === 'upload' ? (
                /* OPTION 1: MULTIPART FILE UPLOAD (PDF, DOCX, TXT, MD, CSV) */
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Upload Document File (PDF, DOCX, TXT, MD, JSON, CSV):
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--intent-primary-border)',
                      borderRadius: '6px',
                      padding: '24px',
                      textAlign: 'center',
                      backgroundColor: 'var(--intent-primary-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Upload size={24} color="var(--intent-primary)" />
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--intent-primary)' }}>
                      {fileToUpload ? fileToUpload.name : 'Click or drag file here to upload'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {fileToUpload ? `${(fileToUpload.size / 1024).toFixed(1)} KB • Ready to embed` : 'Supported: .pdf, .docx, .txt, .md, .json, .csv'}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.docx,.txt,.md,.json,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileToUpload(e.target.files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                /* OPTION 2: PASTE RAW TEXT */
                <>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Document Filename:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. custom_security_addon.txt"
                      value={ingestFilename}
                      onChange={(e) => setIngestFilename(e.target.value)}
                      style={{
                        width: '100%',
                        height: '32px',
                        backgroundColor: 'var(--surface-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '0 8px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Document Content:
                    </label>
                    <textarea
                      required
                      placeholder="Paste document policy text, guidelines, or specs here..."
                      value={ingestContent}
                      onChange={(e) => setIngestContent(e.target.value)}
                      rows={5}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--surface-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '8px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting || (ingestMode === 'upload' && !fileToUpload)}
                  className="btn-electric"
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isIngesting ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  {isIngesting ? 'Chunking & Embedding...' : 'Ingest Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Row Inspector Modal for Database Explorer */}
      {dbSelectedRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setDbSelectedRow(null)}
        >
          <div
            style={{
              width: '640px',
              maxHeight: '80vh',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                PostgreSQL Row Record ({selectedDbTable})
              </span>
              <button onClick={() => setDbSelectedRow(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--surface-base)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
              <pre style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {JSON.stringify(dbSelectedRow, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Shared Transient Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--intent-primary-border)',
            color: 'var(--intent-primary)',
            padding: '8px 14px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0, 120, 212, 0.15)',
            zIndex: 1200
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
