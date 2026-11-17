const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const settingsPanel = document.getElementById('settingsPanel');
const networkBanner = document.getElementById('networkBanner');
const systemLogsPanel = document.getElementById('systemLogsPanel');
const logsContainer = document.getElementById('logsContainer');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// Recording & Modal Elements
const recordToggleBtn = document.getElementById('recordToggleBtn');
const recordBtnIcon = document.getElementById('recordBtnIcon');
const recordBtnLabel = document.getElementById('recordBtnLabel');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingIndicatorText = document.getElementById('recordingIndicatorText');
const openRecordingsBtn = document.getElementById('openRecordingsBtn');
const recordingsCountBadge = document.getElementById('recordingsCountBadge');

const recordingsModal = document.getElementById('recordingsModal');
const closeRecordingsModalBtn = document.getElementById('closeRecordingsModalBtn');
const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
const sessionsList = document.getElementById('sessionsList');
const viewerEmptyState = document.getElementById('viewerEmptyState');
const viewerContent = document.getElementById('viewerContent');
const viewerSessionTitle = document.getElementById('viewerSessionTitle');
const viewerBadges = document.getElementById('viewerBadges');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const deleteSessionBtn = document.getElementById('deleteSessionBtn');
const tabFormattedBtn = document.getElementById('tabFormattedBtn');
const tabRawJsonBtn = document.getElementById('tabRawJsonBtn');
const tabFormattedPane = document.getElementById('tabFormattedPane');
const tabRawJsonPane = document.getElementById('tabRawJsonPane');
const formattedTurnsList = document.getElementById('formattedTurnsList');
const rawJsonContent = document.getElementById('rawJsonContent');
const takeSelectDropdown = document.getElementById('takeSelectDropdown');
const prevTakeBtn = document.getElementById('prevTakeBtn');
const nextTakeBtn = document.getElementById('nextTakeBtn');
const takePositionBadge = document.getElementById('takePositionBadge');
const takeSelectorBar = document.getElementById('takeSelectorBar');

// Document Grounding & Prompt Modes Elements
const chatbotDocFileInput = document.getElementById('chatbotDocFileInput');
const docUploadTriggerBtn = document.getElementById('docUploadTriggerBtn');
const docUploadIcon = document.getElementById('docUploadIcon');
const docUploadLabel = document.getElementById('docUploadLabel');
const docActivePill = document.getElementById('docActivePill');
const docFileName = document.getElementById('docFileName');
const docMetaBadge = document.getElementById('docMetaBadge');
const docPreviewBtn = document.getElementById('docPreviewBtn');
const docRemoveBtn = document.getElementById('docRemoveBtn');
const promptModeSelect = document.getElementById('promptModeSelect');
const promptDrawerBtn = document.getElementById('promptDrawerBtn');
const promptInfoDrawer = document.getElementById('promptInfoDrawer');
const promptInfoTitle = document.getElementById('promptInfoTitle');
const promptInfoDesc = document.getElementById('promptInfoDesc');
const promptInfoInstruction = document.getElementById('promptInfoInstruction');
const closePromptInfoBtn = document.getElementById('closePromptInfoBtn');
const docPreviewModal = document.getElementById('docPreviewModal');
const closeDocPreviewModalBtn = document.getElementById('closeDocPreviewModalBtn');
const previewDocModalTitle = document.getElementById('previewDocModalTitle');
const previewDocModalSub = document.getElementById('previewDocModalSub');
const docPreviewTextContent = document.getElementById('docPreviewTextContent');

// 5 Fixated Prompt Presets
const PROMPT_PRESETS = {
    executive_summary: {
        id: "executive_summary",
        name: "Executive Summary & Synthesis",
        tag: "Executive",
        description: "Concise, strategic takeaways, high-level synthesis and executive framing.",
        instruction: "You are an elite Executive Research Analyst. Your role is to analyze the provided document and provide concise, high-impact executive summaries. Focus on strategic implications, key numbers, bottom-line conclusions, and high-level synthesis. Avoid unnecessary jargon or granular minutiae. Structure your responses with bold headers and crisp bullet points suitable for C-level leadership."
    },
    fact_checker: {
        id: "fact_checker",
        name: "Fact-Checking & Evidence Verification",
        tag: "Verification",
        description: "Strict factual accuracy, verbatim evidence citations, section references, and claim validation.",
        instruction: "You are a rigorous Document Fact-Checker and Evidence Verifier. Analyze the provided document with extreme precision. For every assertion, provide exact verbatim quotes from the text as evidence and cite the section or context. If an answer or detail is not explicitly supported by the text, explicitly state: 'Not substantiated by the document.' Distinguish clearly between direct factual statements and interpreted inferences."
    },
    critical_auditor: {
        id: "critical_auditor",
        name: "Critical & Risk Auditor",
        tag: "Auditor",
        description: "Identifies flaws, hidden assumptions, missing evidence, risk factors, and counter-arguments.",
        instruction: "You are an adversarial Technical & Risk Auditor. Your objective is to probe the document for hidden assumptions, methodological flaws, omitted variables, logical fallacies, operational risks, and potential failure modes. Do not accept claims at face value. Highlight what the document fails to explain, potential biases, and critical gaps."
    },
    action_extractor: {
        id: "action_extractor",
        name: "Action Item & Table Extractor",
        tag: "Action Items",
        description: "Structured tabular data extraction, deliverables, owners, deadlines, and procedural next steps.",
        instruction: "You are an Operations & Data Extraction Specialist. Your role is to convert document contents into highly actionable, structured deliverables. Where appropriate, format your output as Markdown tables containing Item, Category, Description, Owner/Stakeholder, and Action Required. Extract concrete next steps, deadlines, milestones, and dependencies."
    },
    comprehensive_qa: {
        id: "comprehensive_qa",
        name: "Comprehensive Q&A Explainer",
        tag: "Deep Explainer",
        description: "In-depth, pedagogical answers explaining technical concepts thoroughly with full document context.",
        instruction: "You are a Senior Technical Explainer and Domain Expert. Your role is to answer questions regarding the document with thorough, exhaustive, and pedagogical depth. Unpack complex concepts, connect related sections within the document, provide contextual explanations, and ensure the reader achieves complete comprehension of the subject matter."
    }
};

