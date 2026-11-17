import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Clock,
  Coins,
  ChevronDown,
  Layers,
  FileText,
  RefreshCw,
  Sparkles,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import { downloadMultiModelEvaluationPDF } from '../services/multiModelPdfGenerator';

export function MultiModelEvaluationModal({
  isOpen,
  onClose,
  activeSession,
  selectedTurn,
  recordings = [],
  panel2Model,
  showToast,
  theme,
  onOpenPromptEvals,
  onSpendUpdate,
}) {
  if (!isOpen) return null;

  // Track light/dark mode dynamically
  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    return theme || document.documentElement.getAttribute('data-theme') || 'dark';
  });

  useEffect(() => {
    if (theme) {
      setEffectiveTheme(theme);
    } else {
      const observer = new MutationObserver(() => {
        const t = document.documentElement.getAttribute('data-theme') || 'dark';
        setEffectiveTheme(t);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    }
  }, [theme]);

  const isLight = effectiveTheme === 'light';

  // Dynamic color palette tokens
  const t = {
    overlayBg: 'rgba(0, 0, 0, 0.65)',
    dialogBg: isLight ? '#ffffff' : '#0f172a',
    dialogText: isLight ? '#0f172a' : '#f8fafc',
    dialogBorder: isLight ? '#e2e8f0' : '#334155',
    headerBg: isLight ? '#f8fafc' : '#1e293b',
    headerBorder: isLight ? '#e2e8f0' : '#1e293b',
    cardBg: isLight ? '#f8fafc' : '#1e293b',
    cardBorder: isLight ? '#e2e8f0' : '#334155',
    cardSubtleBg: isLight ? '#ffffff' : '#0f172a',
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#94a3b8',
    textMuted: isLight ? '#94a3b8' : '#64748b',
    inputBg: isLight ? '#ffffff' : '#0f172a',
    inputBorder: isLight ? '#cbd5e1' : '#475569',
    tableHeaderBg: isLight ? '#f1f5f9' : '#1e293b',
    tableHeaderBorder: isLight ? '#e2e8f0' : '#334155',
    tableRowBorder: isLight ? '#f1f5f9' : '#1e293b',
    canvasBg: isLight ? '#ffffff' : '#0f172a',
    canvasBorder: isLight ? '#e2e8f0' : '#334155',
  };

  // Selected session & take state for Option 1
  const [selectedSessionId, setSelectedSessionId] = useState(
    activeSession?.session_id || (recordings[0]?.session_id ?? '')
  );
  const [selectedTakeIndex, setSelectedTakeIndex] = useState(0);
  const [promptText, setPromptText] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [referenceResponse, setReferenceResponse] = useState('');

  // Target models state (All 15 models + comparison baselines)
  const DEFAULT_MODELS = [
    // GPT-6 Tier
    { id: 'gpt-6-astra', label: 'gpt-6-astra', checked: true, tier: 'Astra Flagship ($10/$50)' },
    { id: 'gpt-6.1-sol', label: 'gpt-6.1-sol', checked: true, tier: 'Sol High-End ($2/$10)' },
    { id: 'gpt-6.1-terra', label: 'gpt-6.1-terra', checked: true, tier: 'Terra Balanced ($1/$5)' },
    { id: 'gpt-6-luna', label: 'gpt-6-luna', checked: true, tier: 'Luna High-Vol ($0.10/$0.50)' },
    { id: 'gpt-6-sol', label: 'gpt-6-sol', checked: false, tier: 'Sol Original ($2/$10)' },

    // GPT-5.6 Tier
    { id: 'gpt-5.6-sol', label: 'gpt-5.6-sol', checked: true, tier: 'Sol ($4/$20)' },
    { id: 'gpt-5.6-terra', label: 'gpt-5.6-terra', checked: false, tier: 'Terra ($2/$12)' },
    { id: 'gpt-5.6-luna', label: 'gpt-5.6-luna', checked: false, tier: 'Luna ($0.20/$1.20)' },

    // GPT-5.5, 5.4, 5.2 Tier
    { id: 'gpt-5.5', label: 'gpt-5.5', checked: true, tier: 'Flagship ($5/$30)' },
    { id: 'gpt-5.4', label: 'gpt-5.4', checked: true, tier: 'Flagship ($2.50/$15)' },
    { id: 'gpt-5.4-mini', label: 'gpt-5.4-mini', checked: true, tier: 'Mini ($0.75/$4.50)' },
    { id: 'gpt-5.2', label: 'gpt-5.2', checked: false, tier: 'Flagship ($1.75/$14)' },

    // Baseline Omni & Reasoning
    { id: 'gpt-4o', label: 'gpt-4o', checked: true, tier: 'Omni Flagship ($2.50/$10)' },
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini', checked: true, tier: 'Omni Mini ($0.15/$0.60)' },
    { id: 'o3-mini', label: 'o3-mini', checked: false, tier: 'Reasoning Fast ($1.10/$4.40)' },
    { id: 'o1', label: 'o1', checked: false, tier: 'Reasoning Flagship ($15/$60)' },
    { id: 'chatgpt-4o-latest', label: 'chatgpt-4o-latest', checked: false, tier: 'Dynamic Web ($5/$15)' },
    { id: 'gpt-4-turbo', label: 'gpt-4-turbo', checked: false, tier: 'GPT-4 Turbo ($10/$30)' },
  ];

  // Default initial judge model from Panel 2 / active session or gpt-6.1-sol
  const initialJudgeModel =
    panel2Model ||
    activeSession?.model ||
    (activeSession?.gpt5_run ? 'gpt-6-sol' : 'gpt-6.1-sol');

  const [selectedJudgeModel, setSelectedJudgeModel] = useState(initialJudgeModel);

  // Synchronize initial judge when session / panel2Model changes if user hasn't explicitly overridden
  useEffect(() => {
    if (panel2Model) {
      setSelectedJudgeModel(panel2Model);
    }
  }, [panel2Model]);

  const [selectedModels, setSelectedModels] = useState(
    DEFAULT_MODELS.reduce((acc, m) => ({ ...acc, [m.id]: m.checked }), {})
  );

  // Evaluation Run State & Live Per-Model Progress Tracking
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatingPhase, setEvaluatingPhase] = useState(''); // e.g. "Dispatching requests...", "Evaluating gpt-6-astra...", "Synthesizing Pareto analysis..."
  const [modelProgressMap, setModelProgressMap] = useState({}); // { [modelId]: 'pending' | 'evaluating' | 'completed' | 'error' }
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [evalData, setEvalData] = useState(null);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'graph' | 'specs'
  const canvasRef = useRef(null);

  // Sync selected session & take when opening modal or changing selection
  const currentSession =
    recordings.find((r) => r.session_id === selectedSessionId) || activeSession || recordings[0];
  const takes = currentSession?.takes || [];

  useEffect(() => {
    if (selectedTurn && takes.length > 0) {
      const idx = takes.findIndex((t) => t.turn_id === selectedTurn.turn_id || t.id === selectedTurn.id);
      if (idx !== -1) setSelectedTakeIndex(idx);
    }
  }, [selectedTurn, takes]);

  useEffect(() => {
    const currentTake = takes[selectedTakeIndex] || takes[0];
    if (currentTake) {
      const userMsg =
        currentTake.user_message ||
        currentTake.prompt ||
        currentTake.input ||
        currentTake.user_question ||
        '';
      setPromptText(userMsg);
      setDocumentText(currentTake.document_text || currentTake.context || '');
      setDocumentName(currentTake.document_name || currentTake.filename || '');
      setReferenceResponse(currentTake.assistant_response || currentTake.answer || currentTake.response || '');
    } else if (selectedTurn) {
      setPromptText(selectedTurn.user_message || selectedTurn.prompt || '');
      setReferenceResponse(selectedTurn.assistant_response || selectedTurn.answer || selectedTurn.response || '');
    }
  }, [selectedSessionId, selectedTakeIndex, takes, selectedTurn]);

  // Execute Evaluation across selected models with live per-model loading progress
  const handleRunEvaluation = async () => {
    if (!promptText.trim()) {
      if (showToast) showToast('Please provide a prompt to evaluate.', 'warning');
      return;
    }

    const modelIds = Object.keys(selectedModels).filter((k) => selectedModels[k]);
    if (modelIds.length === 0) {
      if (showToast) showToast('Please select at least one model to evaluate.', 'warning');
      return;
    }

    // Initialize progress map: all selected models start as 'evaluating'
    const initialProgress = {};
    modelIds.forEach((id) => {
      initialProgress[id] = 'evaluating';
    });
    setModelProgressMap(initialProgress);
    setIsEvaluating(true);
    setEvaluatingPhase(`Dispatching parallel evaluation requests to ${modelIds.length} models...`);

    try {
      if (showToast) showToast(`Running evaluation across ${modelIds.length} models with live progress...`);

      const currentTake = takes[selectedTakeIndex] || selectedTurn;
      const payloadBase = {
        user_message: promptText.trim(),
        document_text: documentText,
        document_name: documentName,
        reference_response: referenceResponse.trim(),
        judge_model: selectedJudgeModel,
        selected_take_info: {
          session_id: currentSession?.session_id,
          recording_title: currentSession?.recording_title || 'RECORDING',
          take_label: currentTake?.take_label || `TAKE #${selectedTakeIndex + 1}`,
          turn_id: currentTake?.turn_id,
        },
      };

      // Launch individual model evaluations concurrently to stream live per-model updates
      let completedCount = 0;
      const individualPromises = modelIds.map(async (mid) => {
        try {
          const res = await fetch('/api/single_model_eval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payloadBase,
              model_id: mid,
            }),
          });
          const data = await res.json();
          completedCount += 1;
          if (!res.ok || !data.result) {
            setModelProgressMap((prev) => ({ ...prev, [mid]: 'error' }));
            setEvaluatingPhase(`[${completedCount}/${modelIds.length}] ${mid} failed — awaiting remaining models...`);
            return null;
          }
          const isSuccess = data.result.status === 'success';
          setModelProgressMap((prev) => ({ ...prev, [mid]: isSuccess ? 'completed' : 'error' }));
          setEvaluatingPhase(`[${completedCount}/${modelIds.length}] ${mid} graded by ${selectedJudgeModel} (${data.result.quality_score || 0}%)`);
          return data.result;
        } catch (err) {
          console.error(`Error evaluating ${mid}:`, err);
          completedCount += 1;
          setModelProgressMap((prev) => ({ ...prev, [mid]: 'error' }));
          setEvaluatingPhase(`[${completedCount}/${modelIds.length}] Error connecting to ${mid}`);
          return null;
        }
      });

      // Wait for all individual model evaluations
      const individualResults = (await Promise.all(individualPromises)).filter(Boolean);

      setEvaluatingPhase(`Consolidating Pareto frontier & calculating optimal winner using ${selectedJudgeModel}...`);

      // Now fetch the authoritative multi-model aggregation / Pareto winner data
      const res = await fetch('/api/multi_model_eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadBase,
          models: modelIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded with ${res.status}`);

      setEvalData(data);
      const batchSpend = (data.results || []).reduce((acc, r) => acc + (r.total_cost || 0), 0);
      if (onSpendUpdate) onSpendUpdate(batchSpend);
      setEvaluatingPhase(`Complete! Evaluated ${modelIds.length} models.`);
      if (showToast) showToast(`Multi-model evaluation completed! Burned $${batchSpend.toFixed(5)} USD.`);
    } catch (err) {
      console.error('Multi-model evaluation error:', err);
      setEvaluatingPhase(`Evaluation failed: ${err.message}`);
      if (showToast) showToast(`Evaluation error: ${err.message}`, 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Render on-screen canvas graph when evalData or theme changes
  useEffect(() => {
    if (!evalData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fill background dynamically according to current theme
    ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const validModels = (evalData.results || []).filter((r) => r.status === 'success');
    if (validModels.length === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '13px sans-serif';
      ctx.fillText('No successful model responses to plot.', 20, 60);
      return;
    }

    const sorted = [...validModels].sort(
      (a, b) => a.total_cost - b.total_cost || a.quality_score - b.quality_score
    );
    const maxCost = Math.max(...sorted.map((m) => m.total_cost), 0.0001) * 1.15;
    const maxScore = 100;

    const pL = 70;
    const pR = 70;
    const pT = 35;
    const pB = 105; // ample space for rotated labels
    const cW = width - pL - pR;
    const cH = height - pT - pB;

    // Grid lines
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pT + (cH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pL, y);
      ctx.lineTo(pL + cW, y);
      ctx.stroke();

      // Score Y-label
      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}%`, pL - 8, y + 4);

      // Cost Y-label
      ctx.fillStyle = isLight ? '#b45309' : '#f59e0b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`$${((maxCost * (4 - i)) / 4).toFixed(5)}`, pL + cW + 8, y + 4);
    }

    // Points
    const pts = sorted.map((m, i) => {
      const x = sorted.length === 1 ? pL + cW / 2 : pL + (cW / (sorted.length - 1)) * i;
      const yScore = pT + cH - (m.quality_score / maxScore) * cH;
      const yCost = pT + cH - (m.total_cost / maxCost) * cH;
      return { m, x, yScore, yCost };
    });

    // Cost line (Amber)
    ctx.beginPath();
    ctx.strokeStyle = isLight ? '#d97706' : '#f59e0b';
    ctx.lineWidth = 2.5;
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.yCost) : ctx.lineTo(p.x, p.yCost)));
    ctx.stroke();

    // Quality line (Sky Blue)
    ctx.beginPath();
    ctx.strokeStyle = isLight ? '#0284c7' : '#38bdf8';
    ctx.lineWidth = 2.5;
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.yScore) : ctx.lineTo(p.x, p.yScore)));
    ctx.stroke();

    // Draw nodes & Rotated Non-Overlapping Labels
    pts.forEach((p, idx) => {
      // Quality node
      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.yScore, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cost node
      ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p.x, p.yCost, 5, 0, Math.PI * 2);
      ctx.fill();

      // Vertical tick mark
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, pT + cH);
      ctx.lineTo(p.x, pT + cH + 6);
      ctx.stroke();

      // Rotated X label at -38 degrees so all names display neatly without overlapping
      ctx.save();
      ctx.translate(p.x, pT + cH + 14);
      ctx.rotate(-Math.PI / 4.7);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.textAlign = 'right';
      ctx.fillText(`#${idx + 1} ${p.m.model_id}`, 0, 0);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.fillText(`${p.m.quality_score}% score`, 0, 12);

      ctx.fillStyle = isLight ? '#b45309' : '#f59e0b';
      ctx.fillText(`$${p.m.total_cost.toFixed(5)}`, 0, 23);

      ctx.restore();
    });

    // Sweet Spot
    const winnerId = evalData.winner?.model_id || sorted[0]?.model_id;
    const winnerPt = pts.find((p) => p.m.model_id === winnerId);
    if (winnerPt) {
      const midY = (winnerPt.yScore + winnerPt.yCost) / 2;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(winnerPt.x, winnerPt.yScore);
      ctx.lineTo(winnerPt.x, winnerPt.yCost);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(winnerPt.x, midY, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [evalData, activeTab, isLight]);

  const handleDownloadPDF = async () => {
    if (!evalData) return;
    try {
      setIsGeneratingPdf(true);
      if (showToast) showToast('Compiling and generating PDF report...');
      await downloadMultiModelEvaluationPDF(evalData);
      if (showToast) showToast('PDF report downloaded successfully!');
    } catch (err) {
      console.error('PDF error:', err);
      if (showToast) showToast(`Failed to export PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: t.overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          backgroundColor: t.dialogBg,
          color: t.dialogText,
          borderRadius: '12px',
          border: `1px solid ${t.dialogBorder}`,
          boxShadow: isLight
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${t.headerBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: t.headerBg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} style={{ color: 'var(--intent-primary)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: t.textPrimary }}>
                  Multi-Model Evaluation & Cost Analysis
                </h2>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--surface-muted)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                  }}
                  title="Select the LLM as Judge model for comparative grading"
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--intent-primary)' }}>
                    Judge:
                  </span>
                  <select
                    value={selectedJudgeModel}
                    onChange={(e) => setSelectedJudgeModel(e.target.value)}
                    disabled={isEvaluating}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: isEvaluating ? 'not-allowed' : 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    {DEFAULT_MODELS.map((m) => (
                      <option key={m.id} value={m.id} style={{ backgroundColor: t.dialogBg, color: t.textPrimary }}>
                        {m.label} ({m.tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: t.textSecondary }}>
                Empirical comparative grading across models via judge {selectedJudgeModel}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Options Bar (Option 1 Selection) */}
          <div
            style={{
              padding: '16px',
              backgroundColor: t.cardBg,
              borderRadius: '8px',
              border: `1px solid ${t.cardBorder}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: isLight ? '#0284c7' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} /> SOURCE: OPTION 1 (RECORDING & TAKE FROM VIEWPORT)
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>
                  Select Session / Recording
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value);
                    setSelectedTakeIndex(0);
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: t.inputBg,
                    color: t.textPrimary,
                    border: `1px solid ${t.inputBorder}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                >
                  {recordings.map((r, i) => (
                    <option key={r.session_id || i} value={r.session_id}>
                      {r.recording_title || `RECORDING ${i + 1}`} ({r.session_id}) • {r.takes?.length || 0} takes
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>
                  Select Specific Take
                </label>
                <select
                  value={selectedTakeIndex}
                  onChange={(e) => setSelectedTakeIndex(Number(e.target.value))}
                  disabled={takes.length === 0}
                  style={{
                    width: '100%',
                    backgroundColor: t.inputBg,
                    color: t.textPrimary,
                    border: `1px solid ${t.inputBorder}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                >
                  {takes.length === 0 ? (
                    <option value={0}>No takes recorded yet in this session</option>
                  ) : (
                    takes.map((tItem, i) => (
                      <option key={tItem.turn_id || i} value={i}>
                        {tItem.take_label || `TAKE #${i + 1}`} • {(tItem.user_message || tItem.prompt || '').substring(0, 45)}...
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Prompt View / Edit Box */}
            <div>
              <label style={{ fontSize: '11px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>
                Prompt to Evaluate Across Models:
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
                placeholder="Enter or review prompt text..."
                style={{
                  width: '100%',
                  backgroundColor: t.inputBg,
                  color: t.textPrimary,
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            {/* Target Models Checkboxes with Live Status Badges */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>
                  Included Models for Evaluation:
                </span>
                {isEvaluating && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--intent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} className="animate-spin" />
                    Live Evaluating (
                    {Object.values(modelProgressMap).filter((s) => s === 'completed').length}/
                    {Object.keys(modelProgressMap).length})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {DEFAULT_MODELS.map((m) => {
                  const isChecked = !!selectedModels[m.id];
                  const progressStatus = modelProgressMap[m.id]; // 'evaluating' | 'completed' | 'error' | undefined

                  return (
                    <label
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        backgroundColor: progressStatus === 'evaluating'
                          ? (isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.15)')
                          : progressStatus === 'completed'
                          ? (isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.15)')
                          : progressStatus === 'error'
                          ? (isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)')
                          : isChecked
                          ? (isLight ? '#eff6ff' : 'rgba(56, 189, 248, 0.1)')
                          : t.cardSubtleBg,
                        padding: '5px 10px',
                        borderRadius: '4px',
                        border: progressStatus === 'evaluating'
                          ? '1px solid #0284c7'
                          : progressStatus === 'completed'
                          ? '1px solid #16a34a'
                          : progressStatus === 'error'
                          ? '1px solid #dc2626'
                          : isChecked
                          ? (isLight ? '1px solid #3b82f6' : '1px solid #38bdf8')
                          : `1px solid ${t.cardBorder}`,
                        color: isChecked
                          ? (isLight ? '#1e3a8a' : '#f8fafc')
                          : t.textSecondary,
                        cursor: isEvaluating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isEvaluating}
                        onChange={(e) =>
                          setSelectedModels((prev) => ({ ...prev, [m.id]: e.target.checked }))
                        }
                      />
                      <span style={{ fontWeight: 600 }}>{m.id}</span>
                      <span style={{ fontSize: '9px', color: t.textMuted }}>({m.tier})</span>

                      {/* Live loading indicator badge per model */}
                      {progressStatus === 'evaluating' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#0284c7',
                            marginLeft: '4px',
                            fontWeight: 700,
                            fontSize: '10px',
                          }}
                        >
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Evaluating...</span>
                        </span>
                      )}
                      {progressStatus === 'completed' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#16a34a',
                            marginLeft: '4px',
                            fontWeight: 700,
                            fontSize: '10px',
                          }}
                        >
                          <CheckCircle2 size={11} />
                          <span>Done</span>
                        </span>
                      )}
                      {progressStatus === 'error' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#dc2626',
                            marginLeft: '4px',
                            fontWeight: 700,
                            fontSize: '10px',
                          }}
                        >
                          <AlertTriangle size={11} />
                          <span>Failed</span>
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Bar & Live Progress Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: `1px solid ${t.cardBorder}`,
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {/* Process acknowledgement banner / status line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '28px' }}>
                {isEvaluating ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.1)',
                      border: isLight ? '1px solid #bae6fd' : '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--intent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={13} className="animate-spin" />
                    <span>{evaluatingPhase || 'Evaluating models in parallel...'}</span>
                  </div>
                ) : evalData ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#16a34a',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Grading complete across {evalData.results?.length || 0} models by {selectedJudgeModel}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: t.textMuted }}>
                    Ready to compare {Object.values(selectedModels).filter(Boolean).length} models with {selectedJudgeModel} as Judge.
                  </div>
                )}
              </div>

              {/* Run Button with loading state */}
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isEvaluating ? 'var(--text-disabled)' : 'var(--intent-primary-solid)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  height: 'var(--control-height-md)',
                  padding: '0 var(--space-4)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isEvaluating ? 'not-allowed' : 'pointer',
                  boxShadow: 'none',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>
                      Evaluating ({Object.values(modelProgressMap).filter((s) => s === 'completed').length}/{Object.keys(modelProgressMap).length})...
                    </span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Run Multi-Model Evaluation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Display Area */}
          {evalData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Winner Announcement Banner */}
              {evalData.winner && (
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: isLight ? '#ecfdf5' : '#064e3b',
                    borderRadius: '8px',
                    border: '1.5px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={20} color="#10b981" />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: isLight ? '#065f46' : '#ecfdf5' }}>
                        WINNER MODEL: {evalData.winner.model_id.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          backgroundColor: isLight ? '#d1fae5' : '#047857',
                          color: isLight ? '#065f46' : '#a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Pareto Optimal Choice
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: isLight ? '#047857' : '#a7f3d0', marginTop: '4px' }}>
                      {evalData.intersection_point?.rationale}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: isLight ? '#065f46' : '#ecfdf5' }}>
                      Score: <strong>{evalData.winner.quality_score}%</strong> • Winner Cost:{' '}
                      <strong>${evalData.winner.total_cost.toFixed(5)}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                      💰 Total Benchmark Spend: ${evalData.results ? evalData.results.reduce((acc, r) => acc + (r.total_cost || 0), 0).toFixed(5) : '0.00000'} USD
                    </div>
                    <div style={{ fontSize: '10px', color: isLight ? '#059669' : '#6ee7b7' }}>Latency: {evalData.winner.latency}s</div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${t.headerBorder}`, paddingBottom: '8px' }}>
                <button
                  onClick={() => setActiveTab('results')}
                  style={{
                    background: activeTab === 'results' ? (isLight ? '#e2e8f0' : '#1e293b') : 'transparent',
                    border: 'none',
                    color: activeTab === 'results' ? (isLight ? '#0284c7' : '#38bdf8') : t.textSecondary,
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Model Results & Cost
                </button>
                <button
                  onClick={() => setActiveTab('graph')}
                  style={{
                    background: activeTab === 'graph' ? (isLight ? '#e2e8f0' : '#1e293b') : 'transparent',
                    border: 'none',
                    color: activeTab === 'graph' ? (isLight ? '#0284c7' : '#38bdf8') : t.textSecondary,
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Performance vs. Cost Graph
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  style={{
                    background: activeTab === 'specs' ? (isLight ? '#e2e8f0' : '#1e293b') : 'transparent',
                    border: 'none',
                    color: activeTab === 'specs' ? (isLight ? '#0284c7' : '#38bdf8') : t.textSecondary,
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Reference Pricing Table
                </button>

                {onOpenPromptEvals && (
                  <button
                    onClick={onOpenPromptEvals}
                    style={{
                      background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.1)',
                      border: isLight ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                      color: isLight ? '#0284c7' : '#38bdf8',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginLeft: 'auto',
                    }}
                    title="Switch to 10-System Prompts Benchmark view"
                  >
                    <Sparkles size={13} />
                    Prompt Evals (10 Prompts) →
                  </button>
                )}
              </div>

              {/* Tab 1: Results Table (Ascending by Price & Score) */}
              {activeTab === 'results' && (
                <div style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'auto', border: `1px solid ${t.tableHeaderBorder}`, borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: t.textSecondary, padding: '10px 12px 6px 12px' }}>
                    Models arranged in <strong>ascending order</strong> by turn cost ($) and response quality score (%) (scrollable)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                      <tr style={{ backgroundColor: t.tableHeaderBg, color: t.textSecondary, textAlign: 'left', borderBottom: `1px solid ${t.tableHeaderBorder}` }}>
                        <th style={{ padding: '10px 12px' }}>Rank & Model</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Latency</th>
                        <th style={{ padding: '10px 12px' }}>Tokens (In / Out)</th>
                        <th style={{ padding: '10px 12px' }}>Total Cost ($) ↑</th>
                        <th style={{ padding: '10px 12px' }}>
                          Quality Score ↑
                          <div style={{ fontSize: '9px', fontWeight: 500, color: isLight ? '#0284c7' : '#38bdf8' }}>
                            {selectedJudgeModel} Judge
                          </div>
                        </th>
                        <th style={{ padding: '10px 12px' }}>Answer Excerpt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...evalData.results]
                        .sort((a, b) => {
                          if (a.status === 'success' && b.status === 'success') {
                            return a.total_cost - b.total_cost || a.quality_score - b.quality_score;
                          }
                          if (a.status === 'success') return -1;
                          if (b.status === 'success') return 1;
                          return (a.input_price || 0) - (b.input_price || 0);
                        })
                        .map((r, i) => {
                          const isSuccess = r.status === 'success';
                          const isWinner = evalData.winner?.model_id === r.model_id;
                          return (
                            <tr
                              key={r.model_id || i}
                              style={{
                                borderBottom: `1px solid ${t.tableRowBorder}`,
                                backgroundColor: isWinner
                                  ? isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.08)'
                                  : 'transparent',
                              }}
                            >
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: t.textPrimary }}>
                                <span style={{ color: t.textMuted, marginRight: '6px' }}>#{i + 1}</span>
                                {r.model_id}
                                {isWinner && (
                                  <span
                                    style={{
                                      marginLeft: '6px',
                                      fontSize: '9px',
                                      backgroundColor: '#10b981',
                                      color: '#ffffff',
                                      padding: '1px 5px',
                                      borderRadius: '8px',
                                    }}
                                  >
                                    WINNER
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isSuccess
                                      ? isLight ? '#dcfce7' : '#064e3b'
                                      : isLight ? '#fee2e2' : '#450a0a',
                                    color: isSuccess
                                      ? isLight ? '#15803d' : '#34d399'
                                      : isLight ? '#b91c1c' : '#f87171',
                                    fontWeight: 600,
                                  }}
                                >
                                  {isSuccess ? 'Active' : r.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: t.textSecondary }}>
                                {isSuccess ? `${r.latency}s` : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', color: t.textSecondary }}>
                                {isSuccess ? `${r.prompt_tokens} / ${r.completion_tokens}` : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: isLight ? '#b45309' : '#f59e0b' }}>
                                {isSuccess ? `$${r.total_cost.toFixed(5)}` : '$0.00000'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700, color: isLight ? '#0284c7' : '#38bdf8' }}>
                                  {isSuccess ? `${r.quality_score}%` : '0%'}
                                </div>
                                {r.judge_critique && isSuccess && (
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: t.textSecondary,
                                      marginTop: '2px',
                                      maxWidth: '200px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    title={r.judge_critique}
                                  >
                                    ⚖️ {r.judge_critique}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', color: t.textSecondary, maxWidth: '300px' }}>
                                {isSuccess ? (
                                  <span title={r.answer}>
                                    {(r.answer || '').substring(0, 95)}...
                                  </span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontSize: '11px' }} title={r.error}>
                                    {r.error?.includes('deprecated')
                                      ? 'Deprecated by OpenAI'
                                      : (r.error || 'Unavailable').substring(0, 75)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Graph View (Ascending Order) */}
              {activeTab === 'graph' && (
                <div
                  style={{
                    backgroundColor: t.cardBg,
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${t.cardBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: '100%', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>
                        Performance Score (Cyan) vs. Cost Curve (Amber)
                      </div>
                      <div style={{ fontSize: '11px', color: isLight ? '#0284c7' : '#38bdf8', marginTop: '2px' }}>
                        Arranged in ascending order: Lowest Cost / Entry → Premium Frontier ($)
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: isLight ? '#047857' : '#34d399', fontWeight: 600 }}>
                      ★ Sweet Spot Intersection: {evalData.winner?.model_id}
                    </div>
                  </div>

                  {/* Color Legend Bar */}
                  <div
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: t.cardSubtleBg,
                      borderRadius: '6px',
                      border: `1px solid ${t.cardBorder}`,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '16px',
                      marginBottom: '14px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span style={{ color: t.textSecondary }}><strong style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>CYAN:</strong> Response Quality Score (0–100%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span style={{ color: t.textSecondary }}><strong style={{ color: isLight ? '#b45309' : '#f59e0b' }}>AMBER:</strong> Turn Cost ($ USD)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span style={{ color: t.textSecondary }}><strong style={{ color: '#10b981' }}>EMERALD:</strong> Optimal Value Intersection (Winner)</span>
                    </div>
                  </div>

                  <canvas
                    ref={canvasRef}
                    width={850}
                    height={380}
                    style={{
                      width: '100%',
                      maxWidth: '850px',
                      height: 'auto',
                      borderRadius: '6px',
                      border: `1px solid ${t.canvasBorder}`,
                      backgroundColor: t.canvasBg,
                    }}
                  />
                </div>
              )}

              {/* Tab 3: Specs Table (Ascending by Input Price) */}
              {activeTab === 'specs' && (
                <div style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'auto', border: `1px solid ${t.tableHeaderBorder}`, borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: t.textSecondary, padding: '10px 12px 6px 12px' }}>
                    Official token rates arranged in <strong>ascending order</strong> by input price per 1M tokens (scrollable)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                      <tr style={{ backgroundColor: t.tableHeaderBg, color: t.textSecondary, textAlign: 'left', borderBottom: `1px solid ${t.tableHeaderBorder}` }}>
                        <th style={{ padding: '8px 10px' }}>Rank & Model ID</th>
                        <th style={{ padding: '8px 10px' }}>Role / Description</th>
                        <th style={{ padding: '8px 10px' }}>Context Window</th>
                        <th style={{ padding: '8px 10px' }}>Max Output</th>
                        <th style={{ padding: '8px 10px' }}>Input Price / 1M ↑</th>
                        <th style={{ padding: '8px 10px' }}>Cached Input / 1M</th>
                        <th style={{ padding: '8px 10px' }}>Output Price / 1M</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...evalData.reference_table]
                        .sort((a, b) => (a.input_price || 0) - (b.input_price || 0) || (a.output_price || 0) - (b.output_price || 0))
                        .map((m, i) => (
                          <tr key={m.model_id || i} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: t.textPrimary }}>
                              <span style={{ color: t.textMuted, marginRight: '6px' }}>#{i + 1}</span>
                              {m.model_id}
                            </td>
                            <td style={{ padding: '8px 10px', color: t.textSecondary }}>{m.role}</td>
                            <td style={{ padding: '8px 10px', color: t.textSecondary }}>{(m.context_window || 0).toLocaleString()}</td>
                            <td style={{ padding: '8px 10px', color: t.textSecondary }}>{(m.max_output || 0).toLocaleString()}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: isLight ? '#b45309' : '#f59e0b' }}>
                              ${(m.input_price || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 10px', color: t.textSecondary }}>
                              {m.cached_input_price ? `$${m.cached_input_price.toFixed(3)}` : '—'}
                            </td>
                            <td style={{ padding: '8px 10px', color: t.textSecondary }}>${(m.output_price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${t.headerBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: t.headerBg,
          }}
        >
          <div style={{ fontSize: '11px', color: t.textSecondary }}>
            {evalData
              ? `Evaluated ${evalData.results?.length || 0} models. Ready for export.`
              : 'Select your recording/take and click Run Multi-Model Evaluation.'}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${t.inputBorder}`,
                color: t.textSecondary,
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={!evalData || isGeneratingPdf}
              title={
                evalData
                  ? 'Download 2-Page Executive PDF Report with Tables & Graph'
                  : 'Click "Run Multi-Model Evaluation" first to generate the report'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: evalData ? (isGeneratingPdf ? '#059669' : '#10b981') : (isLight ? '#cbd5e1' : '#334155'),
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: evalData && !isGeneratingPdf ? 'pointer' : 'not-allowed',
                boxShadow: evalData ? '0 4px 6px -1px rgba(0, 0, 0, 0.15)' : 'none',
              }}
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Compiling PDF...
                </>
              ) : (
                <>
                  <Download size={15} /> Download PDF Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
