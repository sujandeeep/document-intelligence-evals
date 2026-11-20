# RAG Triad Evaluator & Confidence Scorer MCP Server
## Architecture & Implementation Plan

---

## 1. Executive Summary & Objective

The objective is to replace legacy evaluation scripts with a clean, production-grade **Model Context Protocol (MCP) Server** powered by OpenAI GPT models (`OPENAI_API_KEY`). 

The server evaluates RAG (Retrieval-Augmented Generation) outputs across the **RAG Triad**, computes an aggregate **Confidence Score**, and provides a structured **Rationale & Hallucination Breakdown**.

```
                ┌────────────────────────────────────────────────────────┐
                │                     Input Payload                      │
                │   • Query                                              │
                │   • Retrieved Contexts (chunks)                        │
                │   • Generated Response                                 │
                │   • [Optional] Ground Truth Reference                  │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
           ┌──────────────────────────────────────────────────────────────────┐
           │                RAG Eval MCP Server (FastMCP / Python)            │
           │                     Model: GPT-4o / GPT-4o-mini                  │
           │                                                                  │
           │   ┌───────────────────┬───────────────────┬──────────────────┐   │
           │   │ 1. Faithfulness   │ 2. Context        │ 3. Answer        │   │
           │   │    (Groundedness) │    Relevance      │    Relevancy     │   │
           │   │  • Atomic claim   │  • Signal-to-     │  • Intent        │   │
           │   │    extraction     │    noise ratio    │    matching      │   │
           │   │  • Evidence check │  • Extraneous info│  • Drift/evasion │   │
           │   └─────────┬─────────┴─────────┬─────────┴─────────┬────────┘   │
           │             │                   │                   │            │
           │             └───────────────────┼───────────────────┘            │
           │                                 ▼                                │
           │                     Structured Scoring Engine                    │
           │              • Weighted Composite Confidence Score               │
           │              • Hallucination & Evidence Attribution              │
           │              • Actionable Explanations & Risk Verdict            │
           └─────────────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
                ┌────────────────────────────────────────────────────────┐
                │                    Output Contract                     │
                │  {                                                     │
                │    "confidence_score": 0.88,                           │
                │    "verdict": "HIGH_CONFIDENCE",                       │
                │    "metrics": { "faithfulness": 1.0, ... },            │
                │    "explanations": { ... },                            │
                │    "unsupported_claims": [],                           │
                │    "improvement_suggestions": "..."                    │
                │  }                                                     │
                └────────────────────────────────────────────────────────┘
```

---

## 2. Core Evaluation Metrics & Formulas

### A. Faithfulness (Groundedness)
* **Goal**: Guarantee zero hallucinations.
* **Mechanism**:
  1. Deconstruct the response into discrete atomic factual statements ($C = \{c_1, c_2, \dots, c_n\}$).
  2. For each claim $c_i$, verify if it is strictly deducible from the retrieved contexts.
  3. $\text{Faithfulness} = \frac{\text{Number of Supported Claims}}{|C|}$.
* **Output Details**: Returns exact unsupported claims and which context chunk provided evidence.

### B. Context Relevance (Retrieval Precision)
* **Goal**: Measure retrieval signal-to-noise ratio.
* **Mechanism**:
  1. Break retrieved contexts into key sentences.
  2. Check how many retrieved sentences directly support answering the user query.
  3. $\text{Context Relevance} = \frac{\text{Relevant Sentences}}{\text{Total Sentences in Context}}$.
* **Output Details**: Identifies irrelevant chunks cluttering the context window.

### C. Answer Relevancy
* **Goal**: Ensure the response answers what was asked without dodging, fluff, or drift.
* **Mechanism**:
  1. Evaluate user intent vs. response substance.
  2. Penalize evasive, incomplete, or repetitive content.
* **Score**: Continuous $0.0 - 1.0$.

### D. Composite Confidence Score & Verdict
$$\text{Confidence Score} = w_f \cdot \text{Faithfulness} + w_{cr} \cdot \text{Context Relevance} + w_{ar} \cdot \text{Answer Relevancy}$$

* **Recommended Default Weights**:
  * $w_f = 0.50$ (Faithfulness is non-negotiable)
  * $w_{ar} = 0.30$ (Answer must be relevant)
  * $w_{cr} = 0.20$ (Context noise is a secondary efficiency factor)
* **Verdicts**:
  * `HIGH_CONFIDENCE` ($\ge 0.85$ and Faithfulness $= 1.0$)
  * `MEDIUM_CONFIDENCE` ($0.70 - 0.84$)
  * `HALLUCINATION_DETECTED` (Faithfulness $< 0.80$)
  * `LOW_QUALITY` ($< 0.70$)