let activeDocument = {
    filename: null,
    text: '',
    filesize: 0,
    word_count: 0,
    est_tokens: 0
};
let activePromptMode = localStorage.getItem('chatbot_prompt_mode') || 'executive_summary';

function updateDocUI() {
    if (activeDocument && activeDocument.filename) {
        if (docUploadTriggerBtn) docUploadTriggerBtn.style.display = 'none';
        if (docActivePill) docActivePill.style.display = 'inline-flex';
        if (docFileName) docFileName.innerText = activeDocument.filename;
        if (docMetaBadge) docMetaBadge.innerText = `~${(activeDocument.word_count || 0).toLocaleString()} words`;
        if (userInput) userInput.placeholder = `Ask any question regarding "${activeDocument.filename}"...`;
    } else {
        if (docUploadTriggerBtn) docUploadTriggerBtn.style.display = 'inline-flex';
        if (docActivePill) docActivePill.style.display = 'none';
        if (userInput) userInput.placeholder = 'Upload a document above or ask any question...';
    }
}

// Load saved document from localStorage
const savedDoc = localStorage.getItem('chatbot_active_doc');
if (savedDoc) {
    try {
        activeDocument = JSON.parse(savedDoc);
        updateDocUI();
    } catch (e) {}
}

if (docUploadTriggerBtn && chatbotDocFileInput) {
    docUploadTriggerBtn.addEventListener('click', () => {
        chatbotDocFileInput.click();
    });

    chatbotDocFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        docUploadLabel.innerText = 'Extracting...';
        docUploadIcon.innerText = '⏳';
        logSystemEvent(`[Doc Grounding] Extracting text from ${file.name}...`, 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload_doc', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to upload document');

            activeDocument = {
                filename: data.filename,
                text: data.text,
                filesize: data.filesize,
                word_count: data.word_count,
                est_tokens: data.est_tokens
            };
            localStorage.setItem('chatbot_active_doc', JSON.stringify(activeDocument));
            updateDocUI();
            logSystemEvent(`[Doc Grounding] Grounded on "${data.filename}" (~${data.word_count} words • ~${data.est_tokens} tokens)`, 'success');
        } catch (err) {
            logSystemEvent(`[Doc Error] ${err.message}`, 'error');
            alert(`Document upload error: ${err.message}`);
        } finally {
            docUploadLabel.innerText = 'Upload Document';
            docUploadIcon.innerText = '📄';
            chatbotDocFileInput.value = '';
        }
    });
}

if (docRemoveBtn) {
    docRemoveBtn.addEventListener('click', () => {
        activeDocument = { filename: null, text: '', filesize: 0, word_count: 0, est_tokens: 0 };
        localStorage.removeItem('chatbot_active_doc');
        updateDocUI();
        logSystemEvent('[Doc Grounding] Document context cleared.', 'info');
    });
}

if (docPreviewBtn && docPreviewModal) {
    docPreviewBtn.addEventListener('click', () => {
        if (!activeDocument.text) return;
        previewDocModalTitle.innerText = `📄 ${activeDocument.filename}`;
        previewDocModalSub.innerText = `~${(activeDocument.word_count || 0).toLocaleString()} words • ~${(activeDocument.est_tokens || 0).toLocaleString()} tokens`;
        docPreviewTextContent.innerText = activeDocument.text;
        docPreviewModal.style.display = 'flex';
    });
}

if (closeDocPreviewModalBtn && docPreviewModal) {
    closeDocPreviewModalBtn.addEventListener('click', () => {
        docPreviewModal.style.display = 'none';
    });
}

function updatePromptInfoDrawer() {
    const preset = PROMPT_PRESETS[activePromptMode] || PROMPT_PRESETS['executive_summary'];
    if (promptInfoTitle) promptInfoTitle.innerText = preset.name;
    if (promptInfoDesc) promptInfoDesc.innerText = preset.description;
    if (promptInfoInstruction) promptInfoInstruction.innerText = preset.instruction;
}

if (promptModeSelect) {
    promptModeSelect.value = activePromptMode;
    promptModeSelect.addEventListener('change', (e) => {
        activePromptMode = e.target.value;
        localStorage.setItem('chatbot_prompt_mode', activePromptMode);
        const preset = PROMPT_PRESETS[activePromptMode];
        if (preset) {
            logSystemEvent(`[Prompt Mode] Switched to "${preset.name}" (${preset.tag})`, 'info');
            if (promptInfoDrawer && promptInfoDrawer.style.display !== 'none') {
                updatePromptInfoDrawer();
            }
        }
    });
}

if (promptDrawerBtn && promptInfoDrawer) {
    promptDrawerBtn.addEventListener('click', () => {
        const isHidden = promptInfoDrawer.style.display === 'none';
        promptInfoDrawer.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            updatePromptInfoDrawer();
        }
    });
}

if (closePromptInfoBtn && promptInfoDrawer) {
    closePromptInfoBtn.addEventListener('click', () => {
        promptInfoDrawer.style.display = 'none';
    });
}

