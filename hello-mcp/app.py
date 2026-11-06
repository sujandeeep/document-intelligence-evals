import os
import sys
import shutil
import json
import asyncio
import logging

logging.basicConfig(filename='system.log', level=logging.INFO, format='[%(asctime)s] %(message)s')
import time
from contextlib import AsyncExitStack, asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
from starlette.middleware.sessions import SessionMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

import psycopg
from psycopg.types.json import Jsonb
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/mathrouter")

# Prometheus Metrics Definitions
EVAL_SESSIONS_TOTAL = Counter(
    "mathrouter_eval_sessions_total",
    "Total evaluation recording sessions completed",
    ["model"]
)
EVAL_TURNS_TOTAL = Counter(
    "mathrouter_eval_turns_total",
    "Total conversation turns recorded in evaluation sessions",
    ["model"]
)
EVAL_LATENCY_HISTOGRAM = Histogram(
    "mathrouter_turn_latency_seconds",
    "Turn latency distribution in seconds",
    ["model"],
    buckets=[0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
)
EVAL_TOKENS_TOTAL = Counter(
    "mathrouter_tokens_total",
    "Total tokens consumed during evaluation sessions",
    ["model", "type"]
)
EVAL_TOOL_CALLS_TOTAL = Counter(
    "mathrouter_tool_calls_total",
    "Total tool calls observed during evaluation sessions",
    ["tool_name"]
)

def init_postgres():
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS eval_sessions (
                        session_id VARCHAR(120) PRIMARY KEY,
                        recording_title VARCHAR(120),
                        recording_number INT DEFAULT 1,
                        model VARCHAR(60) NOT NULL,
                        start_time TIMESTAMPTZ,
                        end_time TIMESTAMPTZ,
                        total_turns INT DEFAULT 0,
                        total_tokens INT DEFAULT 0,
                        total_latency_seconds NUMERIC(10, 3) DEFAULT 0,
                        first_message TEXT,
                        payload JSONB NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    ALTER TABLE eval_sessions ADD COLUMN IF NOT EXISTS recording_title VARCHAR(120);
                    ALTER TABLE eval_sessions ADD COLUMN IF NOT EXISTS recording_number INT;
                    CREATE INDEX IF NOT EXISTS idx_eval_sessions_model ON eval_sessions(model);
                    CREATE INDEX IF NOT EXISTS idx_eval_sessions_created ON eval_sessions(created_at DESC);

                    CREATE TABLE IF NOT EXISTS eval_turns (
                        turn_id VARCHAR(160) PRIMARY KEY,
                        session_id VARCHAR(120) NOT NULL,
                        turn_number INT NOT NULL,
                        take_label VARCHAR(60),
                        recording_title VARCHAR(120),
                        model VARCHAR(60) NOT NULL,
                        timestamp TIMESTAMPTZ,
                        user_message TEXT,
                        assistant_response TEXT,
                        tool_calls JSONB,
                        latency_seconds NUMERIC(10, 3) DEFAULT 0,
                        prompt_tokens INT DEFAULT 0,
                        completion_tokens INT DEFAULT 0,
                        total_tokens INT DEFAULT 0,
                        payload JSONB NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    ALTER TABLE eval_turns ADD COLUMN IF NOT EXISTS take_label VARCHAR(60);
                    ALTER TABLE eval_turns ADD COLUMN IF NOT EXISTS recording_title VARCHAR(120);
                    ALTER TABLE eval_turns ADD COLUMN IF NOT EXISTS recording_number INT;
                    CREATE INDEX IF NOT EXISTS idx_eval_turns_session ON eval_turns(session_id);
                    CREATE INDEX IF NOT EXISTS idx_eval_turns_model ON eval_turns(model);
                    CREATE INDEX IF NOT EXISTS idx_eval_turns_created ON eval_turns(created_at DESC);
                """)
                conn.commit()
        print("PostgreSQL tables 'eval_sessions' and 'eval_turns' ready with hierarchical take schema.")
    except Exception as e:
        print(f"Warning: PostgreSQL init skipped ({e}).")

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]] = []
    toggles: Dict[str, bool] = {}
    execute_pending: bool = False
    pending_tool_call: Optional[Dict[str, Any]] = None

# MCP Client imports
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("FATAL: OPENAI_API_KEY is not set.")
    sys.exit(1)

openai = AsyncOpenAI(api_key=api_key)

servers_config = {
    "add": {"file": "server_add.py"},
    "sub": {"file": "server_sub.py"},
    "mul": {"file": "server_mul.py"},
    "div": {"file": "server_div.py"},
}

mcp_sessions = {}
mcp_tools = {}
server_locks = {key: asyncio.Lock() for key in servers_config.keys()}
exit_stack = AsyncExitStack()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Verifying OpenAI API Key...")
    try:
        await openai.models.list()
        print("API Key Validated.")
    except Exception as e:
        print(f"FATAL: Invalid OPENAI_API_KEY. {e}")
        sys.exit(1)
        
    print("Initializing PostgreSQL Database...")
    init_postgres()
        
    print("Starting 4 Math MCP Servers...")
    for key, config in servers_config.items():
        try:
            env = {"OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"), "PATH": os.getenv("PATH")}
            params = StdioServerParameters(command=sys.executable, args=[config["file"]], env=env)
            transport = await exit_stack.enter_async_context(stdio_client(params))
            read_stream, write_stream = transport
            session = await exit_stack.enter_async_context(ClientSession(read_stream, write_stream))
            await session.initialize()
            
            mcp_sessions[key] = session
            tools_response = await session.list_tools()
            
            # Store tools by server key
            mcp_tools[key] = []
            for t in tools_response.tools:
                mcp_tools[key].append({
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.inputSchema
                    }
                })
            print(f"Server '{key}' loaded with tools.")
        except Exception as e:
            print(f"Warning: Error starting server {key}: {e}. Skipping this server.")
    
    yield
    
    await exit_stack.aclose()

app = FastAPI(lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "default-insecure-secret"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Background-Logs", "X-Token-Usage", "X-Model-Name", "X-Latency-Ms"],
)



@app.post("/api/chat")
async def chat_endpoint(request: Request, body: ChatRequest):
    turn_start_time = time.perf_counter()
    user_messages = body.messages
    active_toggles = body.toggles
    execute_pending = body.execute_pending
    pending_tool_call = body.pending_tool_call
    
    tool_calls_log = []
    llm_responses_log = []
    
    # Dynamically import to ensure hot-reloaded rules apply instantly
    import importlib
    import prompts
    importlib.reload(prompts)
    SYSTEM_PROMPT = prompts.SYSTEM_PROMPT
    
    if not user_messages or user_messages[0].get("role") != "system":
        user_messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    else:
        user_messages[0]["content"] = SYSTEM_PROMPT

    # Prune history to prevent context window overrun (keep system prompt + last 15 msgs)
    if len(user_messages) > 16:
        user_messages = [user_messages[0]] + user_messages[-15:]

    # If the user confirmed a tool execution
    if execute_pending and pending_tool_call:
        if request.session.get("pending_tool_call_id") != pending_tool_call.get("id"):
            return JSONResponse({"type": "error", "message": "Error: Invalid tool call ID. Session mismatch."})
        tool_calls_log.append(f"[Session Retrieve] Validated session state for pending operation '{pending_tool_call.get('function', {}).get('name')}'")
        tool_name = pending_tool_call["function"]["name"]
        try:
            tool_args = json.loads(pending_tool_call["function"]["arguments"])
        except json.JSONDecodeError:
            return JSONResponse({"type": "error", "message": "Error: Invalid JSON from tool arguments."})
        
        # Determine which server owns this tool
        target_server = None
        for key, tools in mcp_tools.items():
            if active_toggles.get(key, False):
                for t in tools:
                    if t["function"]["name"] == tool_name:
                        target_server = key
                        break
        
        if not target_server:
            return JSONResponse({"type": "error", "message": "Error: The server was disabled before execution."})
            
        # Execute tool
        session = mcp_sessions[target_server]
        try:
            mcp_tool_result = await asyncio.wait_for(session.call_tool(tool_name, tool_args), timeout=15.0)
            tool_output = mcp_tool_result.content[0].text
            tool_calls_log.append(f"[MCP Op] Executed {tool_name} on {target_server}: {tool_output}")
        except Exception as e:
            print(f"Server {target_server} crashed or failed ({e}). Restarting silently...")
            async with server_locks[target_server]:
                try:
                    env = {"OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"), "PATH": os.getenv("PATH")}
                    config = servers_config[target_server]
                    params = StdioServerParameters(command=sys.executable, args=[config["file"]], env=env)
                    transport = await exit_stack.enter_async_context(stdio_client(params))
                    read_stream, write_stream = transport
                    new_session = await exit_stack.enter_async_context(ClientSession(read_stream, write_stream))
                    await new_session.initialize()
                    mcp_sessions[target_server] = new_session
                    
                    # Update tool schema
                    tools_response = await new_session.list_tools()
                    mcp_tools[target_server] = []
                    for t in tools_response.tools:
                        mcp_tools[target_server].append({
                            "type": "function",
                            "function": {
                                "name": t.name,
                                "description": t.description,
                                "parameters": t.inputSchema
                            }
                        })
                        
                    mcp_tool_result = await asyncio.wait_for(new_session.call_tool(tool_name, tool_args), timeout=15.0)
                    tool_output = mcp_tool_result.content[0].text
                    tool_calls_log.append(f"[MCP Op] Executed {tool_name} after restart: {tool_output}")
                except Exception as e2:
                    tool_output = f"ERROR: {e2}. If this persists, do not retry the tool."
                    tool_calls_log.append(f"[MCP Op Error] {tool_output}")
            
        user_messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [pending_tool_call]
        })
        user_messages.append({
            "role": "tool",
            "tool_call_id": pending_tool_call["id"],
            "content": tool_output
        })
        

    # Collect available tools once
    available_openai_tools = [
        {
            "type": "function",
            "function": {
                "name": "update_state",
                "description": "Manages the global state. Set action to 'update' or 'clear'. Pass numbers/operations to update state. To simply read the state, pass action='update' with no arguments.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string"},
                        "first_number": {"type": "number"},
                        "operation": {"type": "string"},
                        "second_number": {"type": "number"}
                    }
                }
            }
        }
    ]
    import copy
    session_num1 = request.session.get('first_number')
    session_num2 = request.session.get('second_number')

    for key, tools in mcp_tools.items():
        if active_toggles.get(key, False):
            tools_copy = copy.deepcopy(tools)
            for t in tools_copy:
                desc = t["function"].get("description", "")
                import re
                if session_num1 is not None:
                    desc = re.sub(r'num1=\d+', f'num1={session_num1}', desc)
                    if "parameters" in t["function"] and "properties" in t["function"]["parameters"]:
                        if "num1" in t["function"]["parameters"]["properties"]:
                            t["function"]["parameters"]["properties"]["num1"]["current_session_value"] = session_num1
                if session_num2 is not None:
                    desc = re.sub(r'num2=\d+', f'num2={session_num2}', desc)
                    if "parameters" in t["function"] and "properties" in t["function"]["parameters"]:
                        if "num2" in t["function"]["parameters"]["properties"]:
                            t["function"]["parameters"]["properties"]["num2"]["current_session_value"] = session_num2
                t["function"]["description"] = desc
            available_openai_tools.extend(tools_copy)

    tools_for_log = copy.deepcopy(available_openai_tools)
    for t in tools_for_log:
        t["function"].pop("description", None)
    
    MAX_ITERATIONS = 5
    iteration = 0
    
    while iteration < MAX_ITERATIONS:
        iteration += 1
        try:
            response = await openai.chat.completions.create(
                model="gpt-4o",
                temperature=0.0,
                max_tokens=1500,
                messages=user_messages,
                tools=available_openai_tools if available_openai_tools else None
            )
            
            response_message = response.choices[0].message
            llm_responses_log.append(response.model_dump_json(indent=2))
            
            if response_message.tool_calls:
                tool_call = response_message.tool_calls[0]
                
                try:
                    args = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    return JSONResponse({"type": "error", "message": "Model generated invalid tool arguments JSON."})
                
                tool_name = tool_call.function.name
                
                # Handle state internally via session object
                if tool_name == "update_state":
                    action = args.get("action", "update")
                    if action == "clear":
                        request.session["first_number"] = None
                        request.session["operation"] = None
                        request.session["second_number"] = None
                        tool_output = "State cleared."
                    else:
                        if "first_number" in args: request.session["first_number"] = args["first_number"]
                        if "operation" in args: request.session["operation"] = args["operation"]
                        if "second_number" in args: request.session["second_number"] = args["second_number"]
                        tool_output = f"Current Session State: first_number={request.session.get('first_number')}, operation={request.session.get('operation')}, second_number={request.session.get('second_number')}"
                    
                    tool_calls_log.append(f"[Internal Tool - {tool_name} Started] args:\\n" + json.dumps(args, indent=2))
                    tool_calls_log.append(f"[Internal Tool - {tool_name} Output] \\n{tool_output}")
                    
                    user_messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [tool_call.model_dump()]
                    })
                    user_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_output
                    })
                    continue # Loop again to let the LLM decide what to do next
                
                # Determine target server
                target_server = None
                for key, tools in mcp_tools.items():
                    if active_toggles.get(key, False):
                        for t in tools:
                            if t["function"]["name"] == tool_name:
                                target_server = key
                                break
                
                if not target_server:
                    return JSONResponse({"type": "error", "message": f"Server for tool {tool_name} is unavailable."})

                session = mcp_sessions[target_server]
                try:
                    tool_calls_log.append(f"[{target_server} - {tool_name} Started] args:\\n" + json.dumps(args, indent=2))
                    mcp_tool_result = await asyncio.wait_for(session.call_tool(tool_name, args), timeout=15.0)
                    tool_output = mcp_tool_result.content[0].text
                    tool_calls_log.append(f"[{target_server} - {tool_name} Output] \\n{tool_output}")
                    
                    # Auto-clear session memory after successful math execution
                    request.session["first_number"] = None
                    request.session["operation"] = None
                    request.session["second_number"] = None
                    
                except Exception as e:
                    tool_output = f"ERROR: {e}"
                    tool_calls_log.append(f"[{target_server} Error] {tool_output}")
                    
                user_messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [tool_call.model_dump()]
                })
                user_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_output
                })
                continue # Loop again to let the LLM decide what to do next
            else:
                # The response_message already contains the final text, no need for a second API call
                final_text = response_message.content or ""
                
                async def generate_simple():
                    yield final_text

                original_user_msg = body.messages[-1].get("content", "N/A") if body.messages else "N/A"
                session_str = f"first_number={request.session.get('first_number')}\noperation={request.session.get('operation')}\nsecond_number={request.session.get('second_number')}"
                tool_str = "\n".join(tool_calls_log) if tool_calls_log else "No tools called."
                
                llm_res_str = "\n".join(llm_responses_log) if llm_responses_log else "No LLM responses."
                final_logs = [
                    f"--- [1. SYSTEM PROMPT] ---\n{SYSTEM_PROMPT}",
                    f"--- [2. AVAILABLE TOOLS] ---\n{json.dumps(tools_for_log, indent=2)}",
                    f"--- [3. USER PROMPT] ---\n{original_user_msg}",
                    f"--- [4. TOOL CALL RESULT] ---\n{tool_str}",
                    f"--- [5. SESSION STATE] ---\n{session_str}",
                    f"--- [6. LLM RESPONSES] ---\n{llm_res_str}"
                ]
                
                for log_msg in final_logs:
                    logging.info(log_msg)
                
                turn_latency_ms = round((time.perf_counter() - turn_start_time) * 1000)
                usage_data = {}
                if hasattr(response, "usage") and response.usage:
                    usage_data = {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }
                model_name = getattr(response, "model", "gpt-4o")
                
                return StreamingResponse(
                    generate_simple(),
                    media_type="text/plain",
                    headers={
                        "X-Background-Logs": json.dumps(final_logs),
                        "X-Token-Usage": json.dumps(usage_data),
                        "X-Model-Name": str(model_name),
                        "X-Latency-Ms": str(turn_latency_ms)
                    }
                )
                
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
            
    return JSONResponse(status_code=500, content={"error": "Agent iteration limit exceeded"})

@app.get("/api/current_state")
async def get_current_state(request: Request):
    last_op = request.session.get("last_operation", "None")
    last_nums = request.session.get("last_numbers", {})
    return {"operation": last_op, "numbers": last_nums}

@app.post("/api/clear")
async def clear_session(request: Request):
    request.session.clear()
    return {"status": "ok"}

@app.get("/metrics")
async def metrics_endpoint():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

def save_single_turn_data(turn_data: dict) -> dict:
    session_id = turn_data.get("session_id") or f"recording_{int(time.time())}"
    turn_number = turn_data.get("take_number") or turn_data.get("turn") or turn_data.get("turn_number") or 1
    take_label = turn_data.get("take_label") or f"TAKE #{turn_number}"
    recording_title = turn_data.get("recording_title") or f"RECORDING {turn_data.get('recording_number', 1)}"
    
    turn_id = turn_data.get("turn_id") or f"{session_id}_take_{turn_number}"
    turn_data["turn_id"] = turn_id
    turn_data["session_id"] = session_id
    turn_data["turn_number"] = turn_number
    turn_data["take_number"] = turn_number
    turn_data["take_label"] = take_label
    turn_data["recording_title"] = recording_title
    
    model = turn_data.get("model", "gpt-4o")
    user_msg = str(turn_data.get("user_message") or turn_data.get("user") or turn_data.get("prompt") or "")
    assistant_res = str(turn_data.get("assistant_response") or turn_data.get("assistant") or turn_data.get("response") or "")
    lat = float(turn_data.get("latency_seconds") or turn_data.get("inference_time") or turn_data.get("latency") or 0.0)
    usage = turn_data.get("usage") or {}
    p_tokens = int(turn_data.get("prompt_tokens") or turn_data.get("input_tokens") or usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
    c_tokens = int(turn_data.get("completion_tokens") or turn_data.get("output_tokens") or usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    tot_tokens = int(turn_data.get("total_tokens") or usage.get("total_tokens") or (p_tokens + c_tokens))
    tool_calls = turn_data.get("tool_calls") or turn_data.get("tools") or turn_data.get("toolCalls") or []
    timestamp_str = turn_data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    turn_data["timestamp"] = timestamp_str
    turn_data["latency_seconds"] = lat
    turn_data["inference_time"] = lat
    turn_data["prompt_tokens"] = p_tokens
    turn_data["input_tokens"] = p_tokens
    turn_data["completion_tokens"] = c_tokens
    turn_data["output_tokens"] = c_tokens
    turn_data["total_tokens"] = tot_tokens
    turn_data["tool_calls"] = tool_calls

    # 1. Save in directory recordings/{session_id}/take_{turn_number}.json
    session_dir = os.path.join(RECORDINGS_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    take_filename = f"take_{turn_number}.json"
    nested_path = os.path.join(session_dir, take_filename)
    with open(nested_path, "w", encoding="utf-8") as f:
        json.dump(turn_data, f, indent=2, ensure_ascii=False)

    # Also save flat file recordings/{session_id}_take_{turn_number}.json
    flat_filename = f"{session_id}_take_{turn_number}.json"
    flat_path = os.path.join(RECORDINGS_DIR, flat_filename)
    with open(flat_path, "w", encoding="utf-8") as f:
        json.dump(turn_data, f, indent=2, ensure_ascii=False)

    # 2. Save directly to PostgreSQL eval_turns table
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO eval_turns (
                        turn_id, session_id, turn_number, take_label, recording_title,
                        model, timestamp, user_message, assistant_response, tool_calls,
                        latency_seconds, prompt_tokens, completion_tokens,
                        total_tokens, payload
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (turn_id) DO UPDATE SET
                        take_label = EXCLUDED.take_label,
                        recording_title = EXCLUDED.recording_title,
                        user_message = EXCLUDED.user_message,
                        assistant_response = EXCLUDED.assistant_response,
                        tool_calls = EXCLUDED.tool_calls,
                        latency_seconds = EXCLUDED.latency_seconds,
                        prompt_tokens = EXCLUDED.prompt_tokens,
                        completion_tokens = EXCLUDED.completion_tokens,
                        total_tokens = EXCLUDED.total_tokens,
                        payload = EXCLUDED.payload;
                """, (
                    turn_id, session_id, turn_number, take_label, recording_title,
                    model, timestamp_str, user_msg, assistant_res, Jsonb(tool_calls),
                    lat, p_tokens, c_tokens, tot_tokens, Jsonb(turn_data)
                ))
                conn.commit()
    except Exception as pg_err:
        print(f"Warning: PostgreSQL eval_turns write error ({pg_err})")

    # 3. Update Prometheus metrics
    try:
        EVAL_TURNS_TOTAL.labels(model=model).inc()
        if lat:
            EVAL_LATENCY_HISTOGRAM.labels(model=model).observe(lat)
        if p_tokens:
            EVAL_TOKENS_TOTAL.labels(model=model, type="prompt").inc(p_tokens)
        if c_tokens:
            EVAL_TOKENS_TOTAL.labels(model=model, type="completion").inc(c_tokens)
        for tc in tool_calls:
            t_name = tc.get("name")
            if not t_name and tc.get("summary"):
                t_name = tc.get("summary")[:30]
            EVAL_TOOL_CALLS_TOTAL.labels(tool_name=t_name or "unknown").inc()
    except Exception as prom_err:
        print(f"Warning: Prometheus metrics error ({prom_err})")

    return {
        "turn_id": turn_id,
        "session_id": session_id,
        "take_number": turn_number,
        "take_label": take_label,
        "recording_title": recording_title,
        "filename": f"{session_id}/{take_filename}",
        "flat_filename": flat_filename
    }

@app.post("/api/recordings/turn")
async def save_turn_endpoint(request: Request):
    try:
        turn_data = await request.json()
        res = save_single_turn_data(turn_data)
        return {"status": "ok", **res}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to save turn: {str(e)}"})

@app.post("/api/recordings")
async def save_recording(request: Request):
    try:
        data = await request.json()
        session_id = data.get("session_id") or f"recording_{int(time.time())}"
        recording_title = data.get("recording_title") or "RECORDING"
        recording_number = int(data.get("recording_number") or 1)
        model = data.get("model", "gpt-4o")
        turns = data.get("turns", [])
        
        saved_turns = []
        for idx, t in enumerate(turns):
            t["session_id"] = session_id
            t["model"] = model
            t["recording_title"] = recording_title
            t["recording_number"] = recording_number
            if "take_number" not in t and "turn_number" not in t and "turn" not in t:
                t["take_number"] = idx + 1
            turn_res = save_single_turn_data(t)
            saved_turns.append(turn_res)
            
        try:
            EVAL_SESSIONS_TOTAL.labels(model=model).inc()
        except Exception:
            pass

        # Save session-level aggregate in eval_sessions
        try:
            with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    first_msg = ""
                    if turns and len(turns) > 0:
                        first_msg = str(turns[0].get("user_message") or turns[0].get("user") or "")
                    cur.execute("""
                        INSERT INTO eval_sessions (
                            session_id, recording_title, recording_number, model,
                            start_time, end_time, total_turns,
                            total_tokens, total_latency_seconds, first_message, payload
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (session_id) DO UPDATE SET
                            recording_title = EXCLUDED.recording_title,
                            recording_number = EXCLUDED.recording_number,
                            end_time = EXCLUDED.end_time,
                            total_turns = EXCLUDED.total_turns,
                            total_tokens = EXCLUDED.total_tokens,
                            total_latency_seconds = EXCLUDED.total_latency_seconds,
                            first_message = EXCLUDED.first_message,
                            payload = EXCLUDED.payload;
                    """, (
                        session_id, recording_title, recording_number, model,
                        data.get("start_time"), data.get("end_time"),
                        len(turns), data.get("total_tokens", 0), data.get("total_latency_seconds", 0.0),
                        first_msg[:200], Jsonb(data)
                    ))
                    conn.commit()
        except Exception as pg_err:
            print(f"Warning: PostgreSQL eval_sessions backup error ({pg_err})")

        return {"status": "ok", "session_id": session_id, "recording_title": recording_title, "saved_turns": saved_turns}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to save recording: {str(e)}"})

@app.post("/api/rerun_gpt5")
@app.post("/api/rerun_gemini")
async def rerun_gpt5_endpoint(request: Request):
    try:
        body = await request.json() if request.headers.get("content-type") == "application/json" else {}
        source_id = body.get("session_id")
        key = body.get("openai_api_key") or body.get("gemini_api_key") or os.getenv("OPENAI_API_KEY")
        rec_title = body.get("recording_title")
        rec_num = body.get("recording_number")
        from rerun_gpt5 import rerun_session_with_gpt5
        target_id = rerun_session_with_gpt5(
            source_session_id=source_id,
            recording_title=rec_title,
            recording_number=rec_num,
            openai_api_key=key
        )
        if target_id:
            return {"status": "ok", "message": "GPT-5.5 re-run completed and saved to PostgreSQL", "session_id": target_id}
        return JSONResponse(status_code=400, content={"error": "Re-run failed. Check OPENAI_API_KEY or ensure turns exist in database or recordings directory."})
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

@app.get("/api/evals/compare")
async def get_eval_comparison(session_id: str = None, recording_number: int = None, judge: bool = False):
    try:
        from run_evals import find_paired_sessions, evaluate_sessions
        gpt_id = None
        baseline_id = None

        if session_id:
            with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT session_id, model, recording_title, payload FROM eval_sessions WHERE session_id = %s;", (session_id,))
                    row = cur.fetchone()
                    if row:
                        s_id, mod, title, pay = row
                        if mod in ["gpt-5.5", "gemini-2.5-flash"] or "gpt-5.5" in (title or "").lower() or "gemini" in (title or "").lower():
                            baseline_id = s_id
                            if pay and isinstance(pay, dict) and pay.get("source_session_id"):
                                gpt_id = pay["source_session_id"]
                        else:
                            gpt_id = s_id
                            cur.execute("SELECT session_id FROM eval_sessions WHERE payload->>'source_session_id' = %s LIMIT 1;", (gpt_id,))
                            g_row = cur.fetchone()
                            if g_row:
                                baseline_id = g_row[0]

        if not gpt_id or not baseline_id:
            target_gpt, target_baseline = find_paired_sessions(recording_number)
            if target_gpt: gpt_id = target_gpt["session_id"]
            if target_baseline: baseline_id = target_baseline["session_id"]

        if not gpt_id or not baseline_id:
            return JSONResponse(status_code=404, content={"error": "Could not find paired GPT-4o and GPT-5.5 sessions."})

        summary = evaluate_sessions(gpt_id, baseline_id, use_judge=judge)
        return summary
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Evaluation error: {str(e)}"})

@app.post("/api/evals/judge")
async def judge_turn_endpoint(request: Request):
    try:
        body = await request.json()
        user_msg = body.get("user_message", "")
        gpt_res = body.get("gpt_response", "")
        baseline_res = body.get("gpt5_response") or body.get("gemini_response", "")
        session_id = body.get("session_id")
        turn_number = body.get("turn_number")
        gpt_lat = body.get("gpt_latency")
        baseline_lat = body.get("gpt5_latency") or body.get("gemini_latency")
        gpt_tok = body.get("gpt_tokens")
        baseline_tok = body.get("gpt5_tokens") or body.get("gemini_tokens")
        gpt_tools = body.get("gpt_tools")
        speedup = body.get("speedup")
        tok_saving = body.get("token_saving_pct")
        key = body.get("openai_api_key") or body.get("gemini_api_key") or os.getenv("OPENAI_API_KEY")

        if not key:
            return JSONResponse(status_code=400, content={"error": "OPENAI_API_KEY is required for LLM Judge."})

        from openai import OpenAI
        from run_evals import run_llm_judge
        client = OpenAI(api_key=key)
        verdict = run_llm_judge(
            user_msg=user_msg,
            gpt_res=gpt_res,
            baseline_res=baseline_res,
            client=client,
            gpt_latency=gpt_lat,
            baseline_latency=baseline_lat,
            gpt_tokens=gpt_tok,
            baseline_tokens=baseline_tok,
            gpt_tools=gpt_tools,
            speedup=speedup,
            tok_saving_pct=tok_saving
        )

        if session_id and turn_number is not None:
            try:
                with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            UPDATE eval_turns
                            SET payload = COALESCE(payload, '{}'::jsonb) || %s::jsonb
                            WHERE session_id = %s AND turn_number = %s;
                        """, (json.dumps({"judge": verdict}), session_id, turn_number))
                        conn.commit()
            except Exception as pe:
                print(f"[Judge Warning] Failed to persist single turn judge: {pe}")

        return verdict
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Judge error: {str(e)}"})

@app.post("/api/recordings/clear-all")
@app.delete("/api/recordings/clear-all")
async def clear_all_recordings():
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE eval_turns, eval_sessions RESTART IDENTITY CASCADE;")
                conn.commit()
        # Clean local files
        if os.path.exists(RECORDINGS_DIR):
            for item in os.listdir(RECORDINGS_DIR):
                p = os.path.join(RECORDINGS_DIR, item)
                if os.path.isfile(p):
                    try: os.remove(p)
                    except: pass
                elif os.path.isdir(p):
                    try: shutil.rmtree(p)
                    except: pass
        return {"status": "ok", "message": "All database sessions and turns cleared successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to clear database: {str(e)}"})

@app.get("/api/recordings")
async def list_recordings():
    recordings_map = {}
    
    # 1. Query PostgreSQL eval_sessions and eval_turns
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                # First fetch sessions
                cur.execute("""
                    SELECT session_id, recording_title, recording_number, model,
                           start_time, end_time, total_turns, total_tokens,
                           total_latency_seconds, created_at, payload
                    FROM eval_sessions ORDER BY created_at ASC;
                """)
                for r in cur.fetchall():
                    s_id = r[0]
                    rec_title = r[1] or f"RECORDING {len(recordings_map) + 1}"
                    recordings_map[s_id] = {
                        "session_id": s_id,
                        "recording_title": rec_title,
                        "recording_number": r[2] or (len(recordings_map) + 1),
                        "model": r[3],
                        "start_time": r[4].isoformat() if r[4] else "",
                        "end_time": r[5].isoformat() if r[5] else "",
                        "total_takes": r[6] or 0,
                        "total_tokens": r[7] or 0,
                        "total_latency_seconds": float(r[8] or 0),
                        "created_at": r[9].isoformat() if r[9] else "",
                        "source_session_id": (r[10].get("source_session_id") if (len(r) > 10 and isinstance(r[10], dict)) else None),
                        "payload": r[10] if len(r) > 10 else {},
                        "takes": []
                    }

                # Next fetch all turns
                cur.execute("""
                    SELECT turn_id, session_id, turn_number, take_label, recording_title,
                           model, timestamp, user_message, assistant_response,
                           latency_seconds, total_tokens, payload, prompt_tokens, completion_tokens, tool_calls
                    FROM eval_turns ORDER BY created_at ASC, turn_number ASC;
                """)
                for r in cur.fetchall():
                    t_id, s_id, t_num, t_label, rec_title, model, ts, u_msg, a_res, lat, toks, payload, p_tok, c_tok, t_calls = r
                    
                    if s_id not in recordings_map:
                        rec_num = len(recordings_map) + 1
                        rec_title_final = rec_title or f"RECORDING {rec_num}"
                        recordings_map[s_id] = {
                            "session_id": s_id,
                            "recording_title": rec_title_final,
                            "recording_number": rec_num,
                            "model": model,
                            "start_time": ts.isoformat() if ts else "",
                            "total_takes": 0,
                            "total_tokens": 0,
                            "total_latency_seconds": 0.0,
                            "created_at": ts.isoformat() if ts else "",
                            "takes": []
                        }

                    take_label_final = t_label or f"TAKE #{t_num}"
                    take_obj = {
                        "turn_id": t_id,
                        "session_id": s_id,
                        "take_number": t_num,
                        "take_label": take_label_final,
                        "recording_title": recordings_map[s_id]["recording_title"],
                        "filename": f"{s_id}/take_{t_num}.json",
                        "flat_filename": f"{t_id}.json",
                        "timestamp": ts.isoformat() if ts else "",
                        "user_message": u_msg or "",
                        "preview": (u_msg or "")[:65],
                        "assistant_response": a_res or "",
                        "latency_seconds": float(lat or 0),
                        "inference_time": float(lat or 0),
                        "prompt_tokens": p_tok or 0,
                        "input_tokens": p_tok or 0,
                        "completion_tokens": c_tok or 0,
                        "output_tokens": c_tok or 0,
                        "total_tokens": toks or ((p_tok or 0) + (c_tok or 0)),
                        "tool_calls": t_calls or [],
                        "payload": payload if isinstance(payload, dict) else {},
                        "model": model
                    }
                    if not any(t["turn_id"] == t_id for t in recordings_map[s_id]["takes"]):
                        recordings_map[s_id]["takes"].append(take_obj)
                        recordings_map[s_id]["total_takes"] = len(recordings_map[s_id]["takes"])
                        recordings_map[s_id]["total_tokens"] += (toks or 0)
                        recordings_map[s_id]["total_latency_seconds"] = round(recordings_map[s_id]["total_latency_seconds"] + float(lat or 0), 3)

                # Unpack legacy sessions payload["turns"] if takes was empty
                for s_id, s_obj in recordings_map.items():
                    if len(s_obj["takes"]) == 0 and s_obj.get("payload"):
                        payload_data = s_obj["payload"]
                        if isinstance(payload_data, dict) and "turns" in payload_data and isinstance(payload_data["turns"], list):
                            for idx, t in enumerate(payload_data["turns"]):
                                t_num = t.get("turn") or t.get("turn_number") or (idx + 1)
                                t_id = f"{s_id}_take_{t_num}"
                                u_msg = t.get("user_message") or t.get("user") or ""
                                s_obj["takes"].append({
                                    "turn_id": t_id,
                                    "session_id": s_id,
                                    "take_number": t_num,
                                    "take_label": f"TAKE #{t_num}",
                                    "recording_title": s_obj["recording_title"],
                                    "filename": f"{s_id}/take_{t_num}.json",
                                    "flat_filename": f"{t_id}.json",
                                    "timestamp": t.get("timestamp") or "",
                                    "user_message": u_msg,
                                    "preview": u_msg[:65],
                                    "assistant_response": t.get("assistant_response") or "",
                                    "latency_seconds": float(t.get("latency_seconds") or 0),
                                    "total_tokens": t.get("usage", {}).get("total_tokens") or 0,
                                    "model": t.get("model") or s_obj.get("model", "gpt-4o")
                                })
                            s_obj["total_takes"] = len(s_obj["takes"])
                    if "payload" in s_obj:
                        del s_obj["payload"]

    except Exception as db_err:
        print(f"PostgreSQL read error ({db_err}).")

    # 2. Check disk files in RECORDINGS_DIR to augment or fallback
    try:
        # Check subdirectories first: recordings/<session_id>/take_*.json
        for entry in sorted(os.listdir(RECORDINGS_DIR)):
            entry_path = os.path.join(RECORDINGS_DIR, entry)
            if os.path.isdir(entry_path):
                s_id = entry
                if s_id not in recordings_map:
                    rec_num = len(recordings_map) + 1
                    recordings_map[s_id] = {
                        "session_id": s_id,
                        "recording_title": f"RECORDING {rec_num}",
                        "recording_number": rec_num,
                        "model": "gpt-4o",
                        "start_time": "",
                        "total_takes": 0,
                        "total_tokens": 0,
                        "total_latency_seconds": 0.0,
                        "takes": []
                    }
                for take_file in sorted(os.listdir(entry_path)):
                    if take_file.endswith(".json"):
                        take_path = os.path.join(entry_path, take_file)
                        try:
                            with open(take_path, "r", encoding="utf-8") as f:
                                t_data = json.load(f)
                            t_num = t_data.get("take_number") or t_data.get("turn_number") or 1
                            t_id = t_data.get("turn_id") or f"{s_id}_take_{t_num}"
                            if not any(t["turn_id"] == t_id for t in recordings_map[s_id]["takes"]):
                                u_msg = t_data.get("user_message") or t_data.get("user") or ""
                                lat = float(t_data.get("latency_seconds") or 0)
                                toks = int(t_data.get("usage", {}).get("total_tokens") or t_data.get("total_tokens") or 0)
                                recordings_map[s_id]["takes"].append({
                                    "turn_id": t_id,
                                    "session_id": s_id,
                                    "take_number": t_num,
                                    "take_label": t_data.get("take_label") or f"TAKE #{t_num}",
                                    "recording_title": recordings_map[s_id]["recording_title"],
                                    "filename": f"{s_id}/{take_file}",
                                    "flat_filename": f"{t_id}.json",
                                    "timestamp": t_data.get("timestamp") or "",
                                    "user_message": u_msg,
                                    "preview": u_msg[:65],
                                    "assistant_response": t_data.get("assistant_response") or "",
                                    "latency_seconds": lat,
                                    "total_tokens": toks,
                                    "model": t_data.get("model", "gpt-4o")
                                })
                                recordings_map[s_id]["total_takes"] = len(recordings_map[s_id]["takes"])
                                recordings_map[s_id]["total_tokens"] += toks
                                recordings_map[s_id]["total_latency_seconds"] = round(recordings_map[s_id]["total_latency_seconds"] + lat, 3)
                        except Exception:
                            pass

            elif os.path.isfile(entry_path) and entry.endswith(".json"):
                # Flat json file
                try:
                    with open(entry_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    
                    if "turn_number" in data or "turn_id" in data or "take_number" in data:
                        s_id = data.get("session_id") or "session_misc"
                        t_num = data.get("take_number") or data.get("turn_number") or 1
                        t_id = data.get("turn_id") or entry.replace(".json", "")
                        
                        if s_id not in recordings_map:
                            rec_num = len(recordings_map) + 1
                            recordings_map[s_id] = {
                                "session_id": s_id,
                                "recording_title": data.get("recording_title") or f"RECORDING {rec_num}",
                                "recording_number": rec_num,
                                "model": data.get("model", "gpt-4o"),
                                "start_time": data.get("timestamp") or "",
                                "total_takes": 0,
                                "total_tokens": 0,
                                "total_latency_seconds": 0.0,
                                "takes": []
                            }
                        
                        if not any(t["turn_id"] == t_id for t in recordings_map[s_id]["takes"]):
                            u_msg = data.get("user_message") or data.get("user") or ""
                            lat = float(data.get("latency_seconds") or 0)
                            toks = int(data.get("usage", {}).get("total_tokens") or data.get("total_tokens") or 0)
                            recordings_map[s_id]["takes"].append({
                                "turn_id": t_id,
                                "session_id": s_id,
                                "take_number": t_num,
                                "take_label": data.get("take_label") or f"TAKE #{t_num}",
                                "recording_title": recordings_map[s_id]["recording_title"],
                                "filename": entry,
                                "flat_filename": entry,
                                "timestamp": data.get("timestamp") or "",
                                "user_message": u_msg,
                                "preview": u_msg[:65],
                                "assistant_response": data.get("assistant_response") or "",
                                "latency_seconds": lat,
                                "total_tokens": toks,
                                "model": data.get("model", "gpt-4o")
                            })
                            recordings_map[s_id]["total_takes"] = len(recordings_map[s_id]["takes"])
                            recordings_map[s_id]["total_tokens"] += toks
                            recordings_map[s_id]["total_latency_seconds"] = round(recordings_map[s_id]["total_latency_seconds"] + lat, 3)

                    elif "turns" in data and isinstance(data["turns"], list):
                        s_id = data.get("session_id") or entry.replace(".json", "")
                        if s_id not in recordings_map:
                            rec_num = len(recordings_map) + 1
                            recordings_map[s_id] = {
                                "session_id": s_id,
                                "recording_title": data.get("recording_title") or f"RECORDING {rec_num}",
                                "recording_number": rec_num,
                                "model": data.get("model", "gpt-4o"),
                                "start_time": data.get("start_time") or "",
                                "total_takes": len(data["turns"]),
                                "total_tokens": data.get("total_tokens", 0),
                                "total_latency_seconds": float(data.get("total_latency_seconds", 0)),
                                "takes": []
                            }
                            for idx, t in enumerate(data["turns"]):
                                t_num = t.get("turn") or t.get("turn_number") or (idx + 1)
                                t_id = f"{s_id}_take_{t_num}"
                                u_msg = t.get("user_message") or t.get("user") or ""
                                recordings_map[s_id]["takes"].append({
                                    "turn_id": t_id,
                                    "session_id": s_id,
                                    "take_number": t_num,
                                    "take_label": f"TAKE #{t_num}",
                                    "recording_title": recordings_map[s_id]["recording_title"],
                                    "filename": entry,
                                    "flat_filename": f"{t_id}.json",
                                    "timestamp": t.get("timestamp") or "",
                                    "user_message": u_msg,
                                    "preview": u_msg[:65],
                                    "assistant_response": t.get("assistant_response") or "",
                                    "latency_seconds": float(t.get("latency_seconds") or 0),
                                    "total_tokens": t.get("usage", {}).get("total_tokens") or 0,
                                    "model": data.get("model", "gpt-4o")
                                })
                except Exception:
                    pass
    except Exception as e:
        print(f"Error scanning disk recordings: {e}")

    recordings_list = list(recordings_map.values())
    for rec in recordings_list:
        rec["takes"].sort(key=lambda x: int(x.get("take_number", 0)))

    # Separate primary sessions from GPT-5.5 (or legacy Gemini) simulation runs
    baseline_simulations_by_source = {}
    primary_sessions = []
    orphan_baseline_sessions = []

    for s_obj in recordings_list:
        s_id = s_obj.get("session_id", "")
        model_name = s_obj.get("model", "")
        title_str = (s_obj.get("recording_title") or "").lower()
        is_baseline_sim = (
            model_name in ["gpt-5.5", "gemini-2.5-flash"]
            or s_id.startswith("gpt5_")
            or s_id.startswith("gemini_")
            or "gpt-5.5" in title_str
            or "gemini" in title_str
            or bool(s_obj.get("source_session_id"))
        )
        if is_baseline_sim:
            src_id = s_obj.get("source_session_id")
            if src_id:
                baseline_simulations_by_source[src_id] = s_obj
            else:
                orphan_baseline_sessions.append(s_obj)
        else:
            primary_sessions.append(s_obj)

    # If there are no primary GPT sessions, treat orphan baseline as primary
    if not primary_sessions and orphan_baseline_sessions:
        primary_sessions = orphan_baseline_sessions
        orphan_baseline_sessions = []

    # Sort primary recordings chronologically so the earliest recorded is RECORDING 1
    primary_sessions.sort(key=lambda x: (x.get("start_time") or x.get("created_at") or x.get("session_id")), reverse=False)

    for idx, rec in enumerate(primary_sessions, start=1):
        rec["recording_number"] = idx
        rec["recording_title"] = f"RECORDING {idx}"
        for t in rec["takes"]:
            t["recording_title"] = rec["recording_title"]
            t["recording_number"] = idx

        # Find paired baseline simulation by source session_id or recording_number fallback
        matched_baseline = baseline_simulations_by_source.get(rec["session_id"])
        if not matched_baseline and orphan_baseline_sessions:
            for cand in orphan_baseline_sessions:
                if cand.get("recording_number") == idx or f"recording {idx}" in (cand.get("recording_title") or "").lower():
                    matched_baseline = cand
                    break

        if matched_baseline:
            # Set baseline takes title to match parent
            b_takes = matched_baseline.get("takes", [])
            for bt in b_takes:
                bt["recording_title"] = f"RECORDING {idx} (GPT-5.5)"
                bt["recording_number"] = idx

            baseline_obj = {
                "session_id": matched_baseline["session_id"],
                "model": "gpt-5.5",
                "recording_title": f"RECORDING {idx} (GPT-5.5)",
                "recording_number": idx,
                "total_takes": matched_baseline.get("total_takes", len(b_takes)),
                "total_tokens": matched_baseline.get("total_tokens", 0),
                "total_latency_seconds": matched_baseline.get("total_latency_seconds", 0.0),
                "created_at": matched_baseline.get("created_at") or "",
                "start_time": matched_baseline.get("start_time") or "",
                "takes": b_takes
            }
            rec["gpt5_run"] = baseline_obj
            rec["gemini_run"] = baseline_obj # Backward-compatibility alias
            rec["available_models"] = ["gpt-4o", "gpt-5.5"]
        else:
            rec["gpt5_run"] = None
            rec["gemini_run"] = None
            rec["available_models"] = ["gpt-4o"]

    return {"recordings": primary_sessions}

@app.get("/api/recordings/{filename:path}")
async def get_recording(filename: str):
    clean_id = filename.replace(".json", "")
    parts = clean_id.split("/")
    base_id = parts[-1]

    # 1. Try PostgreSQL eval_turns
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT payload FROM eval_turns 
                    WHERE turn_id = %s OR turn_id = %s OR turn_id = %s
                    LIMIT 1;
                """, (filename, clean_id, base_id))
                row = cur.fetchone()
                if row and row[0]:
                    return row[0]
                
                if len(parts) >= 2 and parts[-1].startswith("take_"):
                    try:
                        take_num = int(parts[-1].replace("take_", ""))
                        cur.execute("""
                            SELECT payload FROM eval_turns
                            WHERE session_id = %s AND turn_number = %s
                            LIMIT 1;
                        """, (parts[0], take_num))
                        row = cur.fetchone()
                        if row and row[0]:
                            return row[0]
                    except ValueError:
                        pass
    except Exception:
        pass

    # 2. Try file system
    candidate_paths = [
        os.path.join(RECORDINGS_DIR, filename),
        os.path.join(RECORDINGS_DIR, os.path.basename(filename)),
        os.path.join(RECORDINGS_DIR, f"{clean_id}.json"),
        os.path.join(RECORDINGS_DIR, f"{base_id}.json")
    ]
    for cp in candidate_paths:
        if os.path.exists(cp) and os.path.isfile(cp):
            try:
                with open(cp, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                
                # If this is a legacy session file with 'turns' and user requested a specific take
                if isinstance(file_data, dict) and "turns" in file_data and isinstance(file_data["turns"], list):
                    requested_take = None
                    if "take_" in filename:
                        try:
                            take_part = filename.split("take_")[-1].replace(".json", "")
                            requested_take = int(take_part.split("/")[0])
                        except ValueError:
                            pass
                    if requested_take is not None:
                        matched = next((t for t in file_data["turns"] if (t.get("turn") or t.get("turn_number")) == requested_take), None)
                        if matched:
                            return {
                                "turn_id": f"{file_data.get('session_id')}_take_{requested_take}",
                                "session_id": file_data.get("session_id"),
                                "take_number": requested_take,
                                "take_label": f"TAKE #{requested_take}",
                                "timestamp": matched.get("timestamp") or file_data.get("timestamp") or "",
                                "user_message": matched.get("user_message") or matched.get("user") or "",
                                "assistant_response": matched.get("assistant_response") or matched.get("assistant") or "",
                                "tool_calls": matched.get("tool_calls") or [],
                                "latency_seconds": float(matched.get("latency_seconds") or 0),
                                "usage": matched.get("usage") or {},
                                "model": matched.get("model") or file_data.get("model", "gpt-4o")
                            }
                return file_data
            except Exception:
                pass

    # 3. Try PostgreSQL eval_sessions (for whole session payload)
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT payload FROM eval_sessions 
                    WHERE session_id = %s OR session_id = %s
                    LIMIT 1;
                """, (clean_id, parts[0]))
                row = cur.fetchone()
                if row and row[0]:
                    return row[0]
    except Exception:
        pass

    return JSONResponse(status_code=404, content={"error": f"Recording take not found: {filename}"})

@app.delete("/api/recordings/{filename:path}")
async def delete_recording(filename: str):
    clean_id = filename.replace(".json", "")
    parts = clean_id.split("/")
    base_id = parts[-1]

    # Delete from PostgreSQL
    try:
        with psycopg.connect(POSTGRES_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM eval_turns WHERE turn_id = %s OR turn_id = %s;", (clean_id, base_id))
                cur.execute("DELETE FROM eval_sessions WHERE session_id = %s;", (clean_id,))
                conn.commit()
    except Exception:
        pass

    # Delete local file or directory
    path1 = os.path.join(RECORDINGS_DIR, filename)
    path2 = os.path.join(RECORDINGS_DIR, f"{clean_id}.json")
    path3 = os.path.join(RECORDINGS_DIR, clean_id)
    for p in [path1, path2, path3]:
        if os.path.isfile(p):
            try: os.remove(p)
            except Exception: pass
        elif os.path.isdir(p):
            try: shutil.rmtree(p)
            except Exception: pass

    return {"status": "ok", "deleted": filename}

app.mount("/", StaticFiles(directory="public", html=True), name="public")