---

## 3. Project Structure

A clean, modern repository layout using **FastMCP (Python)** and **Pydantic V2** with OpenAI Structured Outputs:

```
rag-eval-mcp/
├── .env.example                  # OPENAI_API_KEY, MODEL_NAME
├── .gitignore
├── pyproject.toml                # Dependencies (mcp, openai, pydantic)
├── README.md                     # Setup, MCP client configs, testing guide
├── src/
│   ├── __init__.py
│   ├── server.py                 # FastMCP entrypoint & tool registrations
│   ├── schemas.py                # Pydantic input/output schemas
│   ├── evaluators/
│   │   ├── __init__.py
│   │   ├── faithfulness.py       # Atomic claim verification
│   │   ├── context_relevance.py  # Retrieval noise analysis
│   │   ├── answer_relevance.py   # Intent satisfaction
│   │   └── composite.py          # Confidence calculation & synthesis
│   └── prompts.py                # Specialized evaluation system prompts
└── tests/
    ├── test_server.py            # End-to-end MCP tool call tests
    └── fixtures.json             # Sample test cases (grounded vs hallucinated)
```

---

## 4. MCP Server Tool Interface

The MCP server exposes the following tools:

### Tool 1: `evaluate_rag_triad` (Main Comprehensive Evaluator)
* **Inputs**:
  * `query` (*string*, required): User query.
  * `contexts` (*list[string]*, required): Retrieved chunks/passages.
  * `response` (*string*, required): Model-generated response to evaluate.
  * `ground_truth` (*string*, optional): Golden reference answer if available.
  * `model` (*string*, optional, default: `"gpt-4o-mini"` or `"gpt-4o"`): OpenAI judge model.
* **Output**:
  ```json
  {
    "confidence_score": 0.92,
    "verdict": "HIGH_CONFIDENCE",
    "metrics": {
      "faithfulness": 1.0,
      "context_relevance": 0.80,
      "answer_relevancy": 0.95
    },
    "explanations": {
      "faithfulness": "All 4 extracted claims are directly substantiated by Context Chunk 1 and 2.",
      "context_relevance": "Chunk 3 contained background fluff not required to answer the query.",
      "answer_relevancy": "Directly and concisely answers the user query."
    },
    "claims_analysis": [
      {
        "claim": "The server operates on port 8080.",
        "status": "SUPPORTED",
        "evidence_source": "Context Chunk 1"
      }
    ],
    "unsupported_claims": [],
    "recommendations": "Consider filtering out Chunk 3 in retrieval to save prompt tokens."
  }
  ```

### Tool 2: `evaluate_faithfulness` (Fast Guardrail)
* Fast, focused verification strictly checking if an answer contains hallucinations before returning it to an end user.

### Tool 3: `evaluate_context_relevance` (Pre-Generation Filter)
* Evaluates retrieved chunks *before* LLM generation to prune irrelevant context and reduce token costs.

---

## 5. Technology Stack & Prerequisites

* **Runtime**: Python 3.10+
* **Framework**: `mcp` (`FastMCP`) for protocol communication over stdio or SSE.
* **LLM Engine**: `openai` Python SDK (v1.50+) with **Structured Outputs** (`client.beta.chat.completions.parse` or response_format with Pydantic).
* **Environment**: `OPENAI_API_KEY` loaded from environment or `.env`.

---

## 6. Implementation Milestones

1. **Step 1: Clean Foundation & Setup**
   * Clear out obsolete files.
   * Initialize `pyproject.toml` with `mcp[cli]`, `openai`, `pydantic`, `python-dotenv`.
2. **Step 2: Define Schemas & Prompts**
   * Define strictly typed Pydantic models for claim decomposition, metric scores, and explanations.
   * Write chain-of-thought evaluation prompts ensuring the judge explains its reasoning *before* outputting the numerical score.
3. **Step 3: Core Evaluators Implementation**
   * Implement `faithfulness.py` (Claim extractor + context checker).
   * Implement `context_relevance.py` and `answer_relevance.py`.
   * Implement `composite.py` with weighted confidence calculation.
4. **Step 4: FastMCP Server Integration**
   * Wire evaluators into FastMCP tool decorators in `server.py`.
5. **Step 5: Testing & Verification**
   * Run automated tests with known edge cases:
     * 100% grounded answer (confidence $\approx 0.95+$).
     * Subtly hallucinated answer (faithfulness drop detected).
     * Irrelevant context chunks (context relevance drop detected).
6. **Step 6: MCP Client Configuration**
   * Provide configuration snippet for Antigravity IDE, Claude Desktop, or custom clients.