// System Logging
function logSystemEvent(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    
    let escapedMsg = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (type === 'schema') {
        escapedMsg = escapedMsg.replace(/&quot;current_session_value&quot;:\s*([\d\.]+)/g, '<span style="color: #ef4444; font-weight: bold;">"current_session_value": $1</span>');
    }
    
    div.innerHTML = `<span class="log-time">[${time}]</span><span class="log-${type}">${escapedMsg}</span>`;
    logsContainer.appendChild(div);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
});

// Messages and History
let messages = [];
function saveHistory() {
    localStorage.setItem('mathrouter_history', JSON.stringify(messages));
}

// Load history from LocalStorage if it exists
const savedHistory = localStorage.getItem('mathrouter_history');
if (savedHistory) {
    try {
        messages = JSON.parse(savedHistory);
        messages.forEach(msg => {
            if (msg.role === 'user') {
                appendMessage('user', msg.content);
            } else if (msg.role === 'assistant' && msg.content) {
                appendMessage('bot', msg.content);
            }
        });
    } catch (e) {
        messages = [{ role: "system", content: "You are a Document Intelligence Assistant." }];
        appendMessage('bot', "✨ Hello! I'm your Document Intelligence Assistant. Upload a document above and ask any question regarding it.");
    }
} else {
    messages.push({ role: "system", content: "You are a Document Intelligence Assistant." });
    saveHistory();
    appendMessage('bot', "✨ Hello! I'm your Document Intelligence Assistant. Upload a document above and ask any question regarding it.");
}

// Toggles setup (guarded)
const toggles = ['add', 'sub', 'mul', 'div'];
toggles.forEach(t => {
    const el = document.getElementById(`toggle_${t}`);
    if (el) {
        const saved = localStorage.getItem(`toggle_${t}`);
        if (saved !== null) {
            el.checked = saved === 'true';
        }
        el.addEventListener('change', (e) => {
            localStorage.setItem(`toggle_${t}`, e.target.checked);
        });
    }
});

function getToggles() {
    return {
        add: document.getElementById('toggle_add')?.checked ?? false,
        sub: document.getElementById('toggle_sub')?.checked ?? false,
        mul: document.getElementById('toggle_mul')?.checked ?? false,
        div: document.getElementById('toggle_div')?.checked ?? false,
    };
}

if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('active');
    });
}

clearChatBtn.addEventListener('click', async () => {
    if(confirm('Are you sure you want to clear the entire chat history?')) {
        localStorage.removeItem('mathrouter_history');
        messages = [{ role: "system", content: "You are a Document Intelligence Assistant." }];
        chatBox.innerHTML = '';
        try {
            await fetch('/api/clear', { method: 'POST', credentials: 'include' });
            logSystemEvent('[Session] Browser session cookie cleared.', 'session');
        } catch (e) {
            logSystemEvent('Failed to clear session on backend.', 'error');
        }
        processBackendRequest({ messages, toggles: getToggles() });
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) sendMessage();
});
sendBtn.addEventListener('click', () => {
    if (!sendBtn.disabled) sendMessage();
});

function appendMessage(role, text, isHtml = false) {
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    
    if (role === 'bot' && !isHtml) {
        const numCheck = parseFloat(text);
        if (!isNaN(numCheck) && numCheck < 0 && text.trim() === numCheck.toString()) {
            div.innerHTML = `<span class="negative-number"></span>`;
            div.firstChild.innerText = text;
        } else {
            div.innerText = text;
        }
    } else if (isHtml) {
        div.innerHTML = text;
    } else {
        div.innerText = text;
    }
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'bot-message typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
}

window.addEventListener('offline', () => { networkBanner.style.display = 'block'; });
window.addEventListener('online', () => { networkBanner.style.display = 'none'; });

// ==========================================
// HIERARCHICAL RECORDING ENGINE (RECORDINGS & TAKES)
// ==========================================
let isRecording = false;
let currentSession = null;
let currentTurnInput = null;
let allRecordingsCache = [];

