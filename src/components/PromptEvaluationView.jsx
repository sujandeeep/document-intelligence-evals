import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Download,
  Award,
  Layers,
  FileText,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Clock,
  Zap,
  BarChart2,
  Maximize2,
  X,
  ExternalLink,
  Info,
  Database,
  Calendar,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { downloadPromptEvaluationPDF } from '../services/promptEvalPdfGenerator';

/**
 * 10 Comprehensive, Production-Grade System Prompts (~250-350 words each)
 */
export const DEFAULT_10_SYSTEM_PROMPTS = [
  {
    id: 1,
    name: 'Strict Concise Analyst',
    description: 'Executive briefing delivering ultra-dense facts in under 150 words.',
    word_count: '~280 words',
    system_prompt: `You are an elite corporate intelligence analyst specialized in high-efficiency, executive-level briefings where reading time directly impacts operational throughput.

### CORE OBJECTIVES
Your sole mandate is to deliver ultra-dense, factual, and actionable answers in strictly fewer than 150 words. You must synthesize complex data, financial metrics, and architectural parameters into immediate bottom-line conclusions without losing critical nuance.

### METHODOLOGY & EXECUTION RULES
1. Bottom Line Up Front (BLUF): State the core answer in the very first sentence. Never open with pleasantries, conversational filler, or introductory meta-language.
2. Density Over Narrative: Prioritize bullet points, key metrics, and tabular summaries over continuous narrative prose.
3. Information Hierarchy: Highlight primary drivers first, followed immediately by secondary implications and numerical thresholds.
4. Precision: Always include specific numbers, percentages, dollar figures, and dates where available in the context.

### CONSTRAINTS & NEGATIVE PROMPTING
- Under no circumstances exceed 150 words.
- Do not repeat the user's question back to them.
- Do not state obvious meta-qualifiers like "Based on the provided documents" or "It is important to note".
- Never provide unsolicited background history unless specifically queried. If data is missing from the source context, state "Data missing from context" in 4 words or fewer.`,
  },
  {
    id: 2,
    name: 'Step-by-Step Chain-of-Thought',
    description: 'Deconstructs problems into explicit logical steps and intermediate deductions.',
    word_count: '~295 words',
    system_prompt: `You are an advanced mathematical, scientific, and architectural reasoning engine designed to solve complex multi-variable problems through formal, deductive chain-of-thought derivation.

### CORE OBJECTIVES
You must systematically deconstruct every inquiry into explicit logical primitives, formal intermediate hypotheses, and rigorously justified deductions before asserting any final conclusion. Zero intellectual leaps are permitted.

### STEP-BY-STEP PROTOCOL
Phase 1 - Problem Decomposition & State Representation:
Identify all given constants, variables, boundary constraints, and implicit assumptions present in the prompt or document. Formulate an explicit problem formulation.

Phase 2 - Deductive Reasoning & Step-by-Step Derivation:
- Show every intermediate calculation, transformation, or logical deduction sequentially (Step 1, Step 2, Step 3...).
- For each step, explicitly state the governing rule, theorem, financial formula, or semantic relationship being applied.
- Highlight any potential branch points or edge cases encountered during calculation.

Phase 3 - Sanity Checks & Dimensional Consistency:
Verify intermediate figures against expected order-of-magnitude bounds, dimensional units, and physical/economic constraints.

Phase 4 - Definitive Synthesized Conclusion:
State the final answer with absolute clarity, summarizing key quantitative values and their operational implications.

### CONSTRAINTS
Do not rush to the final answer. Prioritize transparency of deduction over brevity. Clearly distinguish between mathematically proven deductions and empirical assumptions.`,
  },
  {
    id: 3,
    name: 'Evidentiary Fact-Grounded Verifier',
    description: 'Answers strictly grounded in document facts with bracketed citations.',
    word_count: '~310 words',
    system_prompt: `You are a senior evidentiary fact-checker, legal auditor, and strict document-grounded intelligence agent. Your primary directive is zero-tolerance for unsupported claims, hallucinated data, or speculative extrapolation.

### GROUNDING PROTOCOLS & MANDATES
1. Verifiable Citations Only: Every factual assertion, financial metric, architectural parameter, or timeline claim must be directly grounded in the provided document context.
2. Exact Citation Markers: Append an explicit citation bracket to every claim (e.g., [Document: Section 2.1, Paragraph 3] or [Context Line 45-48]). If direct quotes are useful, enclose exact source excerpts in quotation marks.
3. Explicit Absence Flagging: If the user's query asks for information that is NOT explicitly stated in or directly deducible from the source text, you must explicitly state: "NOT FOUND IN PROVIDED CONTEXT: The available documents do not contain information regarding [X]."
4. Neutral Auditor Tone: Maintain an objective, dispassionate legal-auditor voice. Do not speculate on what the author "probably meant" or "might have intended".

### VERIFICATION PIPELINE
- Step 1: Scan provided context for all occurrences of relevant keywords and entities.
- Step 2: Extract verbatim evidence fragments before drafting the response.
- Step 3: Audit your draft against the source text to ensure zero conceptual drift.
- Step 4: Present verified facts first, followed by explicit boundaries of what remains unverified.`,
  },
  {
    id: 4,
    name: 'Senior Executive Briefing (BLUF)',
    description: 'CEO & Board-level advisory with strategic highlights and actionable roadmap.',
    word_count: '~320 words',
    system_prompt: `You are an advisor to the Chief Executive Officer (CEO) and Board of Directors. You specialize in strategic synthesis, capital allocation efficiency, and executive decision frameworks.

### CORE OPERATING PHILOSOPHY
Executives have zero tolerance for verbose background exposition. They require immediate strategic clarity: What is happening? Why does it matter to the enterprise? What specific actions must leadership take?

### MANDATORY BRIEFING STRUCTURE
You must structure your briefing using the following strict headers:

1. BOTTOM LINE UP FRONT (BLUF):
A single punchy paragraph (2-3 sentences max) capturing the strategic imperative, core conclusion, and immediate business impact.

2. STRATEGIC HIGHLIGHTS & FINANCIAL DRIVERS:
3 to 5 structured bullet points detailing revenue impact, margin implications, competitive threats, operational bottlenecks, or risk-adjusted return on investment (ROI). Every bullet must begin with a bold qualitative tag followed by quantitative evidence.

3. SCENARIO ANALYSIS & RISKS:
Briefly contrast the base case against downside risks and organizational vulnerabilities.

4. ACTIONABLE EXECUTIVE RECOMMENDATIONS:
Numbered chronological sequence of concrete executive decisions, owners, and 30/60/90-day milestone deadlines.

### TONE & FORMATTING CONSTRAINTS
Tone must be decisive, authoritative, and boardroom-ready. Avoid academic jargon or technical trivia unless it directly dictates a financial or operational risk threshold.`,
  },
  {
    id: 5,
    name: 'Structured JSON / Schema Pipeline',
    description: 'Raw, validated JSON payload adhering strictly to microservice schema.',
    word_count: '~290 words',
    system_prompt: `You are a programmatic ingestion engine and structured data transformation pipeline within an automated microservices architecture. Your purpose is transforming unstructured prompts and documents into rigorously validated, schema-compliant JSON payloads.

### JSON SCHEMA SPECIFICATION
You must output ONLY a valid JSON object matching the following TypeScript schema:
{
  "summary": string,
  "intent": "analytical" | "informational" | "evaluative" | "procedural",
  "confidence_score": number,
  "key_findings": Array<{
    "id": number,
    "topic": string,
    "finding": string,
    "severity": "low" | "medium" | "high" | "critical",
    "metrics": Record<string, string | number>
  }>,
  "risk_factors": Array<{
    "risk": string,
    "mitigation": string,
    "probability": "low" | "medium" | "high"
  }>,
  "action_items": string[]
}

### STRICT PROGRAMMATIC CONSTRAINTS
- Output ONLY the raw JSON string. Do not wrap output in markdown code blocks like \`\`\`json ... \`\`\` unless explicitly requested.
- Absolutely zero preamble, introduction, markdown headers, or post-generation explanations.
- All strings must be properly escaped. Ensure all numbers are typed as numbers, not strings.
- Validate that all required keys are populated with high-fidelity, extracted semantic content.`,
  },
  {
    id: 6,
    name: 'Socratic Pedagogical Tutor',
    description: 'Intuitive real-world analogies, scaffolded proofs, and thought-provoking probes.',
    word_count: '~310 words',
    system_prompt: `You are a world-class university professor and pedagogical mentor known for transforming deeply intimidating mathematical, algorithmic, and systems engineering concepts into intuitive, unforgettable mental models.

### PEDAGOGICAL PHILOSOPHY
Memorizing formulas without geometric or physical intuition leads to brittle knowledge. True mastery occurs when learners construct mental scaffolds that make complex results feel inevitable.

### INSTRUCTIONAL METHODOLOGY
1. Grounding in the Intuitive: Begin by stripping away technical jargon. Explain the core mechanism using a visceral real-world physical or everyday analogy that any human can visualize.
2. Progressive Formalization: Once the intuition is secured, gradually introduce formal definitions, symbols, and mathematical formulations. Explain why each variable exists and what role it plays in the system.
3. The "Why It Matters" Connection: Tie the mathematical or technical concept to practical engineering trade-offs (e.g., latency vs. accuracy, space vs. time, memory overhead vs. throughput).
4. The Socratic Probe: Conclude your explanation with a thought-provoking, non-trivial conceptual question that challenges the learner to apply the concept to a new edge case or hypothetical scenario.

### TONE & DEMEANOR
Supportive, intellectually stimulating, and delightfully lucid. Never speak down to the learner; treat them as a brilliant future colleague discovering a fascinating truth for the first time.`,
  },
  {
    id: 7,
    name: 'Adversarial Risk Auditor',
    description: "Stress-tests assumptions, detects blind spots, and evaluates failure modes.",
    word_count: '~325 words',
    system_prompt: `You are an adversarial systems auditor, red-team risk strategist, and institutional devil's advocate. Your mission is stress-testing proposals, assumptions, code, and financial models by aggressively uncovering points of failure, blind spots, and latent vulnerabilities.

### OPERATIONAL MINDSET
Optimism is the enemy of resilient engineering. Every strategy looks compelling in a pitch deck until edge cases, distributed latency, adverse market selection, or Byzantine actors destabilize the assumptions. You exist to reveal the cracks before deployment.

### AUDIT EXECUTION FRAMEWORK
1. Unstated Assumptions Critique:
Identify all silent premises the author takes for granted (e.g., uninterrupted network connectivity, stable margins, rational actors, infinite liquidity, clean input formatting).

2. Failure Modes & Threat Vectors:
Enumerate 3 to 5 realistic failure scenarios: What happens at 100x scale? What happens when dependencies fail? What are the economic incentives for abuse?

3. Downside Sensitivity & Asymmetric Risk:
Quantify the worst-case scenario. Is the potential loss bounded, or does an catastrophic tail-risk exist?

4. Counter-Proposals & Hardening Recommendations:
For every vulnerability flagged, provide a concrete architectural or operational mitigation (e.g., circuit breakers, hedge ratios, fallback states, schema validations).

### CONSTRAINTS
Do not validate or flatter the user's premise. Be intellectually relentless, deeply skeptical, and rigorously constructive.`,
  },
  {
    id: 8,
    name: 'Quantitative Specialist (Formula-First)',
    description: 'Formal mathematical formulation, LaTeX equation proofs, and complexity bounds.',
    word_count: '~305 words',
    system_prompt: `You are a quantitative researcher, algorithmic trader, and computational mathematician. Your communication standard is formal mathematical modeling, explicit symbolic notation, and rigorous numerical calibration.

### QUANTITATIVE DIRECTIVES
1. Mathematical Formulation First: Translate the user's inquiry into formal mathematical notation, differential equations, recurrence relations, probability distributions, or cost optimization functions before entering verbal discussion.
2. Explicit Parameter Tables: Clearly define every parameter, variable, dimension, and physical unit in an organized LaTeX or tabular format.
3. Step-by-Step Numerical Computation:
- Show exact formulas before substituting numbers.
- State standard assumptions (e.g., i.i.d. random variables, zero-drift conditions, Poisson arrival rates).
- Carry arithmetic calculations through to explicit decimal precision and display percentage errors or confidence intervals where applicable.
4. Algorithmic Complexity & Bounds: State time complexity O(n), space bounds, and asymptotic properties of the solution.

### FORMATTING STANDARDS
Use clean markdown LaTeX blocks ($$ ... $$ and $ ... $) for equations. Avoid imprecise approximations like "very fast" or "quite large"; always provide numerical bounds, percentiles (p50, p95, p99), or asymptotic rates.`,
  },
  {
    id: 9,
    name: 'Zero-Shot Direct Technical Responder',
    description: '100% pure technical signal with zero conversational fluff, greetings, or filler.',
    word_count: '~275 words',
    system_prompt: `You are an ultra-high-density technical knowledge engine designed for software engineers and systems architects who require immediate, unadorned technical truth.

### CORE OPERATING PROTOCOL
You reject conversational conventions, polite preamble, introductory framing, conclusion summaries, and moralizing caveats. Your value proposition is 100% pure technical signal with zero wasted tokens.

### EXECUTION RULES
1. Start directly with the code, command, configuration, or technical definition on Line 1.
2. Code Blocks & Architecture: When code or commands are required, provide production-ready, typed, syntax-highlighted blocks with concise inline comments explaining non-trivial logic.
3. Architecture Trade-offs: Contrast runtime performance, memory footprint, thread safety, and dependency overhead in bulleted technical bullet points.
4. Error Handling & Edge Cases: Explicitly account for null checks, timeout thresholds, concurrency race conditions, and boundary conditions.

### FORBIDDEN PATTERNS
- Greetings ("Hello", "Hope this helps", "Great question").
- Meta-introductions ("In this response, I will explain...").
- Post-response filler ("Let me know if you need any further assistance").
- Generic safety disclaimers unless a literal critical infrastructure hazard is present.`,
  },
  {
    id: 10,
    name: 'Multi-Perspective Strategic Synthesizer',
    description: 'Triangulates decisions through Operational, Financial, and Technical lenses.',
    word_count: '~330 words',
    system_prompt: `You are an enterprise systems architect and principal polymath advisor who synthesizes complex business, algorithmic, and operational challenges across divergent organizational perspectives.

### SYNTHESIS MANDATE
Complex decisions cannot be evaluated through a single lens without generating blind spots. A technical breakthrough that destroys gross margin is a failure; an ultra-cheap workflow that frustrates operational teams is unsustainable. You must evaluate the query through three distinct, balanced perspectives:

### THREE-LENS EVALUATION FRAMEWORK

LENS 1: OPERATIONAL & HUMAN WORKFLOW EFFICIENCY
- How does this impact day-to-day team velocity, cognitive overhead, developer experience, and maintenance burden?
- What are the training, tooling, and operational runbook requirements?

LENS 2: FINANCIAL & INFRASTRUCTURE COST OPTIMIZATION
- Direct cost breakdown: Token pricing per million, compute instances, database IOPS, storage tiering.
- Unit economics: Marginal cost per customer turn vs. lifetime customer value (LTV).
- Amortization and economies of scale at 10x and 100x volume.

LENS 3: TECHNICAL ROBUSTNESS & FUTURE-PROOF ARCHITECTURE
- Latency ceilings (p99 bounds), failure resilience, state recovery, and loose coupling.
- Technical debt considerations and migration difficulty over a 24-month horizon.

### FINAL STRATEGIC RECONCILIATION
Conclude with a unified synthesis matrix recommending the exact operational compromises necessary to achieve maximum equilibrium across all three dimensions.`,
  },
];

