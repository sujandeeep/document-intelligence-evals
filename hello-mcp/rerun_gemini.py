#!/usr/bin/env python3
"""
Re-run Recorded GPT Sessions with Gemini (Zero Tool Calling)
Takes existing recorded sessions from PostgreSQL and executes the exact same
prompts through Gemini with tools disabled, saving results into PostgreSQL
so they can be evaluated side-by-side in the Evaluation Console.
"""

import os
import sys
import time
import json
import psycopg
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/mathrouter")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def get_db_connection():
    return psycopg.connect(POSTGRES_URL, connect_timeout=5)

def rerun_session_with_gemini(source_session_id=None, recording_title=None, recording_number=None, gemini_api_key=None):
    api_key = gemini_api_key or GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("\n[ERROR] GEMINI_API_KEY is not set.")
        print("Please set it in hello-mcp/.env or pass it as an argument.\n")
        return False

    from google import genai
    client = genai.Client(api_key=api_key)

    # Determine target title: e.g. "recording 1(  gemini)"
    rec_num = recording_number
    if not recording_title and source_session_id:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT recording_title, recording_number FROM eval_sessions WHERE session_id = %s LIMIT 1;", (source_session_id,))
                    row = cur.fetchone()
                    if row and row[0]:
                        recording_title = row[0]
                        if rec_num is None and row[1]:
                            rec_num = row[1]
                    if not recording_title:
                        cur.execute("SELECT recording_title FROM eval_turns WHERE session_id = %s LIMIT 1;", (source_session_id,))
                        row = cur.fetchone()
                        if row and row[0]:
                            recording_title = row[0]
        except Exception:
            pass

    if not recording_title:
        recording_title = "recording 1"

    if rec_num is None:
        import re
        m = re.search(r'\d+', str(recording_title))
        rec_num = int(m.group(0)) if m else 1

    import re
    clean_base = re.sub(r'\s*\(\s*gemini\s*\)', '', str(recording_title), flags=re.IGNORECASE).strip()
    if not clean_base:
        clean_base = f"recording {rec_num}"

    target_title = f"{clean_base.lower()}(  gemini)"

    rows = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Fetch turns to re-run from PostgreSQL
                if source_session_id:
                    cur.execute(
                        "SELECT turn_id, session_id, turn_number, user_message, assistant_response, latency_seconds, total_tokens "
                        "FROM eval_turns WHERE session_id = %s ORDER BY turn_number ASC;",
                        (source_session_id,)
                    )
                else:
                    cur.execute(
                        "SELECT turn_id, session_id, turn_number, user_message, assistant_response, latency_seconds, total_tokens "
                        "FROM eval_turns ORDER BY turn_number ASC LIMIT 10;"
                    )
                rows = cur.fetchall()
    except Exception as db_err:
        print(f"[WARN] Database query failed ({db_err}), will check disk recordings.")

    # Fallback to local JSON files if database is empty
    if not rows:
        RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recordings")
        candidates = []
        if source_session_id and os.path.isfile(source_session_id):
            candidates = [source_session_id]
        elif source_session_id and os.path.isdir(os.path.join(RECORDINGS_DIR, source_session_id)):
            sdir = os.path.join(RECORDINGS_DIR, source_session_id)
            for f in sorted(os.listdir(sdir)):
                if f.endswith(".json"):
                    candidates.append(os.path.join(sdir, f))
        elif os.path.exists(RECORDINGS_DIR):
            for root, _, files in os.walk(RECORDINGS_DIR):
                for f in sorted(files):
                    if f.endswith(".json") and not f.startswith("gemini_"):
                        candidates.append(os.path.join(root, f))

        for idx, cf in enumerate(candidates, start=1):
            try:
                with open(cf, "r", encoding="utf-8") as f:
                    jdata = json.load(f)
                    u_msg = jdata.get("user_message") or jdata.get("user") or jdata.get("prompt")
                    a_res = jdata.get("assistant_response") or jdata.get("assistant") or jdata.get("response")
                    lat = jdata.get("latency_seconds") or jdata.get("inference_time") or 0.0
                    tok = jdata.get("total_tokens") or 0
                    if u_msg:
                        rows.append((f"json_turn_{idx}", "json_source", idx, u_msg, a_res, lat, tok))
            except Exception:
                pass

    if not rows:
        print("[NOTICE] No turns found in database or recordings directory to re-run. Please record mathrouter turns first.")
        return False

    target_session_id = f"gemini_eval_{int(time.time())}"
    print(f"\nFound {len(rows)} recorded turns. Re-running with Gemini 2.5 Flash (ZERO TOOLS) -> Session: {target_session_id}")

    gemini_turns = []
    total_tokens_all = 0
    total_latency_all = 0.0

    system_instruction = (
        "You are MathRouter. Solve the math problem directly in a conversational, human voice. "
        "Do not use LaTeX formatting. State the calculation clearly. You have no external tools."
    )

    for idx, row in enumerate(rows, start=1):
        gpt_turn_id, orig_session, turn_num, user_msg, gpt_res, gpt_lat, gpt_tok = row
        print(f"\n[{idx}/{len(rows)}] Re-running: '{user_msg}'")

        start_t = time.perf_counter()
        try:
            # Call Gemini without tools
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_instruction}\n\nProblem: {user_msg}"
                # Notice: tools parameter is completely omitted
            )
            elapsed = round(time.perf_counter() - start_t, 3)
            reply_text = response.text or "No response generated."

            # Calculate tokens if available
            usage_meta = getattr(response, "usage_metadata", None)
            prompt_tok = getattr(usage_meta, "prompt_token_count", None) if usage_meta else None
            comp_tok = getattr(usage_meta, "candidates_token_count", None) if usage_meta else None

            if prompt_tok is not None and comp_tok is not None:
                tot_tok = prompt_tok + comp_tok
            elif prompt_tok is not None:
                tot_tok = prompt_tok
            elif comp_tok is not None:
                tot_tok = comp_tok
            else:
                tot_tok = None

            total_tokens_all += (tot_tok or 0)
            total_latency_all += (elapsed or 0.0)

            new_turn_id = f"{target_session_id}_take_{idx}"
            iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

            # Format EXACTLY matching the user-requested JSON schema with 'NA' fallbacks
            turn_record = {
                "model": "gemini-2.5-flash",
                "usage": {
                    "total_tokens": tot_tok if tot_tok is not None else "NA",
                    "prompt_tokens": prompt_tok if prompt_tok is not None else "NA",
                    "completion_tokens": comp_tok if comp_tok is not None else "NA"
                },
                "turn_id": new_turn_id,
                "timestamp": iso_timestamp,
                "session_id": target_session_id,
                "take_label": f"TAKE #{idx}",
                "tool_calls": [],
                "take_number": idx,
                "turn_number": idx,
                "input_tokens": prompt_tok if prompt_tok is not None else "NA",
                "total_tokens": tot_tok if tot_tok is not None else "NA",
                "user_message": user_msg if user_msg else "NA",
                "output_tokens": comp_tok if comp_tok is not None else "NA",
                "prompt_tokens": prompt_tok if prompt_tok is not None else "NA",
                "inference_time": elapsed if elapsed is not None else "NA",
                "latency_seconds": elapsed if elapsed is not None else "NA",
                "recording_title": target_title,
                "recording_number": rec_num,
                "completion_tokens": comp_tok if comp_tok is not None else "NA",
                "assistant_response": reply_text if reply_text else "NA"
            }

            gemini_turns.append(turn_record)

            # Insert turn into PostgreSQL eval_turns
            with get_db_connection() as conn:
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
                        new_turn_id, target_session_id, idx, f"TAKE #{idx}", target_title,
                        "gemini-2.5-flash", user_msg, reply_text, json.dumps([]),
                        elapsed if isinstance(elapsed, (int, float)) else 0.0,
                        prompt_tok if isinstance(prompt_tok, int) else 0,
                        comp_tok if isinstance(comp_tok, int) else 0,
                        tot_tok if isinstance(tot_tok, int) else 0,
                        json.dumps(turn_record)
                    ))
                    conn.commit()

            # Save JSON files to recordings/
            try:
                RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recordings")
                sdir = os.path.join(RECORDINGS_DIR, target_session_id)
                os.makedirs(sdir, exist_ok=True)
                with open(os.path.join(sdir, f"take_{idx}.json"), "w", encoding="utf-8") as f:
                    json.dump(turn_record, f, indent=2)
                with open(os.path.join(RECORDINGS_DIR, f"{new_turn_id}.json"), "w", encoding="utf-8") as f:
                    json.dump(turn_record, f, indent=2)
            except Exception as fe:
                print(f"   -> JSON file write notice: {fe}")

            print(f"   -> Result: {reply_text[:60]}... ({elapsed}s, {tot_tok} tok)")

        except Exception as err:
            print(f"   -> Error calling Gemini: {err}")

    # Insert parent session record into PostgreSQL eval_sessions
    if gemini_turns:
        with get_db_connection() as conn:
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
                    target_session_id, target_title, rec_num, "gemini-2.5-flash",
                    len(gemini_turns), total_tokens_all, total_latency_all,
                    gemini_turns[0]["user_message"], json.dumps({"source": "gpt_comparison_rerun", "source_session_id": source_session_id})
                ))
                conn.commit()

        print(f"\n[SUCCESS] Completed {len(gemini_turns)} Gemini re-runs.")
        print(f"Saved into PostgreSQL session: {target_session_id}")
        print("Refresh your Evaluation Console (http://localhost:3001) to compare GPT vs Gemini!\n")
        return target_session_id

    return False

if __name__ == "__main__":
    session_arg = sys.argv[1] if len(sys.argv) > 1 else None
    rerun_session_with_gemini(source_session_id=session_arg)