function generateSessionId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `rec_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getNextRecordingNumber() {
    const stored = localStorage.getItem('last_recording_number');
    let nextNum = stored ? parseInt(stored) + 1 : (allRecordingsCache.length + 1);
    return Math.max(1, nextNum);
}

function startRecording(explicit = false) {
    if (isRecording) return;
    
    const recNumber = getNextRecordingNumber();
    const recTitle = `RECORDING ${recNumber}`;
    
    isRecording = true;
    currentSession = {
        session_id: generateSessionId(),
        recording_number: recNumber,
        recording_title: recTitle,
        start_time: new Date().toISOString(),
        model: "gpt-4o",
        document_name: activeDocument.filename || null,
        prompt_key: activePromptMode || "executive_summary",
        total_tokens: 0,
        total_latency_seconds: 0,
        turns: []
    };
    
    localStorage.setItem('last_recording_number', String(recNumber));
    localStorage.setItem('active_session_draft', JSON.stringify(currentSession));
    
    // Update UI
    recordBtnIcon.innerText = "⏹️";
    recordBtnLabel.innerText = "End Rec";
    recordToggleBtn.classList.add("recording");
    recordingIndicator.style.display = "flex";
    recordingIndicatorText.innerText = `REC: ${recTitle} (0 TAKES)`;
    
    logSystemEvent(`[Recorder] Started ${recTitle} [${currentSession.session_id}]`, 'response');
}

function updateRecordingTurnCount() {
    if (isRecording && currentSession) {
        const count = currentSession.turns.length;
        recordingIndicatorText.innerText = `REC: ${currentSession.recording_title} (${count} TAKE${count === 1 ? '' : 'S'})`;
    }
}

// Automatically save every individual take as a separate JSON & DB row
function recordSingleTurn(userMsg, assistantMsg, toolCalls, latencySec, tokenUsage, modelName) {
    if (!isRecording || !currentSession) return;
    
    const takeNumber = currentSession.turns.length + 1;
    const takeLabel = `TAKE #${takeNumber}`;
    const turnId = `${currentSession.session_id}_take_${takeNumber}`;
    
    const turnData = {
        turn_id: turnId,
        session_id: currentSession.session_id,
        recording_title: currentSession.recording_title,
        recording_number: currentSession.recording_number,
        take_number: takeNumber,
        turn_number: takeNumber,
        take_label: takeLabel,
        timestamp: new Date().toISOString(),
        user_message: userMsg,
        assistant_response: assistantMsg,
        tool_calls: toolCalls,
        latency_seconds: latencySec,
        usage: tokenUsage || {},
        model: modelName || "gpt-4o",
        document_text: activeDocument.text || "",
        document_name: activeDocument.filename || "",
        prompt_key: activePromptMode || "executive_summary"
    };
    
    currentSession.turns.push(turnData);
    currentSession.total_latency_seconds = parseFloat((currentSession.total_latency_seconds + latencySec).toFixed(3));
    if (tokenUsage && tokenUsage.total_tokens) {
        currentSession.total_tokens += tokenUsage.total_tokens;
    }
    
    updateRecordingTurnCount();
    localStorage.setItem('active_session_draft', JSON.stringify(currentSession));
    currentTurnInput = null;

    // Immediately persist this separate take JSON file to backend and PostgreSQL row
    fetch('/api/recordings/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnData)
    }).then(r => r.json()).then(res => {
        logSystemEvent(`[Recorder] Saved ${currentSession.recording_title} - ${takeLabel} JSON: ${res.filename}`, 'response');
        loadRecordingsList();
    }).catch(err => {
        console.error("Auto-save take error:", err);
    });
}

async function endRecording() {
    if (!isRecording || !currentSession) return;
    
    currentSession.end_time = new Date().toISOString();
    const finalTitle = currentSession.recording_title;
    const totalTakes = currentSession.turns.length;
    logSystemEvent(`[Recorder] ${finalTitle} ended. Total ${totalTakes} separate turn JSON files recorded.`, 'response');
    
    const sessionToSave = currentSession;
    
    // Reset state
    isRecording = false;
    currentSession = null;
    currentTurnInput = null;
    localStorage.removeItem('active_session_draft');
    
    recordBtnIcon.innerText = "⏺️";
    recordBtnLabel.innerText = "Record";
    recordToggleBtn.classList.remove("recording");
    recordingIndicator.style.display = "none";
    
    // Final sync
    try {
        await fetch('/api/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionToSave)
        });
        await loadRecordingsList();
        openRecordingsModal();
    } catch (e) {
        console.error(e);
    }
}

recordToggleBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording(true);
    } else {
        endRecording();
    }
});

// Restore active session draft if page was reloaded while recording
const draftSession = localStorage.getItem('active_session_draft');
if (draftSession) {
    try {
        currentSession = JSON.parse(draftSession);
        isRecording = true;
        recordBtnIcon.innerText = "⏹️";
        recordBtnLabel.innerText = "End Rec";
        recordToggleBtn.classList.add("recording");
        recordingIndicator.style.display = "flex";
        updateRecordingTurnCount();
    } catch(e) {}
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    // Automatically start recording on message send if not recording
    if (!isRecording) {
        startRecording(false);
    }
    
    currentTurnInput = {
        user_message: text,
        start_time: performance.now(),
        timestamp: new Date().toISOString()
    };
    
    appendMessage('user', text);
    messages.push({ role: "user", content: text });
    saveHistory();
    userInput.value = '';
    
    sendBtn.disabled = true;
    userInput.disabled = true;
    
    await processBackendRequest({
        messages,
        toggles: getToggles(),
        document_text: activeDocument.text || "",
        document_name: activeDocument.filename || "",
        prompt_key: activePromptMode || "executive_summary"
    });
    
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
}

