#!/usr/bin/env python3
"""
Re-run Recorded Sessions with Model B (e.g., GPT-6-sol / GPT-5.5 / GPT-4o-mini)
Executes the recorded document turns through Model B with identical document context
and prompt modes, saving results into PostgreSQL and recordings/ for in-place comparison.
"""

import os
import sys
import time
import json
import psycopg
from dotenv import load_dotenv
from openai import OpenAI

# Load env variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/mathrouter")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_db_connection():
    return psycopg.connect(POSTGRES_URL, connect_timeout=5)

def rerun_session_with_gpt5(source_session_id=None, recording_title=None, recording_number=None, openai_api_key=None, target_model="gpt-6-sol"):
    api_key = openai_api_key or OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\n[ERROR] OPENAI_API_KEY is not set.")
        return False

    client = OpenAI(api_key=api_key)

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

    clean_base = recording_title.split("(")[0].strip() if "(" in str(recording_title) else recording_title
    target_title = f"{clean_base}(  {target_model})"

    print(f"\n==========================================================================")
    print(f"Re-running turns with Model B ({target_model}) for title: '{target_title}' (rec #{rec_num})")
    print(f"Source Session ID: {source_session_id or 'Auto-detecting latest GPT-4o session'}")
    print(f"==========================================================================\n")

    rows = []
    if source_session_id:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT turn_id, session_id, turn_number, user_message,
                               assistant_response, latency_seconds, total_tokens,
                               tool_calls, payload
                        FROM eval_turns
                        WHERE session_id = %s
                        ORDER BY turn_number ASC, created_at ASC;
                    """, (source_session_id,))
                    rows = cur.fetchall()
        except Exception as e:
            print(f"[WARN] Error reading turns for session {source_session_id}: {e}")

    # Fallback to local recordings
    if not rows:
        RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recordings")
        candidates = []
        if source_session_id and os.path.exists(os.path.join(RECORDINGS_DIR, source_session_id)):
            sdir = os.path.join(RECORDINGS_DIR, source_session_id)
            for f in sorted(os.listdir(sdir)):
                if f.endswith(".json"):
                    candidates.append(os.path.join(sdir, f))
        elif os.path.exists(RECORDINGS_DIR):
            for root, _, files in os.walk(RECORDINGS_DIR):
                for f in sorted(files):
                    if f.endswith(".json") and not f.startswith("gpt5_") and not f.startswith("gemini_") and not f.startswith("modelb_"):
                        candidates.append(os.path.join(root, f))

        for idx, cf in enumerate(candidates, start=1):
            try:
                with open(cf, "r", encoding="utf-8") as f:
                    jdata = json.load(f)
                    u_msg = jdata.get("user_message") or jdata.get("user") or jdata.get("prompt")
                    a_res = jdata.get("assistant_response") or jdata.get("assistant") or jdata.get("response")
                    lat = jdata.get("latency_seconds") or jdata.get("inference_time") or 0.0
                    tok = jdata.get("total_tokens") or 0
                    payload = jdata.get("payload") or {}
                    if u_msg:
                        rows.append((f"json_turn_{idx}", "json_source", idx, u_msg, a_res, lat, tok, [], payload))
            except Exception:
                pass

    if not rows:
        print("[ERROR] No turns found in database or recordings directory.")
        return False

    target_session_id = f"modelb_{int(time.time())}"
    print(f"\nFound {len(rows)} recorded turns. Re-running with {target_model} -> Session: {target_session_id}")

    if source_session_id:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT session_id FROM eval_sessions WHERE payload->>'source_session_id' = %s;", (source_session_id,))
                    old_ids = [r[0] for r in cur.fetchall()]
                    if old_ids:
                        cur.execute("DELETE FROM eval_turns WHERE session_id = ANY(%s);", (old_ids,))
                        cur.execute("DELETE FROM eval_sessions WHERE session_id = ANY(%s);", (old_ids,))
                        conn.commit()
                        print(f"[CLEANUP] Replaced {len(old_ids)} prior simulation run(s) for {source_session_id}")
        except Exception as ce:
            print(f"[WARN] Cleanup prior run notice: {ce}")

    import prompts
    modelb_turns = []
    total_tokens_all = 0
    total_latency_all = 0.0

    # Discover session-level document context if available
    session_doc_text = ""
    session_doc_name = ""
    session_prompt_key = "executive_summary"
    for r in rows:
        p = r[8] if len(r) > 8 else {}
        if isinstance(p, str):
            try: p = json.loads(p)
            except Exception: p = {}
        if p.get("document_text"):
            session_doc_text = p.get("document_text")
            session_doc_name = p.get("document_name", "")
            session_prompt_key = p.get("prompt_key", "executive_summary")
            break

    for idx, row in enumerate(rows, start=1):
        gpt_turn_id = row[0]
        orig_session = row[1]
        turn_num = row[2]
        user_msg = row[3] or ""
        gpt_res = row[4] or ""
        gpt_lat = row[5] or 0.0
        gpt_tok = row[6] or 0
        gpt_tool_calls = row[7] if len(row) > 7 else []
        gpt_payload = row[8] if len(row) > 8 else {}
        if isinstance(gpt_payload, str):
            try:
                gpt_payload = json.loads(gpt_payload)
            except Exception:
                gpt_payload = {}

        doc_text = gpt_payload.get("document_text") or session_doc_text
        doc_name = gpt_payload.get("document_name") or session_doc_name
        prompt_key = gpt_payload.get("prompt_key") or session_prompt_key or "executive_summary"
        custom_inst = gpt_payload.get("custom_instruction", "")

        messages = prompts.build_turn_messages(
            document_text=doc_text,
            user_question=user_msg,
            prompt_key=prompt_key,
            custom_instruction=custom_inst
        )

        print(f"[{idx}/{len(rows)}] Re-running turn: '{user_msg[:45]}...' with {target_model}")
        start_t = time.perf_counter()

        reply_text = ""
        prompt_tok = 0
        comp_tok = 0
        tot_tok = 0

        # Try specified target model; if model doesn't exist on API, fallback cleanly
        for attempt_model in [target_model, "gpt-4o-mini", "gpt-4o"]:
            try:
                response = client.chat.completions.create(
                    model=attempt_model,
                    messages=messages,
                    temperature=0.2
                )
                reply_text = response.choices[0].message.content or "No response generated."
                if response.usage:
                    prompt_tok = response.usage.prompt_tokens
                    comp_tok = response.usage.completion_tokens
                    tot_tok = response.usage.total_tokens
                break
            except Exception as api_err:
                print(f"[WARN] Model '{attempt_model}' call failed: {api_err}. Trying fallback...")
                if attempt_model == "gpt-4o":
                    reply_text = f"[Simulation/Error] Could not invoke {target_model}: {api_err}"

        elapsed = round(time.perf_counter() - start_t, 3)
        total_tokens_all += tot_tok
        total_latency_all += elapsed

        new_turn_id = f"{target_session_id}_take_{idx}"
        iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

        turn_record = {
            "model": target_model,
            "usage": {
                "total_tokens": tot_tok,
                "prompt_tokens": prompt_tok,
                "completion_tokens": comp_tok
            },
            "turn_id": new_turn_id,
            "timestamp": iso_timestamp,
            "session_id": target_session_id,
            "take_label": f"TAKE #{idx}",
            "tool_calls": [],
            "take_number": idx,
            "turn_number": idx,
            "input_tokens": prompt_tok,
            "total_tokens": tot_tok,
            "user_message": user_msg,
            "output_tokens": comp_tok,
            "recording_title": target_title,
            "recording_number": rec_num,
            "latency_seconds": elapsed,
            "inference_time": elapsed,
            "assistant_response": reply_text,
            "payload": {
                "turn_id": new_turn_id,
                "model": target_model,
                "user_message": user_msg,
                "assistant_response": reply_text,
                "latency_seconds": elapsed,
                "prompt_tokens": prompt_tok,
                "completion_tokens": comp_tok,
                "total_tokens": tot_tok,
                "document_name": doc_name,
                "document_text": doc_text,
                "prompt_key": prompt_key,
                "custom_instruction": custom_inst,
                "source_turn_id": gpt_turn_id,
                "source_session_id": source_session_id
            }
        }
        modelb_turns.append(turn_record)

        # Write to PostgreSQL eval_turns
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    from psycopg.types.json import Jsonb
                    cur.execute("""
                        INSERT INTO eval_turns (
                            turn_id, session_id, turn_number, take_label, recording_title,
                            model, timestamp, user_message, assistant_response,
                            tool_calls, latency_seconds, prompt_tokens, completion_tokens,
                            total_tokens, payload
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (turn_id) DO UPDATE SET
                            assistant_response = EXCLUDED.assistant_response,
                            latency_seconds = EXCLUDED.latency_seconds,
                            total_tokens = EXCLUDED.total_tokens,
                            payload = EXCLUDED.payload;
                    """, (
                        new_turn_id, target_session_id, idx, f"TAKE #{idx}", target_title,
                        target_model, iso_timestamp, user_msg, reply_text,
                        Jsonb([]), elapsed, prompt_tok, comp_tok, tot_tok,
                        Jsonb(turn_record["payload"])
                    ))
                    conn.commit()
        except Exception as pge:
            print(f"[WARN] Error saving turn to PostgreSQL: {pge}")

    # Write session aggregate to PostgreSQL eval_sessions
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                from psycopg.types.json import Jsonb
                cur.execute("""
                    INSERT INTO eval_sessions (
                        session_id, recording_title, recording_number, model,
                        start_time, end_time, total_turns, total_tokens,
                        total_latency_seconds, first_message, payload
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id) DO UPDATE SET
                        recording_title = EXCLUDED.recording_title,
                        total_turns = EXCLUDED.total_turns,
                        total_tokens = EXCLUDED.total_tokens,
                        total_latency_seconds = EXCLUDED.total_latency_seconds,
                        payload = EXCLUDED.payload;
                """, (
                    target_session_id, target_title, rec_num, target_model,
                    modelb_turns[0]["timestamp"] if modelb_turns else None,
                    modelb_turns[-1]["timestamp"] if modelb_turns else None,
                    len(modelb_turns), total_tokens_all, total_latency_all,
                    rows[0][3][:200] if rows else "",
                    Jsonb({
                        "session_id": target_session_id,
                        "recording_title": target_title,
                        "recording_number": rec_num,
                        "model": target_model,
                        "source_session_id": source_session_id,
                        "total_turns": len(modelb_turns),
                        "total_tokens": total_tokens_all,
                        "total_latency_seconds": total_latency_all,
                        "takes": modelb_turns
                    })
                ))
                conn.commit()
                print(f"[OK] Saved {target_session_id} to PostgreSQL with {len(modelb_turns)} turns.")
    except Exception as se:
        print(f"[WARN] Error saving session to PostgreSQL: {se}")

    return target_session_id
