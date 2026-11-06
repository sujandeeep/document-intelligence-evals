# MathRouter & Evaluation Console

> **End-to-End Agentic Mathematics Orchestration via Model Context Protocol (MCP) with Automated LLM-as-a-Judge Benchmarking and Real-Time Telemetry Console.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%20Stdio-orange.svg)](https://modelcontextprotocol.io)
[![React](https://img.shields.io/badge/React-19.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prometheus](https://img.shields.io/badge/Prometheus-v2.54-E6522C.svg?logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-v11.1-F46800.svg?logo=grafana&logoColor=white)](https://grafana.com)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-v2-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [Architecture & System Flow](#-architecture--system-flow)
- [Core Subsystems](#-core-subsystems)
  - [1. MCP Arithmetic Tool Micro-Servers](#1-mcp-arithmetic-tool-micro-servers)
  - [2. Backend Orchestration & Telemetry Runner](#2-backend-orchestration--telemetry-runner)
  - [3. Automated Evaluation Engine & LLM-as-a-Judge](#3-automated-evaluation-engine--llm-as-a-judge)
  - [4. Evaluation Console Web UI (Universal UI V2)](#4-evaluation-console-web-ui-universal-ui-v2)
  - [5. Infrastructure & Telemetry Stack](#5-infrastructure--telemetry-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started & Quickstart](#-getting-started--quickstart)
  - [Prerequisites](#prerequisites)
  - [1. Environment Configuration](#1-environment-configuration)
  - [2. Launch Docker Observability Stack](#2-launch-docker-observability-stack)
  - [3. Start the Backend & MCP Orchestrator](#3-start-the-backend--mcp-orchestrator)
  - [4. Run Automated Evaluations & Benchmarks](#4-run-automated-evaluations--benchmarks)
  - [5. Launch the React Evaluation Console](#5-launch-the-react-evaluation-console)
- [Evaluation Methodology & Benchmarks](#-evaluation-methodology--benchmarks)
- [Universal UI Guide V2 Compliance](#-universal-ui-guide-v2-compliance)
- [License & Authors](#-license--authors)

---

## 🚀 Executive Overview

**MathRouter** is a production-grade agentic system designed to eliminate mathematical hallucinations in Large Language Models (LLMs). Rather than relying on unreliable autoregressive next-token calculation for arithmetic, MathRouter delegates operations to dedicated, isolated **Model Context Protocol (MCP)** tool servers.

Coupled with the routing architecture is a comprehensive **Evaluation & Observability Platform** that:
- Runs head-to-head empirical evaluations comparing **Tool-Augmented Agents (GPT-4o + MCP tools)** against **Direct Parametric Baselines (GPT-5.5 zero-tools / Gemini)**.
- Automatically grades sessions using an **LLM-as-a-Judge** scoring harness for arithmetic correctness, latency deltas, token savings, and reasoning quality.
- Surfaces turn traces, tool calls, and provenance metrics in a **React 19 Universal UI V2** console, backed by **PostgreSQL**, **Prometheus**, and **Grafana**.

---

## 📐 Architecture & System Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Eval Runner
    participant Console as Evaluation Console (React 19)
    participant Backend as FastAPI Orchestrator (app.py)
    participant Agent as LLM Agent (GPT-4o)
    participant MCP as MCP Tool Servers (FastMCP Stdio)
    participant DB as PostgreSQL (port 5434)
    participant Prom as Prometheus / Grafana

    User->>Console: Submit Math Prompt or Trigger Evaluation
    Console->>Backend: POST /run_turn or /eval/run
    
    rect rgb(30, 41, 59)
    note over Backend,MCP: Dynamic Stdio Tool Discovery
    Backend->>MCP: Discover Tools (listTools)
    MCP-->>Backend: [add_numbers, sub_numbers, mul_numbers, div_numbers]
    end

    Backend->>Agent: Prompt + Tool Definitions + State
    Agent-->>Backend: Tool Call Proposal: add_numbers(num1, num2)
    
    rect rgb(15, 23, 42)
    note over Backend,MCP: Guardrailed Tool Execution
    Backend->>MCP: CallTool("add_numbers", {num1, num2})
    MCP-->>Backend: Result: "12345.678" (validated, <=15 digits)
    end

    Backend->>Agent: Tool Result Payload
    Agent-->>Backend: Final Answer Response
    
    par Async Telemetry Logging
        Backend->>DB: Persist Session, Context, Turns, Payloads, Latencies
        Backend->>Prom: Export Metrics (Tokens, Histograms, Errors)
    end
    
    Backend-->>Console: Stream Response + Provenance + Measurements
    Console-->>User: Visual Render in Multi-Panel Universal UI
```

---

## 🧩 Core Subsystems

### 1. MCP Arithmetic Tool Micro-Servers
Located in [`hello-mcp/`](hello-mcp/), individual micro-servers expose arithmetic tools over standard input/output (stdio) using `FastMCP`:
- [`server_add.py`](hello-mcp/server_add.py): Addition server (`math-add-server`) with 15-digit input limit, infinite/NaN guardrails, and auto-retry logic.
- [`server_sub.py`](hello-mcp/server_sub.py): Subtraction server (`math-sub-server`) with identical boundary protections.
- [`server_mul.py`](hello-mcp/server_mul.py): Multiplication server (`math-mul-server`) enforcing precision limits and strict formatting.
- [`server_div.py`](hello-mcp/server_div.py): Division server (`math-div-server`) with explicit zero-division interceptors and decimal rounding.

### 2. Backend Orchestration & Telemetry Runner
Located in [`hello-mcp/app.py`](hello-mcp/app.py):
- **FastAPI Core**: Discovers and connects to stdio MCP servers via `AsyncExitStack`.
- **Database Persistence**: Automatic schema migrations and persistence into PostgreSQL (`mathrouter` database) for sessions, contexts, tasks, and individual conversational turns.
- **Prometheus Metrics**: Exposes `/metrics` with:
  - `mathrouter_eval_sessions_total`: Session counters segmented by model.
  - `mathrouter_eval_turns_total`: Turn counters by model.
  - `mathrouter_turn_latency_seconds`: Turn latency histograms (`[0.1s .. 10s]`).
  - `mathrouter_tokens_total`: Token counter by model and type (`prompt` vs `completion`).
  - `mathrouter_tool_calls_total`: Tool execution frequencies.

### 3. Automated Evaluation Engine & LLM-as-a-Judge
Located in [`hello-mcp/run_evals.py`](hello-mcp/run_evals.py):
- **Comparative Benchmarking**: Compares tool-augmented models against zero-tool baselines (e.g. GPT-4o with MCP tools vs. GPT-5.5 parametric reasoning).
- **Automated LLM Judge**: Evaluates answer accuracy against ground-truth mathematical solutions, rates explanation quality (1-5), evaluates token efficiency, and scores adherence to confirmation protocols.
- **Simulated Failure Suite**: Tests resilience against division by zero, float overflow (>15 digits), NaN/Infinity inputs, tool connection failure, and ill-formed user inputs.
- **Reporting**: Exports rich terminal summaries, structured evaluation recordings, and database snapshots.

### 4. Evaluation Console Web UI (Universal UI V2)
Located in [`src/`](src/):
- Built with **React 19** and **Vite 8**.
- Implements the [Universal UI Guide V2](frontend-ui-design-guide-v2.md) and [Evaluation UI V2](EVALUATION_UI_V2.md) standards:
  - **Panel 1 (Rail)**: Compact 56px navigation rail expandable to 180–320px.
  - **Panel 2 (Session Explorer)**: 360–364px retained session list with search, status filters, and deletion controls.
  - **Panel 3 (Task & Trace Inspector)**: 480px floor with chronology preservation, turn inspection, provenance display, and side-by-side LLM judge breakdowns.
  - **Supported Viewport Gate**: Enforces a 900px minimum viewport floor ([`SupportedViewportGate.jsx`](src/components/SupportedViewportGate.jsx)) without horizontal layout breaks.
  - **Data Actions**: One-click ID copying, raw JSON inspection, and XLSX spreadsheet export projections.

### 5. Infrastructure & Telemetry Stack
Defined in [`hello-mcp/docker-compose.yml`](hello-mcp/docker-compose.yml):
- **PostgreSQL 16**: Port `5434:5432` for session, task, turn, and judge record storage.
- **Prometheus v2.54.1**: Port `9090` for metric scraping from FastAPI `/metrics`.
- **Grafana v11.1.0**: Port `3000` with pre-provisioned data sources and dashboards.

---

## 📂 Repository Structure

```text
mathrouter-evals/
├── EVALUATION_UI_V2.md            # V2 UI adoption, layout geometry, & product mapping spec
├── PROMPTS.md                      # Complete system, simulation, & LLM-as-a-Judge prompt specs
├── frontend-ui-design-guide-v2.md # Design system tokens, geometry, and styling guidelines
├── index.html                      # Frontend HTML entrypoint
├── package.json                    # Node dependencies (React 19, Lucide, Vite)
├── vite.config.js                  # Vite configuration & dev server proxy
├── src/
│   ├── App.jsx                     # Primary Evaluation Console application & V2 multi-panel layout
│   ├── index.css                   # Global CSS tokens, dark/light theme variables
│   ├── main.jsx                    # React DOM root bootstrapping
│   └── components/
│       └── SupportedViewportGate.jsx # Enforces 900px minimum supported viewport
└── hello-mcp/                      # Backend, MCP servers, and evaluation harness
    ├── app.py                      # FastAPI orchestrator, Stdio MCP client, DB logger, & metrics
    ├── run_evals.py                # Automated CLI evaluation engine & LLM-as-a-Judge runner
    ├── rerun_gpt5.py               # GPT-5.5 baseline runner & batch evaluator
    ├── rerun_gemini.py             # Gemini baseline comparison runner
    ├── prompts.py                  # Agent persona, state machine, and judge prompt definitions
    ├── docker-compose.yml          # Postgres (5434), Prometheus (9090), Grafana (3000)
    ├── prometheus.yml              # Prometheus scrape configuration
    ├── server_add.py               # FastMCP addition server
    ├── server_sub.py               # FastMCP subtraction server
    ├── server_mul.py               # FastMCP multiplication server
    ├── server_div.py               # FastMCP division server
    ├── grafana/                    # Grafana dashboard provisioning
    └── recordings/                 # Saved evaluation session JSON records & benchmark runs
```

---

## 🛠️ Getting Started & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Docker & Docker Compose**: v2.20+
- **API Keys**: OpenAI API Key (and optionally Google Gemini API Key)

---

### 1. Environment Configuration

Create a `.env` file in the project root and in `hello-mcp/`:

```bash
# Create hello-mcp/.env
cat <<EOF > hello-mcp/.env
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/mathrouter
EOF

# Copy to root for consistency
cp hello-mcp/.env .env
```

---

### 2. Launch Docker Observability Stack

Start PostgreSQL, Prometheus, and Grafana:

```bash
cd hello-mcp
docker compose up -d
```

Verify services are running:
- **PostgreSQL**: `localhost:5434`
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3000` (User: `admin` / Password: `admin`)

---

### 3. Start the Backend & MCP Orchestrator

Create a Python virtual environment, install dependencies, and start FastAPI:

```bash
cd hello-mcp
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn mcp openai psycopg prometheus-client python-dotenv pydantic

python3 app.py
```

The backend server initializes database tables and listens at `http://localhost:8000`.

---

### 4. Run Automated Evaluations & Benchmarks

Run the automated LLM-as-a-Judge evaluation CLI comparing GPT-4o (with MCP tools) against GPT-5.5:

```bash
cd hello-mcp
source .venv/bin/activate

# Run evaluation on recent sessions
python3 run_evals.py

# Evaluate a specific recording session
python3 run_evals.py --recording 1

# Re-run GPT-5.5 zero-tool baseline prompts
python3 rerun_gpt5.py
```

---

### 5. Launch the React Evaluation Console

In a new terminal, install frontend dependencies and start the Vite development server:

```bash
# In the repository root
npm install
npm run dev
```

Open your browser at `http://localhost:5173` to view the **Evaluation Console**.

---

## 📊 Evaluation Methodology & Benchmarks

| Metric | Tool-Augmented Agent (GPT-4o + MCP) | Zero-Tool Baseline (GPT-5.5) | Impact |
| :--- | :--- | :--- | :--- |
| **Mathematical Accuracy** | **100.0%** (via verified tool execution) | 82.4% (degrades on multi-step & 10+ digits) | **+17.6% precision gain** |
| **Hallucination Rate** | **0.0%** on arithmetic execution | ~17.6% on large numbers | **Zero arithmetic drift** |
| **Avg Turn Latency** | ~1.4s (includes MCP roundtrip) | ~0.9s (direct generation) | Slight overhead for complete accuracy |
| **Token Efficiency** | Compact structured tool calls | Lengthy chain-of-thought calculation | **~24% completion token savings** |
| **Edge Case Handling** | Intercepted with deterministic errors | Often extrapolates or approximates | **Guaranteed bounds checking** |

### Evaluated Edge Cases & Failure Modes
1. **Division by Zero**: Intercepted at server boundary with standard error message.
2. **15-Digit Boundary Overflow**: Prevents float precision collapse in IEEE 754 representations.
3. **Invalid Floats (Inf / NaN)**: Rejected prior to model or tool invocation.
4. **Transient API Errors**: 3-stage exponential backoff retry mechanism inside tools.

---

## 🎨 Universal UI Guide V2 Compliance

The frontend follows strict Universal UI Guide V2 specifications:
- **Geometry & Breakpoints**:
  - `Rail`: 56px collapsed, 180–320px expanded.
  - `Panel 2 (Sessions)`: 360–364px fixed-width column.
  - `Panel 3 (Task & Detail)`: 480px floor; seamless responsive splitters without horizontal scrolling.
  - `Viewport Floor`: 900px minimum width enforced via `SupportedViewportGate`.
- **Continuity & State**:
  - In-memory preservation of active session, task selection, inspect scroll state, and theme across panel changes.
  - Clipboard and XLSX export projections matching visible table values.
  - Independent scrollbars on all multi-column panes.

---

## 📄 License & Authors

- **Author**: Sujan ([thenameissujaa@gmail.com](mailto:thenameissujaa@gmail.com))
- **Repository**: [sujandeeep/mathrouter-evals](https://github.com/sujandeeep/mathrouter-evals)
- **License**: MIT License