async function processBackendRequest(payload) {
    showTyping();
    
    if (payload.execute_pending) {
        logSystemEvent(`[MCP Op] Executing tool ${payload.pending_tool_call.function.name} on backend...`, 'tool');
    }
    
    const startTime = performance.now();
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        hideTyping();
        
        if (!response.ok) {
            throw new Error("Network error");
        }

        const contentType = response.headers.get("content-type");
        const elapsed = Math.round(performance.now() - startTime);
        const latencySec = parseFloat((elapsed / 1000).toFixed(3));
        
        // Metadata headers from backend
        let tokenUsage = {};
        let modelName = "gpt-4o";
        const usageHeader = response.headers.get("X-Token-Usage");
        if (usageHeader) {
            try { tokenUsage = JSON.parse(usageHeader); } catch(e) {}
        }
        const modelHeader = response.headers.get("X-Model-Name");
        if (modelHeader) modelName = modelHeader;
        
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            
            // Render background logs
            const capturedTools = [];
            if (data.background_logs && Array.isArray(data.background_logs)) {
                data.background_logs.forEach(log => {
                    let type = 'tool';
                    if (log.includes("[LLM Payload]")) type = 'payload';
                    else if (log.includes("[LLM Response]")) type = 'response';
                    else if (log.includes("[Session")) type = 'session';
                    else if (log.includes("[Available Tools]")) type = 'schema';
                    else if (log.includes("Update Started]") || log.includes("Output]")) {
                        type = 'working';
                        capturedTools.push(log);
                    }
                    logSystemEvent(log, type);
                });
            }
            
            if (data.type === 'confirmation') {
                logSystemEvent(`[LLM Op] Inference complete [${elapsed}ms]. Agent requested tool.`, 'success');
                logSystemEvent(`[MCP Op] Staged Tool: ${data.tool_call.function.name}(${data.tool_call.function.arguments})`, 'tool');
                logSystemEvent(`[UI] Awaiting user authorization...`, 'info');
                
                // Record turn for confirmation request
                if (isRecording && currentSession) {
                    const userMsg = currentTurnInput ? currentTurnInput.user_message : (payload.execute_pending ? "Yes, proceed." : "Math Query");
                    recordSingleTurn(
                        userMsg,
                        data.message || "Confirmation requested for tool execution.",
                        [{
                            name: data.tool_call.function.name,
                            arguments: data.tool_call.function.arguments,
                            status: "pending_confirmation"
                        }],
                        latencySec,
                        tokenUsage,
                        modelName
                    );
                }
                
                renderConfirmationBox(data.message, data.tool_call);
            } else if (data.type === 'error') {
                logSystemEvent(`[Backend Error] [${elapsed}ms]: ${data.message}`, 'error');
                appendMessage('bot', data.message);
                messages.push({ role: "assistant", content: data.message });
                saveHistory();
                
                if (isRecording && currentSession) {
                    const userMsg = currentTurnInput ? currentTurnInput.user_message : "Math Query";
                    recordSingleTurn(userMsg, data.message, [], latencySec, tokenUsage, modelName);
                }
            }
        } else {
            // Streaming text response
            const capturedTools = [];
            const bgLogsHeader = response.headers.get("X-Background-Logs");
            if (bgLogsHeader) {
                try {
                    const bgLogs = JSON.parse(bgLogsHeader);
                    bgLogs.forEach(log => {
                        let type = 'tool';
                        if (log.includes("[LLM Payload]")) type = 'payload';
                        else if (log.includes("[LLM Response]")) type = 'response';
                        else if (log.includes("[Session")) type = 'session';
                        else if (log.includes("[Available Tools]")) type = 'schema';
                        else if (log.includes("Update Started]") || log.includes("Output]") || log.includes("[Internal Tool")) {
                            type = 'working';
                            capturedTools.push(log);
                        }
                        logSystemEvent(log, type);
                    });
                } catch(err) {}
            }
            
            logSystemEvent(`[LLM Op] Inference complete [${elapsed}ms]. Initiating text stream...`, 'success');
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let botText = "";
            const msgDiv = appendMessage('bot', "");
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                botText += chunk;
                
                const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const safeText = escapeHtml(botText);
                msgDiv.innerHTML = safeText.replace(/(^|\s)(-\d+(\.\d+)?)(?=\s|$|[.,?!])/g, '$1<span class="negative-number">$2</span>');
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            
            messages.push({ role: "assistant", content: botText });
            saveHistory();
            
            // Record this completed conversational turn as a separate JSON & DB row
            if (isRecording && currentSession) {
                const userMsg = currentTurnInput ? currentTurnInput.user_message : (payload.execute_pending ? "Yes, proceed." : "Math Query");
                recordSingleTurn(
                    userMsg,
                    botText,
                    capturedTools.map(t => ({ summary: t })),
                    latencySec,
                    tokenUsage,
                    modelName
                );
            }
        }
    } catch (e) {
        logSystemEvent(`Network Error: ${e.message}`, 'error');
        hideTyping();
        networkBanner.style.display = 'block';
        setTimeout(() => networkBanner.style.display = 'none', 3000);
    }
}

