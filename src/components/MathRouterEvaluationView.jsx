import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Activity,
  Layers,
  Search,
  RefreshCw,
  Download,
  Copy,
  ChevronRight,
  ChevronDown,
  Wrench,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
  Maximize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export function MathRouterEvaluationView({
  showToast,
  theme,
  onOpenMultiModelModal
}) {
  const [recordings, setRecordings] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedTakeIndex, setSelectedTakeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('traces'); // 'traces' | 'tools' | 'raw'
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/recordings');
      if (res.ok) {
        const json = await res.json();
        setRecordings(json);
        if (json.length > 0 && !selectedSessionId) {
          setSelectedSessionId(json[0].session_id);
        }
      }
    } catch (e) {
      console.error('Failed to load recordings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const filteredRecordings = useMemo(() => {
    if (!searchQuery) return recordings;
    const lower = searchQuery.toLowerCase();
    return recordings.filter(
      (r) =>
        r.recording_title?.toLowerCase().includes(lower) ||
        r.session_id?.toLowerCase().includes(lower) ||
        r.model?.toLowerCase().includes(lower)
    );
  }, [recordings, searchQuery]);

  const activeSession = useMemo(() => {
    return recordings.find((r) => r.session_id === selectedSessionId) || recordings[0];
  }, [recordings, selectedSessionId]);

  const activeTake = activeSession?.takes?.[selectedTakeIndex] || activeSession?.takes?.[0];

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast(`Copied ${label} to clipboard`);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ==========================================================================
          PANEL 2: SESSIONS & RUNS STREAM (360px - 600px)
          ========================================================================== */}
      <div
        style={{
          width: '360px',
          minWidth: '360px',
          height: '100%',
          backgroundColor: 'var(--surface-base)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Header Stack: Context Header (36px) */}
        <div
          style={{
            height: '36px',
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-base)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              MathRouter Sessions
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--surface-muted)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {filteredRecordings.length}
            </span>
          </div>
          <button
            onClick={fetchRecordings}
            title="Refresh recordings"
            style={{
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search Row (38px) */}
        <div
          style={{
            height: '38px',
            minHeight: '38px',
            padding: '0 var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-base)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter session ID, model..."
              style={{
                width: '100%',
                height: '26px',
                fontSize: '11px',
                paddingLeft: '26px',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Sessions Stream List (44px / 56px Two-Line Rows) */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {filteredRecordings.map((rec) => {
            const isSelected = activeSession?.session_id === rec.session_id;
            return (
              <div
                key={rec.session_id}
                onClick={() => {
                  setSelectedSessionId(rec.session_id);
                  setSelectedTakeIndex(0);
                }}
                style={{
                  minHeight: '56px',
                  padding: '8px var(--space-3)',
                  borderBottom: '1px solid var(--border-default)',
                  backgroundColor: isSelected ? 'var(--surface-selected)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--intent-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '2px',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--intent-primary)' : 'var(--text-primary)'
                    }}
                  >
                    {rec.recording_title || rec.session_id}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'var(--intent-primary)',
                      backgroundColor: 'var(--intent-primary-subtle)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)'
                    }}
                  >
                    {rec.model || 'gpt-4o'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span className="tabular-nums">
                    {rec.total_takes || rec.takes?.length || 0} takes · {(rec.total_tokens || 0).toLocaleString()} toks
                  </span>
                  <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {(rec.total_latency_seconds || 0).toFixed(2)}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================================================
          PANEL 3: MULTI-TURN TRACES & TOOL CALL DETAIL (Min 480px)
          ========================================================================== */}
      <div
        style={{
          flex: 1,
          minWidth: '480px',
          height: '100%',
          backgroundColor: 'var(--surface-canvas)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* 40px Detail Toolbar */}
        <div
          style={{
            height: '40px',
            minHeight: '40px',
            padding: '0 var(--space-4)',
            backgroundColor: 'var(--surface-base)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeSession?.recording_title || 'Session Details'}
            </span>
            <button
              onClick={() => copyToClipboard(activeSession?.session_id, 'Session ID')}
              title="Copy Session ID"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <Copy size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {onOpenMultiModelModal && (
              <button
                onClick={() => onOpenMultiModelModal(activeSession, activeTake)}
                style={{
                  height: '26px',
                  padding: '0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: 'var(--intent-primary-solid)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Sliders size={12} /> Compare Models
              </button>
            )}
          </div>
        </div>

        {/* 34px Underline Tabs */}
        <div
          style={{
            height: '34px',
            minHeight: '34px',
            padding: '0 var(--space-4)',
            backgroundColor: 'var(--surface-base)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)'
          }}
        >
          {[
            { id: 'traces', label: 'Takes & Conversation Stream' },
            { id: 'tools', label: 'Tool Calls & Arguments' },
            { id: 'raw', label: 'Raw Take JSON' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: '34px',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? 'var(--intent-primary)' : 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--intent-primary)' : '2px solid transparent',
                cursor: 'pointer',
                padding: '0 4px',
                borderRadius: 0
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Region */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', minHeight: 0 }}>
          {/* Sub-Selector for Takes inside Session */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
            {activeSession?.takes?.map((take, idx) => (
              <button
                key={take.turn_id || idx}
                onClick={() => setSelectedTakeIndex(idx)}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  fontSize: '11px',
                  fontWeight: selectedTakeIndex === idx ? 600 : 500,
                  backgroundColor: selectedTakeIndex === idx ? 'var(--intent-primary-subtle)' : 'var(--surface-base)',
                  border: selectedTakeIndex === idx ? '1px solid var(--intent-primary)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: selectedTakeIndex === idx ? 'var(--intent-primary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{take.take_label || `TAKE #${idx + 1}`}</span>
                <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {(take.latency_seconds || 0).toFixed(2)}s
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'traces' && activeTake && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* User Prompt */}
              <div
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  User Message
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {activeTake.user_message || 'No user message recorded.'}
                </div>
              </div>

              {/* Tool Calls if any */}
              {activeTake.tool_calls && activeTake.tool_calls.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--surface-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--intent-warning)', marginBottom: '8px' }}>
                    <Wrench size={13} /> Tool Calls Observed ({activeTake.tool_calls.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {activeTake.tool_calls.map((tc, tcIdx) => (
                      <div
                        key={tcIdx}
                        style={{
                          backgroundColor: 'var(--surface-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-xs)',
                          padding: 'var(--space-2)'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          Function: <span style={{ fontFamily: 'monospace' }}>{tc.name || tc.function?.name}</span>
                        </div>
                        <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {JSON.stringify(tc.arguments || tc.function?.arguments || tc, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assistant Response */}
              <div
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--intent-primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Assistant Response
                </div>
                <div className="markdown-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {activeTake.assistant_response || 'No assistant response.'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'raw' && activeTake && (
            <div
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)'
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--text-primary)'
                }}
              >
                {JSON.stringify(activeTake, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