const AVAILABLE_MODELS = [
  // GPT-6 Tier
  { id: 'gpt-6-astra', label: 'gpt-6-astra', tier: 'Astra Flagship', inputPrice: '$10.00', outputPrice: '$50.00' },
  { id: 'gpt-6.1-sol', label: 'gpt-6.1-sol', tier: 'Sol High-End', inputPrice: '$2.00', outputPrice: '$10.00' },
  { id: 'gpt-6.1-terra', label: 'gpt-6.1-terra', tier: 'Terra Balanced', inputPrice: '$1.00', outputPrice: '$5.00' },
  { id: 'gpt-6-luna', label: 'gpt-6-luna', tier: 'Luna High-Vol', inputPrice: '$0.10', outputPrice: '$0.50' },
  { id: 'gpt-6-sol', label: 'gpt-6-sol', tier: 'Sol Original', inputPrice: '$2.00', outputPrice: '$10.00' },

  // GPT-5.6 Tier
  { id: 'gpt-5.6-sol', label: 'gpt-5.6-sol', tier: 'GPT-5.6 Sol', inputPrice: '$4.00', outputPrice: '$20.00' },
  { id: 'gpt-5.6-terra', label: 'gpt-5.6-terra', tier: 'GPT-5.6 Terra', inputPrice: '$2.00', outputPrice: '$12.00' },
  { id: 'gpt-5.6-luna', label: 'gpt-5.6-luna', tier: 'GPT-5.6 Luna', inputPrice: '$0.20', outputPrice: '$1.20' },

  // GPT-5.5 & 5.4 Tier
  { id: 'gpt-5.5', label: 'gpt-5.5', tier: 'GPT-5.5 Flagship', inputPrice: '$5.00', outputPrice: '$30.00' },
  { id: 'gpt-5.5-pro', label: 'gpt-5.5-pro', tier: 'GPT-5.5 Pro', inputPrice: '$30.00', outputPrice: '$180.00' },
  { id: 'gpt-5.4', label: 'gpt-5.4', tier: 'GPT-5.4 Balanced', inputPrice: '$2.50', outputPrice: '$15.00' },
  { id: 'gpt-5.4-pro', label: 'gpt-5.4-pro', tier: 'GPT-5.4 Pro', inputPrice: '$30.00', outputPrice: '$180.00' },
  { id: 'gpt-5.4-mini', label: 'gpt-5.4-mini', tier: 'GPT-5.4 Mini', inputPrice: '$0.75', outputPrice: '$4.50' },
  { id: 'gpt-5.2', label: 'gpt-5.2', tier: 'GPT-5.2 Workhorse', inputPrice: '$1.75', outputPrice: '$14.00' },

  // Omni & Reasoning Flagships
  { id: 'gpt-4o', label: 'gpt-4o', tier: 'Omni Flagship', inputPrice: '$2.50', outputPrice: '$10.00' },
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', tier: 'Omni Mini', inputPrice: '$0.15', outputPrice: '$0.60' },
  { id: 'o3-mini', label: 'o3-mini', tier: 'Reasoning Fast', inputPrice: '$1.10', outputPrice: '$4.40' },
  { id: 'o1', label: 'o1', tier: 'Reasoning Flagship', inputPrice: '$15.00', outputPrice: '$60.00' },
  { id: 'chatgpt-4o-latest', label: 'chatgpt-4o-latest', tier: 'Dynamic Web', inputPrice: '$5.00', outputPrice: '$15.00' },
  { id: 'gpt-4-turbo', label: 'gpt-4-turbo', tier: 'GPT-4 Turbo', inputPrice: '$10.00', outputPrice: '$30.00' },
];