function renderConfirmationBox(message, toolCall) {
    const savedToggles = getToggles();
    const div = document.createElement('div');
    div.className = 'bot-message confirmation-box';
    div.innerHTML = `
        <div>${message}</div>
        <div class="conf-buttons">
            <button class="btn-yes">YES</button>
            <button class="btn-no">NO</button>
        </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    const yesBtn = div.querySelector('.btn-yes');
    const noBtn = div.querySelector('.btn-no');
    
    yesBtn.addEventListener('click', () => {
        div.remove();
        appendMessage('user', "Yes, proceed.");
        messages.push({ role: "user", content: "Yes, proceed." });
        saveHistory();
        
        currentTurnInput = {
            user_message: "Yes, proceed.",
            start_time: performance.now(),
            timestamp: new Date().toISOString()
        };
        
        logSystemEvent(`Confirmed tool call: ${toolCall.function.name}`, 'tool');
        processBackendRequest({
            messages,
            toggles: getToggles(),
            execute_pending: true,
            pending_tool_call: toolCall
        });
    });
    
    noBtn.addEventListener('click', () => {
        div.remove();
        appendMessage('user', "No, cancel the operation.");
        messages.push({ role: "user", content: "No, cancel the operation." });
        
        currentTurnInput = {
            user_message: "No, cancel the operation.",
            start_time: performance.now(),
            timestamp: new Date().toISOString()
        };
        
        logSystemEvent(`Cancelled tool call: ${toolCall.function.name}`, 'error');

        messages.push({
            role: "assistant",
            content: null,
            tool_calls: [toolCall]
        });
        saveHistory();
        messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "ERROR: User rejected the tool execution."
        });
        saveHistory();
        processBackendRequest({
            messages,
            toggles: savedToggles,
            execute_pending: false
        });
    });
}

// ==========================================
// HIERARCHICAL RECORDINGS & TAKES VIEWER
// ==========================================
let activeViewTab = 'formatted';
let selectedTakeData = null;
let selectedTakeFilename = null;
let selectedRecordingContext = null;

function openRecordingsModal() {
    recordingsModal.style.display = 'flex';
    loadRecordingsList();
}

function closeRecordingsModal() {
    recordingsModal.style.display = 'none';
}

openRecordingsBtn.addEventListener('click', openRecordingsModal);
closeRecordingsModalBtn.addEventListener('click', closeRecordingsModal);
refreshSessionsBtn.addEventListener('click', loadRecordingsList);

recordingsModal.addEventListener('click', (e) => {
    if (e.target === recordingsModal) closeRecordingsModal();
});

function switchTab(tab) {
    activeViewTab = tab;
    if (tab === 'formatted') {
        tabFormattedBtn.classList.add('active');
        tabRawJsonBtn.classList.remove('active');
        tabFormattedPane.style.display = 'block';
        tabRawJsonPane.style.display = 'none';
    } else {
        tabRawJsonBtn.classList.add('active');
        tabFormattedBtn.classList.remove('active');
        tabRawJsonPane.style.display = 'block';
        tabFormattedPane.style.display = 'none';
    }
}

tabFormattedBtn.addEventListener('click', () => switchTab('formatted'));
tabRawJsonBtn.addEventListener('click', () => switchTab('rawJson'));

async function loadRecordingsList() {
    sessionsList.innerHTML = '<div class="sessions-empty-state">Loading recordings...</div>';
    try {
        const res = await fetch('/api/recordings');
        const data = await res.json();
        const recordings = data.recordings || [];
        allRecordingsCache = recordings;
        
        let totalTakesCount = 0;
        recordings.forEach(r => totalTakesCount += (r.takes ? r.takes.length : 0));
        
        recordingsCountBadge.innerText = totalTakesCount;
        
        if (recordings.length === 0) {
            sessionsList.innerHTML = '<div class="sessions-empty-state">No saved recordings found.<br><br>Click <strong>Record</strong> or chat to record a session!</div>';
            viewerEmptyState.style.display = 'flex';
            viewerContent.style.display = 'none';
            return;
        }
        
        sessionsList.innerHTML = '';
        let firstTakeToSelect = null;
        let firstTakeRec = null;

        recordings.forEach((rec, recIdx) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'recording-group';
            groupDiv.id = `rec_group_${rec.session_id}`;
            
            const takesCount = rec.takes ? rec.takes.length : 0;
            const takesText = `${takesCount} TAKE${takesCount === 1 ? '' : 'S'}`;
            const latencyText = rec.total_latency_seconds ? `${rec.total_latency_seconds}s` : '';
            const tokensText = rec.total_tokens ? `${rec.total_tokens} tok` : '';
            const recTitle = rec.recording_title || `RECORDING ${recIdx + 1}`;

            groupDiv.innerHTML = `
                <div class="recording-group-header" title="Click to view full recording or toggle">
                    <div class="recording-title-row">
                        <span class="recording-chevron">▼</span>
                        <span class="recording-name">${escapeHtml(recTitle)}</span>
                        <span class="take-count-pill">${takesText}</span>
                    </div>
                    <div class="recording-group-sub">
                        ${latencyText ? `<span>⚡ ${latencyText}</span>` : ''}
                        ${tokensText ? `<span>🪙 ${tokensText}</span>` : ''}
                        <span class="mini-badge model">${escapeHtml(rec.model || 'gpt-4o')}</span>
                    </div>
                </div>
                <div class="recording-takes-container"></div>
            `;
            
            const headerEl = groupDiv.querySelector('.recording-group-header');
            const takesContainer = groupDiv.querySelector('.recording-takes-container');
            
            headerEl.addEventListener('click', (e) => {
                if (e.target.closest('.take-item')) return;
                // If user clicks the header, select the recording overview, and toggle collapse on chevron
                if (e.target.classList.contains('recording-chevron')) {
                    groupDiv.classList.toggle('collapsed');
                } else {
                    selectRecordingOverview(rec);
                }
            });

            (rec.takes || []).forEach((take) => {
                const takeItem = document.createElement('div');
                takeItem.className = 'take-item';
                takeItem.dataset.filename = take.filename;
                takeItem.dataset.turnId = take.turn_id;
                
                if (selectedTakeFilename === take.filename || selectedTakeFilename === take.turn_id) {
                    takeItem.classList.add('active');
                }
                
                const takeLabel = take.take_label || `TAKE #${take.take_number || 1}`;
                const takeLatency = take.latency_seconds ? `${take.latency_seconds}s` : '';
                const takeTokens = take.total_tokens ? `${take.total_tokens} tok` : '';
                const metaStr = [takeLatency, takeTokens].filter(Boolean).join(' • ');

                takeItem.innerHTML = `
                    <div class="take-label-line">
                        <span class="take-prefix">- ${escapeHtml(takeLabel)}</span>
                        ${metaStr ? `<span class="take-time">${escapeHtml(metaStr)}</span>` : ''}
                    </div>
                    <div class="take-query-preview">👤 ${escapeHtml(take.preview || take.user_message || 'Math prompt')}</div>
                `;
                
                takeItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.take-item').forEach(el => el.classList.remove('active'));
                    takeItem.classList.add('active');
                    selectTake(take, rec);
                });
                
                takesContainer.appendChild(takeItem);
                
                if (!firstTakeToSelect) {
                    firstTakeToSelect = take;
                    firstTakeRec = rec;
                }
            });
            
            sessionsList.appendChild(groupDiv);
        });
        
        // Auto select first take if nothing currently selected
        if (!selectedTakeFilename && firstTakeToSelect) {
            selectTake(firstTakeToSelect, firstTakeRec);
        }
    } catch (e) {
        sessionsList.innerHTML = `<div class="sessions-empty-state" style="color: var(--danger)">Error loading recordings: ${e.message}</div>`;
    }
}

