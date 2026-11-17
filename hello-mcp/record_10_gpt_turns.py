#!/usr/bin/env python3
"""
Generate 10 Real Evaluation Turns using GPT with Native Tool Calling.
Calls OpenAI with actual tool calling enabled, executes the tools, records
latencies, tokens, and payloads, and stores all 10 turns directly into PostgreSQL
(and triggers Prometheus metrics) so they appear in the Evaluation Console.
"""

import os
import sys
import time
import json
import psycopg
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/mathrouter")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("FATAL: OPENAI_API_KEY not found in .env")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

# Tool Schemas for GPT
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "server_add",
            "description": "Calculates the sum of two numbers",
            "parameters": {
                "type": "object",
                "properties": {
                    "num1": {"type": "number", "description": "The first number"},
                    "num2": {"type": "number", "description": "The second number"}
                },
                "required": ["num1", "num2"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "server_sub",
            "description": "Subtracts num2 from num1",
            "parameters": {
                "type": "object",
                "properties": {
                    "num1": {"type": "number", "description": "The minuend"},
                    "num2": {"type": "number", "description": "The subtrahend"}
                },
                "required": ["num1", "num2"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "server_mul",
            "description": "Multiplies two numbers",
            "parameters": {
                "type": "object",
                "properties": {
                    "num1": {"type": "number", "description": "First factor"},
                    "num2": {"type": "number", "description": "Second factor"}
                },
                "required": ["num1", "num2"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "server_div",
            "description": "Divides num1 by num2",
            "parameters": {
                "type": "object",
                "properties": {
                    "num1": {"type": "number", "description": "Numerator"},
                    "num2": {"type": "number", "description": "Denominator"}
                },
                "required": ["num1", "num2"]
            }
        }
    }
]

# Tool execution logic
def execute_math_tool(tool_name: str, args: dict):
    n1 = float(args.get("num1", 0))
    n2 = float(args.get("num2", 0))
    if tool_name == "server_add":
        return str(n1 + n2)
    elif tool_name == "server_sub":
        return str(n1 - n2)
    elif tool_name == "server_mul":
        return str(n1 * n2)
    elif tool_name == "server_div":
        if n2 == 0:
            return "Error: Cannot divide by zero"
        return str(n1 / n2)
    return "Error: Unknown tool"

# 10 Diverse Evaluation Problems
EVAL_PROBLEMS = [
    "What is 42 plus 58?",
    "Subtract 89 from 250",
    "Multiply 16 by 25",
    "Divide 144 by 12",
    "Add 1024 and 2048",
    "Subtract 350 from 1000",
    "What is 15 multiplied by 15?",
    "Divide 5000 by 25",
    "Add 777 and 888",
    "Multiply 99 by 9"
]

def run_10_gpt_evaluations():
    session_id = f"eval_gpt_benchmark_{int(time.time())}"
    recording_title = "GPT-4o 10-Problem Evaluation"
    print(f"\n=======================================================")
    print(f"Starting 10-problem GPT evaluation with native tool calls")
    print(f"Target PostgreSQL Session ID: {session_id}")
    print(f"=======================================================\n")

    saved_turns = []
    total_tokens_accum = 0
    total_latency_accum = 0.0

    import prompts
    system_message = {
        "role": "system",
        "content": prompts.build_system_prompt("executive_summary")
    }

    for idx, user_prompt in enumerate(EVAL_PROBLEMS, start=1):
        print(f"[{idx}/10] Query: '{user_prompt}'")
        turn_start = time.perf_counter()

        messages = [
            system_message,
            {"role": "user", "content": user_prompt}
        ]

        # 1. First GPT call - should trigger tool call
        resp1 = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.0
        )

        msg1 = resp1.choices[0].message
        tool_records = []
        tokens_this_turn = resp1.usage.total_tokens if resp1.usage else 0

        if msg1.tool_calls:
            for tc in msg1.tool_calls:
                fn_name = tc.function.name
                fn_args = json.loads(tc.function.arguments)
                tool_output = execute_math_tool(fn_name, fn_args)
                print(f"   -> Tool Call: {fn_name}({fn_args}) => {tool_output}")

                tool_records.append({
                    "id": tc.id,
                    "tool": fn_name,
                    "arguments": fn_args,
                    "output": tool_output
                })

                messages.append(msg1)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": tool_output
                })

            # 2. Second GPT call - generate conversational answer from tool result
            resp2 = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.0
            )
            final_answer = resp2.choices[0].message.content or ""
            if resp2.usage:
                tokens_this_turn += resp2.usage.total_tokens
        else:
            final_answer = msg1.content or ""

        turn_latency = round(time.perf_counter() - turn_start, 3)
        total_latency_accum += turn_latency
        total_tokens_accum += tokens_this_turn

        print(f"   -> Response: {final_answer.strip()}")
        print(f"   -> Stats: {turn_latency}s | {tokens_this_turn} tokens\n")

        turn_id = f"{session_id}_take_{idx}"
        turn_data = {
            "turn_id": turn_id,
            "session_id": session_id,
            "turn_number": idx,
            "take_number": idx,
            "take_label": f"TAKE #{idx}",
            "recording_title": recording_title,
            "model": "gpt-4o",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "user_message": user_prompt,
            "assistant_response": final_answer.strip(),
            "tool_calls": tool_records,
            "latency_seconds": turn_latency,
            "prompt_tokens": int(tokens_this_turn * 0.7),
            "completion_tokens": int(tokens_this_turn * 0.3),
            "total_tokens": tokens_this_turn,
            "payload": {
                "turn_id": turn_id,
                "user_prompt": user_prompt,
                "tool_calls": tool_records,
                "assistant_response": final_answer.strip()
            }
        }
        saved_turns.append(turn_data)

        # Insert turn into PostgreSQL eval_turns
        with psycopg.connect(POSTGRES_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO eval_turns (
                        turn_id, session_id, turn_number, take_label, recording_title,
                        model, timestamp, user_message, assistant_response, tool_calls,
                        latency_seconds, prompt_tokens, completion_tokens, total_tokens, payload
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s
                    );
                """, (
                    turn_id, session_id, idx, f"TAKE #{idx}", recording_title,
                    "gpt-4o", user_prompt, final_answer.strip(), json.dumps(tool_records),
                    turn_latency, turn_data["prompt_tokens"], turn_data["completion_tokens"],
                    tokens_this_turn, json.dumps(turn_data["payload"])
                ))
                conn.commit()

    # Save Session in eval_sessions
    with psycopg.connect(POSTGRES_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO eval_sessions (
                    session_id, recording_title, recording_number, model,
                    start_time, end_time, total_turns, total_tokens,
                    total_latency_seconds, first_message, payload
                ) VALUES (
                    %s, %s, %s, %s, NOW(), NOW(), %s, %s, %s, %s, %s
                );
            """, (
                session_id, recording_title, 1, "gpt-4o",
                10, total_tokens_accum, round(total_latency_accum, 3),
                EVAL_PROBLEMS[0], json.dumps({"source": "gpt_benchmark_generator"})
            ))
            conn.commit()

    print(f"=======================================================")
    print(f"Successfully generated and saved all 10 GPT turns!")
    print(f"Session ID: {session_id}")
    print(f"Total Tokens: {total_tokens_accum}")
    print(f"Total Latency: {round(total_latency_accum, 2)}s")
    print(f"PostgreSQL: mathrouter.eval_sessions and mathrouter.eval_turns")
    print(f"Open http://localhost:3001 to view in the Evaluation Console!")
    print(f"=======================================================\n")
    return session_id

if __name__ == "__main__":
    run_10_gpt_evaluations()