export const JUDGE_MODELS = [
  { id: 'gpt-6.1-sol', label: 'gpt-6.1-sol (Extra High Reasoning)', tag: 'Recommended' },
  { id: 'gpt-6-astra', label: 'gpt-6-astra (Flagship Reasoning)', tag: 'Peak Intelligence' },
  { id: 'gpt-5.5', label: 'gpt-5.5 (Flagship Judge)', tag: 'Standard' },
  { id: 'gpt-4o', label: 'gpt-4o (Omni Judge)', tag: 'Fast' },
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini (Lightweight Judge)', tag: 'Budget' },
  { id: 'o3-mini', label: 'o3-mini (Reasoning Judge)', tag: 'STEM & Logic' },
  { id: 'o1', label: 'o1 (Deep Reasoning Judge)', tag: 'Exhaustive' },
];

export function PromptEvaluationView({
  recordings = [],
  activeSession,
  showToast,
  onSpendUpdate,
}) {
  // Session & Take selection from existing recordings
  const [selectedSessionId, setSelectedSessionId] = useState(
    activeSession?.session_id || (recordings[0]?.session_id ?? '')
  );
  const [selectedTakeIndex, setSelectedTakeIndex] = useState(0);

  const [selectedModel, setSelectedModel] = useState('gpt-6-astra');
  const [selectedJudgeModel, setSelectedJudgeModel] = useState('gpt-6.1-sol');
  const [promptText, setPromptText] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [referenceResponse, setReferenceResponse] = useState('');

  // 10 System Prompts state
  const [systemPrompts, setSystemPrompts] = useState(DEFAULT_10_SYSTEM_PROMPTS);
  const [expandedPromptId, setExpandedPromptId] = useState(null);

  // System Prompt Generator State (AI generation of system prompt variants)
  const [generatorModel, setGeneratorModel] = useState('gpt-4o');
  const [generatorPromptCount, setGeneratorPromptCount] = useState(5);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  // Manual Add Prompt Modal State
  const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [newPromptSystemText, setNewPromptSystemText] = useState('');

  // Execution & Analytics State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatingPhase, setEvaluatingPhase] = useState(''); // Live process acknowledgement
  const [promptProgressMap, setPromptProgressMap] = useState({}); // { [promptId]: 'pending' | 'evaluating' | 'completed' | 'error' }
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [evalData, setEvalData] = useState(null);
  const [cumulativeSpend, setCumulativeSpend] = useState(0);
  const [selectedInspectPrompt, setSelectedInspectPrompt] = useState(null);
  const [viewTab, setViewTab] = useState('results'); // 'results' | 'graph'

  const canvasRef = useRef(null);

  // Derive current session and its takes from existing recordings
  const currentSession =
    recordings.find((r) => r.session_id === selectedSessionId) || activeSession || recordings[0];
  const takes = currentSession?.takes || [];

  // Update selectedSessionId if recordings change
  useEffect(() => {
    if (recordings.length > 0 && !selectedSessionId) {
      setSelectedSessionId(recordings[0].session_id);
    }
  }, [recordings, selectedSessionId]);

  // Synchronize prompt question, document context, and original assistant response when session or take changes
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
    } else if (currentSession?.turns && currentSession.turns.length > 0) {
      const lastTurn = currentSession.turns[currentSession.turns.length - 1];
      setPromptText(lastTurn.user_message || lastTurn.prompt || '');
      setDocumentText(lastTurn.document_text || '');
      setDocumentName(lastTurn.document_name || '');
      setReferenceResponse(lastTurn.assistant_response || lastTurn.answer || lastTurn.response || '');
    }
  }, [selectedSessionId, selectedTakeIndex, takes, currentSession]);

  const handlePromptChange = (id, field, value) => {
    setSystemPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleGenerateSystemPrompts = async () => {
    try {
      setIsGeneratingPrompts(true);
      if (showToast) showToast(`Generating ${generatorPromptCount} system prompts with ${generatorModel}...`);

      const res = await fetch('/api/generate_system_prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: generatorModel,
          num_prompts: Number(generatorPromptCount) || 5,
          user_message: promptText.trim(),
          document_text: documentText.trim(),
          document_name: documentName,
          domain_hint: documentName ? `Auditing document: ${documentName}` : 'Enterprise Analysis',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded with ${res.status}`);

      if (data.prompts && data.prompts.length > 0) {
        setSystemPrompts(data.prompts);
        setExpandedPromptId(data.prompts[0].id);
        if (showToast) showToast(`Successfully generated ${data.prompts.length} custom system prompts via ${generatorModel}!`);
      }
    } catch (err) {
      console.error('System prompt generation error:', err);
      if (showToast) showToast(`Failed to generate prompts: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleResetPrompts = () => {
    setSystemPrompts(DEFAULT_10_SYSTEM_PROMPTS);
    if (showToast) showToast('Reset system prompts to default strategies');
  };

  const handleAddCustomPrompt = (e) => {
    if (e) e.preventDefault();
    const name = newPromptName.trim() || `Custom Strategy #${systemPrompts.length + 1}`;
    const desc = newPromptDescription.trim() || 'Custom user-defined system prompt.';
    const text = newPromptSystemText.trim();
    if (!text) {
      if (showToast) showToast('Please enter the system prompt content.', 'warning');
      return;
    }

    const words = text.split(/\s+/).length;
    const newPromptObj = {
      id: Date.now(),
      name,
      description: desc,
      word_count: `~${words} words`,
      system_prompt: text,
    };

    setSystemPrompts((prev) => [...prev, newPromptObj]);
    setExpandedPromptId(newPromptObj.id);
    setNewPromptName('');
    setNewPromptDescription('');
    setNewPromptSystemText('');
    setIsAddPromptModalOpen(false);
    if (showToast) showToast(`Added prompt "${name}"!`);
  };

  const handleRunEvaluation = async () => {
    if (!promptText.trim()) {
      if (showToast) showToast('Please select a take or enter a prompt question to evaluate.', 'warning');
      return;
    }

    if (!systemPrompts || systemPrompts.length === 0) {
      if (showToast) showToast('Please provide at least one system prompt candidate.', 'warning');
      return;
    }

    // Initialize progress map
    const initialMap = {};
    systemPrompts.forEach((p) => {
      initialMap[p.id] = 'evaluating';
    });
    setPromptProgressMap(initialMap);
    setIsEvaluating(true);
    setEvaluatingPhase(`Dispatching ${systemPrompts.length} prompt benchmarks to ${selectedModel}...`);

    try {
      if (showToast) showToast(`Benchmarking ${systemPrompts.length} system prompts concurrently on ${selectedModel}...`);

      const currentTake = takes[selectedTakeIndex] || takes[0];
      const payloadBase = {
        model_id: selectedModel,
        judge_model: selectedJudgeModel,
        user_message: promptText.trim(),
        document_text: documentText.trim(),
        document_name: documentName,
        reference_response: referenceResponse.trim(),
      };

      // Launch individual prompt evaluations concurrently for live streaming progress
      let completedCount = 0;
      const individualPromises = systemPrompts.map(async (pItem) => {
        try {
          const res = await fetch('/api/single_prompt_eval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payloadBase,
              prompt_item: pItem,
            }),
          });
          const data = await res.json();
          completedCount += 1;
          if (!res.ok || !data.result) {
            setPromptProgressMap((prev) => ({ ...prev, [pItem.id]: 'error' }));
            setEvaluatingPhase(`[${completedCount}/${systemPrompts.length}] "${pItem.name}" failed — waiting on remaining...`);
            return null;
          }
          const isSuccess = data.result.status === 'success';
          setPromptProgressMap((prev) => ({ ...prev, [pItem.id]: isSuccess ? 'completed' : 'error' }));
          setEvaluatingPhase(`[${completedCount}/${systemPrompts.length}] "${pItem.name}" graded by ${selectedJudgeModel} (${data.result.quality_score || 0}%)`);
          return data.result;
        } catch (err) {
          console.error(`Error evaluating prompt ${pItem.name}:`, err);
          completedCount += 1;
          setPromptProgressMap((prev) => ({ ...prev, [pItem.id]: 'error' }));
          setEvaluatingPhase(`[${completedCount}/${systemPrompts.length}] Error evaluating "${pItem.name}"`);
          return null;
        }
      });

      // Wait for all individual prompt evaluations
      await Promise.all(individualPromises);

      setEvaluatingPhase(`Synthesizing Pareto rankings and winner analysis via ${selectedJudgeModel}...`);

      // Authoritative aggregation endpoint for Pareto curves and winner logic
      const res = await fetch('/api/prompt_eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadBase,
          selected_take_info: {
            session_id: currentSession?.session_id,
            recording_title: currentSession?.recording_title || 'RECORDING',
            take_label: currentTake?.take_label || `TAKE #${selectedTakeIndex + 1}`,
            turn_id: currentTake?.turn_id,
          },
          system_prompts: systemPrompts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded with ${res.status}`);

      setEvalData(data);
      const batchSpend = (data.results || []).reduce((acc, r) => acc + (r.total_cost || 0), 0);
      setCumulativeSpend((prev) => prev + batchSpend);
      if (onSpendUpdate) onSpendUpdate(batchSpend);
      setEvaluatingPhase(`Evaluation complete! Graded ${systemPrompts.length} prompts using ${selectedJudgeModel}.`);
      if (showToast) showToast(`${systemPrompts.length}-System Prompt evaluation completed! Burned $${batchSpend.toFixed(5)} USD.`);
    } catch (err) {
      console.error('Prompt evaluation error:', err);
      setEvaluatingPhase(`Evaluation failed: ${err.message}`);
      if (showToast) showToast(`Prompt evaluation failed: ${err.message}`, 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Render on-screen canvas chart
  useEffect(() => {
    if (!evalData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    const valid = (evalData.results || []).filter((r) => r.status === 'success');
    if (valid.length === 0) return;

    const sorted = [...valid].sort((a, b) => a.total_cost - b.total_cost);

    const pL = 70;
    const pR = 70;
    const pT = 40;
    const pB = 105;
    const cW = width - pL - pR;
    const cH = height - pT - pB;

    const maxScore = 100;
    const minScore = 0;
    const costs = sorted.map((r) => r.total_cost);
    const maxCost = Math.max(...costs) * 1.25 || 0.001;
    const minCost = 0;

    // Grid Lines
    for (let i = 0; i <= 4; i++) {
      const y = pT + (cH / 4) * i;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pL, y);
      ctx.lineTo(pL + cW, y);
      ctx.stroke();

      // Left Axis: Quality %
      const scoreVal = Math.round(maxScore - (maxScore / 4) * i);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.fillText(`${scoreVal}%`, pL - 10, y + 4);

      // Right Axis: Cost $
      const costVal = (maxCost - (maxCost / 4) * i).toFixed(5);
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'left';
      ctx.fillText(`$${costVal}`, pL + cW + 10, y + 4);
    }

    const stepX = cW / Math.max(1, sorted.length - 1);
    const pts = sorted.map((p, idx) => {
      const x = pL + idx * stepX;
      const yScore = pT + cH - ((p.quality_score - minScore) / (maxScore - minScore)) * cH;
      const yCost = pT + cH - ((p.total_cost - minCost) / (maxCost - minCost)) * cH;
      return { p, x, yScore, yCost, idx };
    });

    // Quality Score line (Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.yScore);
      else ctx.lineTo(pt.x, pt.yScore);
    });
    ctx.stroke();

    // Cost line (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.yCost);
      else ctx.lineTo(pt.x, pt.yCost);
    });
    ctx.stroke();

    // Points & Angled Labels
    pts.forEach((pt) => {
      // Score dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt.x, pt.yScore, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cost dot
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(pt.x, pt.yCost, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bottom tick
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(pt.x, pT + cH);
      ctx.lineTo(pt.x, pT + cH + 6);
      ctx.stroke();

      // Angled text at -38 degrees
      ctx.save();
      ctx.translate(pt.x, pT + cH + 14);
      ctx.rotate(-Math.PI / 4.7);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'right';
      const shortName = pt.p.name.length > 20 ? pt.p.name.substring(0, 18) + '..' : pt.p.name;
      ctx.fillText(`#${pt.idx + 1} ${shortName}`, 0, 0);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${pt.p.quality_score}% score`, 0, 12);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`$${pt.p.total_cost.toFixed(5)}`, 0, 23);

      ctx.restore();
    });

    // Sweet Spot / Winner Highlight
    const winnerId = evalData.winner?.id;
    const winnerPt = pts.find((pt) => pt.p.id === winnerId);
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
  }, [evalData, viewTab]);

  const handleDownloadPdf = async () => {
    if (!evalData) return;
    try {
      setIsGeneratingPdf(true);
      if (showToast) showToast('Generating 10-Prompt Evaluation PDF report...');
      await downloadPromptEvaluationPDF(evalData);
      if (showToast) showToast('PDF report downloaded successfully!');
    } catch (err) {
      console.error('PDF error:', err);
      if (showToast) showToast(`Failed to export PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectedModelSpec = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const currentTakeObj = takes[selectedTakeIndex] || takes[0];

  return (
    <main
      style={{
        flex: 1,
        backgroundColor: 'var(--surface-canvas)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          height: '48px',
          backgroundColor: 'var(--surface-base)',
          borderBottom: '1px solid var(--border-default)',
          padding: '0 var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Sparkles size={15} style={{ color: 'var(--intent-primary)' }} />
          <h1 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            Prompt Evals
          </h1>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              backgroundColor: 'var(--intent-primary-subtle)',
              color: 'var(--intent-primary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {systemPrompts.length} Prompts Benchmark
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              backgroundColor: 'var(--intent-success-subtle)',
              border: '1px solid var(--intent-success-border)',
              borderRadius: 'var(--radius-xs)',
              padding: '2px 6px',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--intent-success)', fontWeight: 700 }}>
              Judge:
            </span>
            <select
              value={selectedJudgeModel}
              onChange={(e) => setSelectedJudgeModel(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--intent-success)',
                fontSize: '10px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.tier})
                </option>
              ))}
            </select>
          </div>

          {evalData?.results && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'var(--intent-warning-subtle)',
                color: 'var(--intent-warning)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Batch: ${evalData.results.reduce((acc, r) => acc + (r.total_cost || 0), 0).toFixed(5)}
            </span>
          )}
          {cumulativeSpend > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'var(--intent-success-subtle)',
                color: 'var(--intent-success)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--intent-success-border)',
              }}
            >
              Session: ${cumulativeSpend.toFixed(5)}
            </span>
          )}

          {/* Live Process Acknowledgement Banner */}
          {isEvaluating && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--intent-primary-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                fontSize: '11px',
                color: 'var(--intent-primary)',
                fontWeight: 600,
                maxWidth: '420px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={evaluatingPhase}
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>{evaluatingPhase || 'Evaluating system prompts in parallel...'}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {evalData && (
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                height: 'var(--control-height-md)',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={14} />
              {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
            </button>
          )}

          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              height: 'var(--control-height-md)',
              padding: '0 var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isEvaluating ? 'var(--text-disabled)' : 'var(--intent-primary-solid)',
              color: 'var(--text-on-accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isEvaluating ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isEvaluating ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>
                  Evaluating ({Object.values(promptProgressMap).filter((s) => s === 'completed').length}/{systemPrompts.length})...
                </span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Run Evaluation ({systemPrompts.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Recording & Take Selector + Model + 10 System Prompts */}
        <div
          style={{
            borderRight: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-base)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px',
            gap: '14px',
          }}
        >
          {/* SECTION A: Recording & Take Source Selector */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--surface-canvas)',
              borderRadius: '8px',
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <Layers size={13} /> Question Source: Existing Recordings & Takes
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {recordings.length} sessions available
              </span>
            </div>

            {/* Dropdown 1: Session / Recording */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Select Existing Session / Recording:
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value);
                  setSelectedTakeIndex(0);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {recordings.length === 0 ? (
                  <option value="">No recorded sessions found</option>
                ) : (
                  recordings.map((r, i) => (
                    <option key={r.session_id || i} value={r.session_id}>
                      {r.recording_title || `RECORDING ${i + 1}`} ({r.session_id?.substring(0, 12)}...) • {r.takes?.length || 0} takes
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Dropdown 2: Specific Take */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Select Specific Take / Turn Question:
              </label>
              <select
                value={selectedTakeIndex}
                onChange={(e) => setSelectedTakeIndex(Number(e.target.value))}
                disabled={takes.length === 0}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {takes.length === 0 ? (
                  <option value={0}>No takes found in this session</option>
                ) : (
                  takes.map((t, i) => {
                    const snippet = (t.user_message || t.prompt || '').substring(0, 48);
                    return (
                      <option key={t.turn_id || i} value={i}>
                        {t.take_label || `TAKE #${i + 1}`} • {snippet}...
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Current Take Metadata Badge */}
            {currentTakeObj && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface-base)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                }}
              >
                <span><strong>Take:</strong> {currentTakeObj.take_label || `#${selectedTakeIndex + 1}`}</span>
                {currentTakeObj.latency_seconds && (
                  <span><strong>Turn Latency:</strong> {currentTakeObj.latency_seconds}s</span>
                )}
                {documentName && (
                  <span style={{ color: '#0284c7' }}><strong>Doc:</strong> {documentName}</span>
                )}
              </div>
            )}
          </div>

          {/* SECTION B: Target Evaluation Model */}
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--surface-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Evaluation Model
              </label>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target Runner</span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedModel(val);
              }}
              disabled={isEvaluating}
              style={{
                width: '100%',
                marginTop: 'var(--space-1)',
                height: 'var(--control-height-md)',
                padding: '0 var(--space-2)',
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              {AVAILABLE_MODELS.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.label} ({m.tier}) — In: {m.inputPrice} / Out: {m.outputPrice}
                </option>
              ))}
            </select>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--space-1)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Input: <strong style={{ color: 'var(--text-primary)' }}>{selectedModelSpec.inputPrice}</strong>/1M</span>
              <span>Output: <strong style={{ color: 'var(--text-primary)' }}>{selectedModelSpec.outputPrice}</strong>/1M</span>
            </div>
          </div>

          {/* SECTION B2: AI System Prompt Generator */}
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--surface-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--intent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={14} /> System Prompt Generator
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Candidate Sizing
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Generator Model:
                </label>
                <select
                  value={generatorModel}
                  onChange={(e) => setGeneratorModel(e.target.value)}
                  disabled={isGeneratingPrompts}
                  style={{
                    width: '100%',
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-2)',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: isGeneratingPrompts ? 'not-allowed' : 'pointer',
                  }}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      style={{
                        backgroundColor: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {m.label} ({m.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  number of prompts:
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={generatorPromptCount}
                  onChange={(e) => setGeneratorPromptCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                  style={{
                    width: '100%',
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-2)',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleGenerateSystemPrompts}
              disabled={isGeneratingPrompts}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
                height: 'var(--control-height-md)',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: isGeneratingPrompts ? 'var(--surface-muted)' : 'var(--surface-hover)',
                color: isGeneratingPrompts ? 'var(--text-disabled)' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isGeneratingPrompts ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isGeneratingPrompts) e.currentTarget.style.backgroundColor = 'var(--surface-selected)';
              }}
              onMouseLeave={(e) => {
                if (!isGeneratingPrompts) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--intent-primary)' }} />
              {isGeneratingPrompts ? 'Generating...' : `Generate ${generatorPromptCount} Prompts`}
            </button>
          </div>

          {/* SECTION B3: LLM as Judge Configuration */}
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--surface-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                LLM as Judge Model
              </label>
              <span style={{ fontSize: '10px', color: 'var(--intent-success)', fontWeight: 600 }}>Active Evaluator</span>
            </div>
            <select
              value={selectedJudgeModel}
              onChange={(e) => setSelectedJudgeModel(e.target.value)}
              disabled={isEvaluating}
              style={{
                width: '100%',
                marginTop: 'var(--space-1)',
                height: 'var(--control-height-md)',
                padding: '0 var(--space-2)',
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              {AVAILABLE_MODELS.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.label} ({m.tier})
                </option>
              ))}
            </select>
          </div>

          {/* SECTION C: User Prompt Question (From Selected Take) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Question / Prompt from Take
              </label>
              <span style={{ fontSize: '10px', color: '#0284c7' }}>
                {promptText.length} chars
              </span>
            </div>
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Question from selected recording take will automatically appear here..."
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '8px 10px',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* SECTION D: Document Context (From Selected Take) */}
          {documentText && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Document Context from Take {documentName ? `(${documentName})` : ''}
                </label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {documentText.length} chars
                </span>
              </div>
              <textarea
                rows={2}
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Optional attached document context..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--surface-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* SECTION D2: Reference Baseline Answer (From Selected Take / Ground Truth) */}
          {referenceResponse && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>★</span> Ground Truth Baseline Answer (From Take)
                </label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {referenceResponse.length} chars
                </span>
              </div>
              <textarea
                rows={3}
                value={referenceResponse}
                onChange={(e) => setReferenceResponse(e.target.value)}
                placeholder="Original model answer recorded in this take will be used as ground truth..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--surface-canvas)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Senior AI Judge GPT-6.1-Sol evaluates all 10 prompts against this baseline answer to verify document lookup accuracy.
              </div>
            </div>
          )}

          {/* SECTION E: System Prompts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {systemPrompts.length} System Prompts
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsAddPromptModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '24px',
                    padding: '0 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--intent-primary-subtle)',
                    color: 'var(--intent-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Add your own custom system prompt"
                >
                  <Plus size={12} /> Add Prompt
                </button>
                <button
                  onClick={handleResetPrompts}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {systemPrompts.map((p, idx) => {
                const isExpanded = expandedPromptId === p.id;
                const words = p.system_prompt.trim().split(/\s+/).length;
                return (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--surface-canvas)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      onClick={() => setExpandedPromptId(isExpanded ? null : p.id)}
                      style={{
                        padding: '9px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: isExpanded ? 'var(--surface-muted)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'var(--surface-base)',
                            color: 'var(--text-secondary)',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.name}
                          </span>
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              color: '#0284c7',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {words} words
                          </span>

                          {/* Live evaluation indicator badge per prompt */}
                          {promptProgressMap[p.id] === 'evaluating' && (
                            <span
                              style={{
                                marginLeft: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                color: '#0284c7',
                                fontWeight: 700,
                              }}
                            >
                              <RefreshCw size={10} className="animate-spin" />
                              <span>Benchmarking...</span>
                            </span>
                          )}
                          {promptProgressMap[p.id] === 'completed' && (
                            <span
                              style={{
                                marginLeft: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                color: '#16a34a',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={10} />
                              <span>Evaluated</span>
                            </span>
                          )}
                          {promptProgressMap[p.id] === 'error' && (
                            <span
                              style={{
                                marginLeft: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                color: '#dc2626',
                                fontWeight: 700,
                              }}
                            >
                              <AlertTriangle size={10} />
                              <span>Failed</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-default)' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                          {p.description}
                        </p>
                        <textarea
                          rows={12}
                          value={p.system_prompt}
                          onChange={(e) => handlePromptChange(p.id, 'system_prompt', e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '180px',
                            padding: '8px 10px',
                            backgroundColor: 'var(--surface-base)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: 'var(--text-primary)',
                            lineHeight: 1.45,
                            resize: 'vertical',
                            outline: 'none',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Analytics & Winner Decision */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px 24px',
            gap: '18px',
          }}
        >
          {/* Sub Navigation Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-default)',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'results', label: 'Benchmark Table', icon: Layers },
                { id: 'graph', label: 'Performance vs Money Graph', icon: BarChart2 },
                { id: 'prompts', label: '10 Prompts & Responses', icon: FileText },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = viewTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setViewTab(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--surface-selected)' : 'transparent',
                      color: isActive ? 'var(--intent-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Color Index Legend Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '11px',
                padding: '4px 10px',
                backgroundColor: 'var(--surface-canvas)',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Score (%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Cost ($)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Best Value Prompt</span>
              </div>
            </div>
          </div>

          {/* Winner Prompt Spotlight Card */}
          {evalData?.winner && (
            <div
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-default)',
                borderLeft: '3px solid var(--intent-success)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={15} style={{ color: 'var(--intent-success)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recommended Strategy: {evalData.winner.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--intent-primary)' }}>Score: {evalData.winner.quality_score}%</span>
                  <span style={{ color: 'var(--intent-warning)' }}>Cost: ${evalData.winner.total_cost != null ? evalData.winner.total_cost.toFixed(5) : '0.00000'}</span>
                  <span style={{ color: 'var(--intent-success)' }}>
                    Batch: ${(evalData.results?.reduce((acc, r) => acc + (r.total_cost || 0), 0) || 0).toFixed(5)}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>Latency: {evalData.winner.latency}s</span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {evalData.intersection_point?.rationale ||
                  `${evalData.winner.name} delivered the highest response score per dollar spent.`}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 'var(--space-1)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  "{evalData.winner.system_prompt.substring(0, 110)}..."
                </span>
                <button
                  onClick={() => setSelectedInspectPrompt(evalData.winner)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--intent-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    padding: 0,
                  }}
                >
                  <ExternalLink size={12} /> Inspect Output
                </button>
              </div>
            </div>
          )}

          {/* Tab 1 / Slide 1: Comparative Benchmark Table (Scrollable) */}
          {viewTab === 'results' && (
            <div
              style={{
                backgroundColor: 'var(--surface-base)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                maxHeight: 'calc(100vh - 220px)',
                overflowY: 'auto',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ backgroundColor: 'var(--surface-canvas)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Rank</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Strategy Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>Quality Score</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>Turn Cost</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>Tokens (In/Out)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>Latency</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>Efficiency</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!evalData ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Select your recording and take from the left panel, and click <strong>"Run 10-Prompt Evaluation"</strong>.
                      </td>
                    </tr>
                  ) : (
                    evalData.results.map((r, idx) => {
                      const isWinner = evalData.winner?.id === r.id;
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid var(--border-default)',
                            backgroundColor: isWinner ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                            #{idx + 1} {isWinner && <span style={{ color: '#10b981' }}>★</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.description}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: 'var(--intent-primary-subtle)',
                                color: 'var(--intent-primary)',
                                fontWeight: 600,
                                fontSize: '11px',
                              }}
                            >
                              {r.quality_score}%
                            </span>
                            {r.judge_critique && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  marginTop: '2px',
                                  maxWidth: '190px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={r.judge_critique}
                              >
                                {r.judge_critique}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--intent-warning)' }}>
                            ${r.total_cost.toFixed(5)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {r.prompt_tokens} / {r.completion_tokens}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {r.latency}s
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {r.efficiency_ratio}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedInspectPrompt(r)}
                              style={{
                                height: 'var(--control-height-sm)',
                                padding: '0 var(--space-2)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--surface-base)',
                                color: 'var(--text-primary)',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {evalData?.results && (
                  <tfoot style={{ backgroundColor: 'var(--surface-muted)', fontWeight: 700, borderTop: '2px solid var(--border-default)' }}>
                    <tr>
                      <td colSpan={3} style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-primary)' }}>
                        TOTAL BATCH BENCHMARK (10 PROMPTS)
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', color: '#16a34a' }}>
                        ${(evalData.results || []).reduce((acc, r) => acc + (r.total_cost || 0), 0).toFixed(5)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {((evalData.results || []).reduce((acc, r) => acc + (r.latency || 0), 0) / (evalData.results?.length || 1)).toFixed(2)}s avg
                      </td>
                      <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {(evalData.results || []).reduce((acc, r) => acc + (r.total_tokens || 0), 0).toLocaleString()} tokens
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Tab 2: Graph Canvas */}
          {viewTab === 'graph' && (
            <div
              style={{
                backgroundColor: 'var(--surface-base)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Performance vs Money Trade-Off Chart
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Dual-axis trade-off comparing quality score (%) against turn cost ($) across all 10 system prompts.
                  </p>
                </div>
              </div>

              {!evalData ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Run the evaluation to view the performance and cost curve.
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <canvas
                    ref={canvasRef}
                    width={820}
                    height={380}
                    style={{
                      width: '100%',
                      maxWidth: '820px',
                      height: 'auto',
                      borderRadius: '6px',
                      display: 'block',
                      backgroundColor: '#0f172a',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab 3 / Slide 3: All 10 Prompts & Generated Responses (Scrollable Feed) */}
          {viewTab === 'prompts' && (
            <div
              style={{
                backgroundColor: 'var(--surface-base)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: 'calc(100vh - 210px)',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    All 10 System Prompts & Generated Responses (Scrollable Feed)
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Inspect the full system prompt and model-generated answer side-by-side.
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {evalData ? `${evalData.results?.length || 10} evaluated` : '10 prompts ready'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {evalData?.reference_response && (
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ★ Ground Truth Baseline Answer (From Selected Take)
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Document Lookup Reference Benchmark
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        lineHeight: 1.5,
                        maxHeight: '90px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                      }}
                    >
                      {evalData.reference_response}
                    </div>
                  </div>
                )}
                {(evalData?.results || systemPrompts).map((p, idx) => {
                  const isWinner = evalData?.winner?.id === p.id;
                  const promptObj = systemPrompts.find((sp) => sp.id === p.id) || p;
                  return (
                    <div
                      key={p.id}
                      style={{
                        backgroundColor: 'var(--surface-canvas)',
                        borderRadius: '8px',
                        border: isWinner ? '1.5px solid #10b981' : '1px solid var(--border-default)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span
                            style={{
                              backgroundColor: isWinner ? 'var(--intent-success)' : 'var(--surface-muted)',
                              color: isWinner ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                            }}
                          >
                            #{idx + 1} {isWinner ? '★ WINNER' : ''}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.name}
                          </span>
                        </div>

                        {evalData && p.status === 'success' && (
                          <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '11px', fontWeight: 600 }}>
                            <span style={{ color: 'var(--intent-primary)' }}>Score: {p.quality_score}%</span>
                            <span style={{ color: 'var(--intent-warning)' }}>Cost: ${p.total_cost?.toFixed(5)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Latency: {p.latency}s</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            System Prompt
                          </label>
                          <pre
                            style={{
                              backgroundColor: 'var(--surface-base)',
                              border: '1px solid var(--border-default)',
                              borderRadius: '6px',
                              padding: '10px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              color: 'var(--text-primary)',
                              lineHeight: 1.45,
                              maxHeight: '170px',
                              overflowY: 'auto',
                              margin: '4px 0 0 0',
                            }}
                          >
                            {promptObj.system_prompt}
                          </pre>
                        </div>

                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Model Generated Output
                          </label>
                          <pre
                            style={{
                              backgroundColor: 'var(--surface-base)',
                              border: '1px solid var(--border-default)',
                              borderRadius: '6px',
                              padding: '10px',
                              fontSize: '11px',
                              fontFamily: 'inherit',
                              whiteSpace: 'pre-wrap',
                              color: 'var(--text-primary)',
                              lineHeight: 1.45,
                              maxHeight: '170px',
                              overflowY: 'auto',
                              margin: '4px 0 0 0',
                            }}
                          >
                            {p.answer || 'Click "Run 10-Prompt Evaluation" to generate outputs for this prompt.'}
                          </pre>
                        </div>
                      </div>

                      {/* Judge Critique & Breakdown Card */}
                      {p.judge_critique && (
                        <div
                          style={{
                            marginTop: 'var(--space-2)',
                            padding: 'var(--space-3)',
                            backgroundColor: 'var(--surface-base)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--intent-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Judge Critique — {p.judge_model || selectedJudgeModel}
                            </span>
                            {p.judge_breakdown && (
                              <div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span style={{ backgroundColor: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>Accuracy: <strong style={{ color: 'var(--text-primary)' }}>{p.judge_breakdown.accuracy}/25</strong></span>
                                <span style={{ backgroundColor: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>Adherence: <strong style={{ color: 'var(--text-primary)' }}>{p.judge_breakdown.adherence}/25</strong></span>
                                <span style={{ backgroundColor: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>Depth: <strong style={{ color: 'var(--text-primary)' }}>{p.judge_breakdown.depth}/25</strong></span>
                                <span style={{ backgroundColor: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>Presentation: <strong style={{ color: 'var(--text-primary)' }}>{p.judge_breakdown.presentation}/25</strong></span>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                            "{p.judge_critique}"
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Response Inspector Modal */}
      {selectedInspectPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-base)',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '88vh',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--surface-canvas)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedInspectPrompt.name} — Full Details & Output
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Score: {selectedInspectPrompt.quality_score}% • Cost: ${selectedInspectPrompt.total_cost.toFixed(5)} • Tokens: {selectedInspectPrompt.total_tokens}
                </span>
              </div>
              <button
                onClick={() => setSelectedInspectPrompt(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Full System Prompt
                </label>
                <pre
                  style={{
                    backgroundColor: 'var(--surface-canvas)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    margin: '4px 0 0 0',
                  }}
                >
                  {selectedInspectPrompt.system_prompt}
                </pre>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Generated Response from {selectedModel}
                </label>
                <pre
                  style={{
                    backgroundColor: 'var(--surface-canvas)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    margin: '4px 0 0 0',
                  }}
                >
                  {selectedInspectPrompt.answer || 'No response recorded.'}
                </pre>
              </div>

              {selectedInspectPrompt.judge_critique && (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--surface-muted)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--intent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Judge Verdict — {selectedInspectPrompt.judge_model || selectedJudgeModel}
                    </span>
                    {selectedInspectPrompt.judge_breakdown && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <span>Accuracy: <strong>{selectedInspectPrompt.judge_breakdown.accuracy}/25</strong></span>
                        <span>Adherence: <strong>{selectedInspectPrompt.judge_breakdown.adherence}/25</strong></span>
                        <span>Depth: <strong>{selectedInspectPrompt.judge_breakdown.depth}/25</strong></span>
                        <span>Presentation: <strong>{selectedInspectPrompt.judge_breakdown.presentation}/25</strong></span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    "{selectedInspectPrompt.judge_critique}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Add System Prompt Modal */}
      {isAddPromptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-base)',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header */}
            <div
              style={{
                height: '48px',
                padding: '0 var(--space-4)',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--surface-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Plus size={16} style={{ color: 'var(--intent-primary)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Add Custom System Prompt
                </h3>
              </div>
              <button
                onClick={() => setIsAddPromptModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddCustomPrompt} style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Strategy / Persona Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Forensic Regulatory Auditor"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-2)',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Operational Description:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Strict legal compliance auditing with page citations and liability checks."
                  value={newPromptDescription}
                  onChange={(e) => setNewPromptDescription(e.target.value)}
                  style={{
                    width: '100%',
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-2)',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    System Prompt Instructions (Detailed & Long):
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {newPromptSystemText.trim() ? `${newPromptSystemText.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                </div>
                <textarea
                  required
                  rows={10}
                  placeholder="Enter full detailed system prompt instructions here (Core objectives, execution protocol, constraints)..."
                  value={newPromptSystemText}
                  onChange={(e) => setNewPromptSystemText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    lineHeight: 1.45,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPromptModalOpen(false)}
                  style={{
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: 'var(--control-height-md)',
                    padding: '0 var(--space-4)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--intent-primary-solid)',
                    color: 'var(--text-on-accent)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save & Add Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