function populateTakesDropdown(recording, activeIndex = 0) {
    if (!recording || !recording.takes || recording.takes.length === 0) {
        takeSelectDropdown.innerHTML = '<option value="">No takes in this recording</option>';
        prevTakeBtn.disabled = true;
        nextTakeBtn.disabled = true;
        takePositionBadge.innerText = '0 of 0';
        return;
    }

    takeSelectDropdown.innerHTML = '';
    recording.takes.forEach((t, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const takeLabel = t.take_label || `TAKE #${t.take_number || (idx + 1)}`;
        const userPreview = t.user_message ? `"${t.user_message.slice(0, 30)}..."` : (t.preview ? `"${t.preview.slice(0, 30)}"` : '');
        const latencyStr = t.latency_seconds ? `${t.latency_seconds}s` : '';
        const tokensStr = t.total_tokens ? `${t.total_tokens} tok` : '';
        const metaInfo = [latencyStr, tokensStr].filter(Boolean).join(' • ');

        opt.textContent = `${takeLabel}: ${userPreview || 'Turn'} ${metaInfo ? `(${metaInfo})` : ''}`;
        takeSelectDropdown.appendChild(opt);
    });

    const safeIndex = Math.max(0, Math.min(activeIndex, recording.takes.length - 1));
    takeSelectDropdown.value = safeIndex;
    updateTakeNavButtons(recording, safeIndex);
}

function updateTakeNavButtons(recording, currentIndex) {
    const total = recording && recording.takes ? recording.takes.length : 0;
    takePositionBadge.innerText = total > 0 ? `Take ${currentIndex + 1} of ${total}` : '0 of 0';
    prevTakeBtn.disabled = currentIndex <= 0;
    nextTakeBtn.disabled = currentIndex >= (total - 1);
}

async function selectTake(take, recording, explicitIndex = null) {
    selectedTakeFilename = take.filename;
    selectedRecordingContext = recording;
    viewerEmptyState.style.display = 'none';
    viewerContent.style.display = 'flex';
    
    // Find index of this take
    const takeIndex = (explicitIndex !== null && explicitIndex >= 0)
        ? explicitIndex 
        : (recording.takes ? recording.takes.findIndex(t => t.turn_id === take.turn_id || t.filename === take.filename) : 0);
        
    populateTakesDropdown(recording, takeIndex >= 0 ? takeIndex : 0);
    
    // Highlight sidebar active item
    document.querySelectorAll('.take-item').forEach(el => {
        if (el.dataset.filename === take.filename || el.dataset.turnId === take.turn_id) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    try {
        const res = await fetch(`/api/recordings/${encodeURIComponent(take.filename)}`);
        const data = await res.json();
        
        // If the returned payload is a multi-turn session file, extract this specific take
        let singleTakeData = data;
        if (data && data.turns && Array.isArray(data.turns)) {
            const matched = data.turns.find(t => 
                (take.turn_id && t.turn_id === take.turn_id) || 
                (take.take_number && (t.take_number === take.take_number || t.turn_number === take.take_number || t.turn === take.take_number))
            ) || data.turns[takeIndex] || data.turns[0];
            if (matched) {
                singleTakeData = {
                    ...matched,
                    session_id: matched.session_id || data.session_id,
                    recording_title: matched.recording_title || recording.recording_title || data.recording_title,
                    recording_number: matched.recording_number || recording.recording_number || data.recording_number,
                    model: matched.model || data.model,
                    take_number: matched.take_number || matched.turn_number || matched.turn || (takeIndex + 1),
                    take_label: matched.take_label || take.take_label || `TAKE #${takeIndex + 1}`
                };
            }
        }
        
        selectedTakeData = singleTakeData;
        
        const takeLabel = singleTakeData.take_label || take.take_label || `TAKE #${singleTakeData.take_number || take.take_number || (takeIndex + 1)}`;
        const recTitle = singleTakeData.recording_title || recording.recording_title || 'RECORDING';
        viewerSessionTitle.innerText = `${recTitle}  ›  ${takeLabel}`;
        
        const latency = singleTakeData.latency_seconds || take.latency_seconds || 0;
        const tokens = (singleTakeData.usage && singleTakeData.usage.total_tokens) || singleTakeData.total_tokens || take.total_tokens || 0;
        const modelName = singleTakeData.model || take.model || 'gpt-4o';
        const dateStr = singleTakeData.timestamp ? new Date(singleTakeData.timestamp).toLocaleTimeString() : 'N/A';
        
        viewerBadges.innerHTML = `
            <span class="meta-pill">Parent: <strong>${escapeHtml(recTitle)}</strong></span>
            <span class="meta-pill">Selected: <strong>${escapeHtml(takeLabel)}</strong></span>
            <span class="meta-pill">Model: <strong>${escapeHtml(modelName)}</strong></span>
            <span class="meta-pill">Latency: <strong>${latency}s</strong></span>
            <span class="meta-pill">Tokens: <strong>${tokens}</strong></span>
            <span class="meta-pill">File: <strong>${escapeHtml(take.filename || (singleTakeData.turn_id ? singleTakeData.turn_id + '.json' : 'take.json'))}</strong></span>
            <span class="meta-pill">Time: <strong>${dateStr}</strong></span>
        `;
        
        // Render Formatted View for this individual take
        renderFormattedTurns([singleTakeData]);
        
        // Render Raw JSON View showing this individual take's JSON file
        rawJsonContent.textContent = JSON.stringify(singleTakeData, null, 2);
        
    } catch (e) {
        alert('Failed to load take JSON: ' + e.message);
    }
}

function selectRecordingOverview(recording) {
    if (recording && recording.takes && recording.takes.length > 0) {
        selectTake(recording.takes[0], recording, 0);
    } else {
        selectedTakeFilename = recording.session_id;
        selectedRecordingContext = recording;
        viewerEmptyState.style.display = 'none';
        viewerContent.style.display = 'flex';
        
        const recTitle = recording.recording_title || 'RECORDING';
        viewerSessionTitle.innerText = `${recTitle} (Empty)`;
        viewerBadges.innerHTML = `<span class="meta-pill">Recording: <strong>${escapeHtml(recTitle)}</strong></span>`;
        populateTakesDropdown(recording, 0);
        renderFormattedTurns([]);
        rawJsonContent.textContent = JSON.stringify(recording, null, 2);
    }
}

// Dropdown Change & Navigation Listeners
takeSelectDropdown.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (!isNaN(idx) && selectedRecordingContext && selectedRecordingContext.takes && selectedRecordingContext.takes[idx]) {
        selectTake(selectedRecordingContext.takes[idx], selectedRecordingContext, idx);
    }
});

prevTakeBtn.addEventListener('click', () => {
    if (!selectedRecordingContext || !selectedRecordingContext.takes) return;
    const currentIdx = parseInt(takeSelectDropdown.value) || 0;
    if (currentIdx > 0) {
        const targetIdx = currentIdx - 1;
        selectTake(selectedRecordingContext.takes[targetIdx], selectedRecordingContext, targetIdx);
    }
});

nextTakeBtn.addEventListener('click', () => {
    if (!selectedRecordingContext || !selectedRecordingContext.takes) return;
    const currentIdx = parseInt(takeSelectDropdown.value) || 0;
    if (currentIdx < selectedRecordingContext.takes.length - 1) {
        const targetIdx = currentIdx + 1;
        selectTake(selectedRecordingContext.takes[targetIdx], selectedRecordingContext, targetIdx);
    }
});

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderFormattedTurns(turns) {
    formattedTurnsList.innerHTML = '';
    
    if (!turns || turns.length === 0) {
        formattedTurnsList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No conversation take found in this file.</div>';
        return;
    }
    
    turns.forEach((turn, idx) => {
        const card = document.createElement('div');
        card.className = 'turn-card';
        
        const takeLabel = turn.take_label || `TAKE #${turn.take_number || turn.turn_number || turn.turn || idx + 1}`;
        const latencyStr = turn.latency_seconds ? `${turn.latency_seconds}s` : 'N/A';
        const tokensStr = (turn.usage && turn.usage.total_tokens) ? `${turn.usage.total_tokens} tokens` : (turn.total_tokens ? `${turn.total_tokens} tokens` : '');
        
        let toolsHtml = '';
        if (turn.tool_calls && turn.tool_calls.length > 0) {
            const items = turn.tool_calls.map(tc => {
                if (tc.summary) {
                    return `<div class="tool-call-item">${escapeHtml(tc.summary)}</div>`;
                }
                const name = tc.name || "Tool";
                const args = typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || tc.args || {});
                return `<div class="tool-call-item">🔧 <strong>${escapeHtml(name)}</strong>: ${escapeHtml(args)}</div>`;
            }).join('');
            
            toolsHtml = `
                <div class="tool-calls-box">
                    <div class="tool-calls-heading">⚙️ Tool Operations Executed</div>
                    ${items}
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="turn-top">
                <span class="turn-title">${escapeHtml(takeLabel)}</span>
                <div class="turn-stats">
                    ${latencyStr !== 'N/A' ? `<span>⏱️ ${latencyStr}</span>` : ''}
                    ${tokensStr ? `<span>🔢 ${tokensStr}</span>` : ''}
                </div>
            </div>
            
            <div class="bubble-row">
                <span class="bubble-label">👤 User</span>
                <div class="bubble-user">${escapeHtml(turn.user_message || turn.user || 'N/A')}</div>
            </div>
            
            ${toolsHtml}
            
            <div class="bubble-row">
                <span class="bubble-label">🤖 Document Assistant</span>
                <div class="bubble-assistant">${escapeHtml(turn.assistant_response || turn.assistant || 'N/A')}</div>
            </div>
        `;
        
        formattedTurnsList.appendChild(card);
    });
}

// Action Buttons in Viewer
copyJsonBtn.addEventListener('click', () => {
    if (!selectedTakeData) return;
    const jsonStr = JSON.stringify(selectedTakeData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
        const orig = copyJsonBtn.innerText;
        copyJsonBtn.innerText = '✅ Copied!';
        setTimeout(() => copyJsonBtn.innerText = orig, 2000);
    });
});

downloadJsonBtn.addEventListener('click', () => {
    if (!selectedTakeData) return;
    const jsonStr = JSON.stringify(selectedTakeData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let fname = 'take.json';
    if (selectedTakeFilename) {
        fname = selectedTakeFilename.split('/').pop();
    } else if (selectedTakeData.turn_id) {
        fname = `${selectedTakeData.turn_id}.json`;
    }
    if (!fname.endsWith('.json')) fname += '.json';
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

deleteSessionBtn.addEventListener('click', async () => {
    if (!selectedTakeFilename) return;
    if (confirm(`Are you sure you want to delete ${selectedTakeFilename}?`)) {
        try {
            const res = await fetch(`/api/recordings/${encodeURIComponent(selectedTakeFilename)}`, { method: 'DELETE' });
            if (res.ok) {
                selectedTakeFilename = null;
                selectedTakeData = null;
                await loadRecordingsList();
            } else {
                alert('Failed to delete.');
            }
        } catch(e) {
            alert('Error deleting: ' + e.message);
        }
    }
});

// Load recordings count initially
loadRecordingsList();
