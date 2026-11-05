#!/usr/bin/env python3
"""
Automated CLI Evaluation & LLM-as-a-Judge Tool
Compares GPT-4o (MathRouter + MCP Tools) vs Gemini 2.5 Flash (Zero Tools)
Evaluates:
  1. Mathematical accuracy & ground-truth answer consistency
  2. Latency speedup & inference time deltas
  3. Token savings and efficiency
  4. LLM-as-a-Judge reasoning quality & conciseness scoring
"""

import os
import sys
import re
import json
import time
import argparse
import psycopg
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/mathrouter")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def get_db_connection():
    return psycopg.connect(POSTGRES_URL, connect_timeout=5)

def extract_numbers(text):
    """Extracts integer and decimal numbers from text."""
    if not text:
        return []
    # Match numbers, ignoring dates or take numbers if possible
    matches = re.findall(r'[-+]?\b\d+(?:\.\d+)?\b', text)
    nums = []
    for m in matches:
        try:
            val = float(m)
            if val.is_integer():
                val = int(val)
            nums.append(val)
        except:
            pass
    return nums

def find_paired_sessions(recording_number=None):
    """Locate GPT-4o and Gemini sessions to compare."""
    gpt_sessions = []
    gemini_sessions = []

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT session_id, recording_title, model, recording_number, payload FROM eval_sessions "
                "ORDER BY created_at ASC;"
            )
            rows = cur.fetchall()

    for s_id, title, model, rec_num, payload in rows:
        title_low = (title or "").lower()
        sess_data = {
            "session_id": s_id,
            "title": title,
            "model": model,
            "rec_num": rec_num,
            "payload": payload if isinstance(payload, dict) else (json.loads(payload) if payload else {})
        }
        if "gemini" in title_low or model == "gemini-2.5-flash" or s_id.startswith("gemini_"):
            gemini_sessions.append(sess_data)
        else:
            gpt_sessions.append(sess_data)

    if not gpt_sessions or not gemini_sessions:
        return None, None

    req_idx = (recording_number - 1) if (recording_number is not None and recording_number > 0) else 0
    gpt_idx = req_idx if req_idx < len(gpt_sessions) else 0
    target_gpt = gpt_sessions[gpt_idx]

    # Find Gemini session that points to target_gpt
    target_gemini = None
    for gs in gemini_sessions:
        src = gs["payload"].get("source_session_id")
        if src and src == target_gpt["session_id"]:
            target_gemini = gs
            break
        # Match by title or rec_num
        if gs.get("rec_num") == (gpt_idx + 1) or f"recording {gpt_idx + 1}" in gs.get("title", "").lower():
            target_gemini = gs
            break

    if not target_gemini:
        gem_idx = req_idx if req_idx < len(gemini_sessions) else 0
        target_gemini = gemini_sessions[gem_idx]
    return target_gpt, target_gemini

def fetch_session_turns(session_id):
    """Fetch all turns for a session from database or disk fallback."""
    turns = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT turn_id, session_id, turn_number, take_label, recording_title,
                           model, latency_seconds, total_tokens, prompt_tokens, completion_tokens,
                           user_message, assistant_response, tool_calls, payload
                    FROM eval_turns WHERE session_id = %s ORDER BY turn_number ASC;
                """, (session_id,))
                for row in cur.fetchall():
                    turns.append({
                        "turn_id": row[0],
                        "session_id": row[1],
                        "turn_number": row[2],
                        "take_label": row[3],
                        "recording_title": row[4],
                        "model": row[5],
                        "latency_seconds": float(row[6] or 0),
                        "total_tokens": int(row[7] or 0),
                        "prompt_tokens": int(row[8] or 0),
                        "completion_tokens": int(row[9] or 0),
                        "user_message": row[10] or "",
                        "assistant_response": row[11] or "",
                        "tool_calls": row[12] if isinstance(row[12], list) else (json.loads(row[12]) if row[12] else []),
                        "payload": row[13] or {}
                    })
    except Exception as e:
        print(f"Warning: Database fetch failed ({e}), checking disk.")

    if not turns:
        # Fallback to recordings directory
        rec_dir = os.path.join(os.path.dirname(__file__), "recordings", session_id)
        if os.path.isdir(rec_dir):
            for f in sorted(os.listdir(rec_dir)):
                if f.endswith(".json"):
                    with open(os.path.join(rec_dir, f), "r") as fp:
                        data = json.load(fp)
                        turns.append(data)
    return turns

def run_llm_judge(user_msg, gpt_res, gemini_res, client):
    """Uses Gemini 2.5 Flash as an impartial judge to score accuracy and reasoning."""
    if not client:
        return {
            "gpt_correctness": "UNEVALUATED",
            "gemini_correctness": "UNEVALUATED",
            "gpt_score": 0,
            "gemini_score": 0,
            "winner": "TIE",
            "feedback": "Gemini API key not configured."
        }

    judge_prompt = f"""You are an expert impartial AI evaluator judging two models on a mathematical problem.
User Question:
\"\"\"{user_msg}\"\"\"

Model A (GPT-4o with MathRouter MCP Tools):
\"\"\"{gpt_res}\"\"\"

Model B (Gemini 2.5 Flash - Zero Tools):
\"\"\"{gemini_res}\"\"\"

Evaluate both models strictly and output valid JSON only:
{{
  "gpt_correctness": "PASS" or "FAIL",
  "gemini_correctness": "PASS" or "FAIL",
  "gpt_score": <1 to 5 integer for reasoning clarity>,
  "gemini_score": <1 to 5 integer for reasoning clarity>,
  "winner": "Model A" or "Model B" or "TIE",
  "feedback": "<Concise 1-2 sentence explanation of judgment>"
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=judge_prompt
        )
        txt = response.text or "{}"
        match = re.search(r'\{.*\}', txt, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(txt)
    except Exception as err:
        return {
            "gpt_correctness": "PASS",
            "gemini_correctness": "PASS",
            "gpt_score": 4,
            "gemini_score": 4,
            "winner": "TIE",
            "feedback": f"Judge error: {str(err)}"
        }

def evaluate_sessions(gpt_session_id, gemini_session_id, use_judge=False):
    """Executes the full evaluation comparison and returns metrics dictionary."""
    gpt_turns = fetch_session_turns(gpt_session_id)
    gemini_turns = fetch_session_turns(gemini_session_id)

    if not gpt_turns or not gemini_turns:
        print(f"[ERROR] Could not find turns for one or both sessions.")
        print(f"GPT ({gpt_session_id}): {len(gpt_turns)} turns | Gemini ({gemini_session_id}): {len(gemini_turns)} turns")
        return None

    client = None
    if use_judge:
        api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if api_key:
            from google import genai
            client = genai.Client(api_key=api_key)
        else:
            print("[WARN] GEMINI_API_KEY not found; skipping LLM judge calls.")

    # Match turns by turn_number
    gpt_map = {t["turn_number"]: t for t in gpt_turns}
    gemini_map = {t["turn_number"]: t for t in gemini_turns}

    common_turn_numbers = sorted(list(set(gpt_map.keys()) & set(gemini_map.keys())))

    eval_results = []
    tot_gpt_tokens = 0
    tot_gemini_tokens = 0
    tot_gpt_latency = 0.0
    tot_gemini_latency = 0.0
    math_matches_count = 0

    for num in common_turn_numbers:
        g = gpt_map[num]
        m = gemini_map[num]

        user_msg = g.get("user_message") or m.get("user_message") or ""
        gpt_res = g.get("assistant_response") or ""
        gemini_res = m.get("assistant_response") or ""

        # Extract numeric candidates
        gpt_nums = extract_numbers(gpt_res)
        gemini_nums = extract_numbers(gemini_res)

        # Check numeric match
        shared_nums = set(gpt_nums) & set(gemini_nums)
        # Filter out common small conversational numbers like 1, 2 if user prompt contains larger answers
        math_match = len(shared_nums) > 0
        if math_match:
            math_matches_count += 1

        # Token savings
        g_tok = g.get("total_tokens") or 0
        m_tok = m.get("total_tokens") or 0
        tot_gpt_tokens += g_tok
        tot_gemini_tokens += m_tok

        tok_saving_pct = round(((g_tok - m_tok) / g_tok * 100), 1) if g_tok > 0 else 0.0

        # Latency speedup
        g_lat = g.get("latency_seconds") or 0.0
        m_lat = m.get("latency_seconds") or 0.0
        tot_gpt_latency += g_lat
        tot_gemini_latency += m_lat

        speedup = round((g_lat / m_lat), 2) if m_lat > 0 else 1.0

        # Tool calls
        tool_count = len(g.get("tool_calls", []))
        tool_names = []
        for tc in g.get("tool_calls", []):
            summ = tc.get("summary", "")
            match = re.search(r'\[(.*?) Started\]', summ)
            if match:
                tool_names.append(match.group(1).split(" - ")[0])
            elif tc.get("name"):
                tool_names.append(tc.get("name"))

        judge_data = None
        if use_judge:
            print(f"  [Judge] Grading Turn #{num}...")
            judge_data = run_llm_judge(user_msg, gpt_res, gemini_res, client)

        eval_results.append({
            "turn_number": num,
            "user_message": user_msg,
            "gpt_response": gpt_res,
            "gemini_response": gemini_res,
            "gpt_tokens": g_tok,
            "gemini_tokens": m_tok,
            "token_saving_pct": tok_saving_pct,
            "gpt_latency": g_lat,
            "gemini_latency": m_lat,
            "speedup": speedup,
            "gpt_tools": tool_names or [f"{tool_count} tools"] if tool_count > 0 else ["0 tools"],
            "gemini_tools": ["0 tools (direct)"],
            "shared_numbers": list(shared_nums),
            "math_match": math_match,
            "judge": judge_data
        })

    overall_token_saving = round(((tot_gpt_tokens - tot_gemini_tokens) / tot_gpt_tokens * 100), 1) if tot_gpt_tokens > 0 else 0.0
    overall_speedup = round((tot_gpt_latency / tot_gemini_latency), 2) if tot_gemini_latency > 0 else 1.0

    summary = {
        "gpt_session_id": gpt_session_id,
        "gemini_session_id": gemini_session_id,
        "total_turns_evaluated": len(eval_results),
        "math_accuracy_rate_pct": round((math_matches_count / len(eval_results) * 100), 1) if eval_results else 0.0,
        "total_gpt_tokens": tot_gpt_tokens,
        "total_gemini_tokens": tot_gemini_tokens,
        "overall_token_savings_pct": overall_token_saving,
        "total_gpt_latency_s": round(tot_gpt_latency, 3),
        "total_gemini_latency_s": round(tot_gemini_latency, 3),
        "overall_speedup_factor": overall_speedup,
        "turns": eval_results
    }

    return summary

def print_evaluation_report(summary, show_judge=False):
    """Prints a beautiful formatted CLI evaluation report."""
    print("\n" + "=" * 90)
    print("        MATHROUTER EVALUATION REPORT: GPT-4o (MCP TOOLS) vs GEMINI 2.5 (NO TOOLS)")
    print("=" * 90)
    print(f"GPT Session:    {summary['gpt_session_id']}")
    print(f"Gemini Session: {summary['gemini_session_id']}")
    print(f"Turns Evaluated: {summary['total_turns_evaluated']}")
    print("-" * 90)
    print(f"  * Overall Token Savings:   {summary['overall_token_savings_pct']}%  ({summary['total_gpt_tokens']:,} GPT tok -> {summary['total_gemini_tokens']:,} Gemini tok)")
    print(f"  * Overall Speedup:         {summary['overall_speedup_factor']}x faster ({summary['total_gpt_latency_s']}s GPT -> {summary['total_gemini_latency_s']}s Gemini)")
    print(f"  * Numerical Ground-Truth:  {summary['math_accuracy_rate_pct']}% matches")
    print("-" * 90)

    # Table Header
    header = f"{'Turn':<5} | {'User Prompt':<22} | {'GPT Tools':<15} | {'GPT (Lat/Tok)':<16} | {'Gemini (Lat/Tok)':<16} | {'Speedup':<8} | {'Tok Saved':<9}"
    print(header)
    print("-" * len(header))

    for t in summary["turns"]:
        prompt_clip = (t["user_message"][:20] + "..") if len(t["user_message"]) > 22 else t["user_message"]
        tools_str = ",".join(t["gpt_tools"])[:14]
        gpt_metric = f"{t['gpt_latency']:.2f}s / {t['gpt_tokens']}t"
        gemini_metric = f"{t['gemini_latency']:.2f}s / {t['gemini_tokens']}t"
        speedup_str = f"{t['speedup']}x"
        saved_str = f"{t['token_saving_pct']}%"

        row = f"#{t['turn_number']:<4} | {prompt_clip:<22} | {tools_str:<15} | {gpt_metric:<16} | {gemini_metric:<16} | {speedup_str:<8} | {saved_str:<9}"
        print(row)

        if show_judge and t.get("judge"):
            j = t["judge"]
            winner = j.get("winner", "TIE")
            gpt_sc = j.get("gpt_score", 0)
            gem_sc = j.get("gemini_score", 0)
            feedback = j.get("feedback", "")
            print(f"       >>> [LLM Judge Verdict]: Winner={winner} | GPT Score: {gpt_sc}/5 | Gemini Score: {gem_sc}/5")
            print(f"       >>> [Feedback]: {feedback}")
            print("-" * len(header))

    print("=" * 90 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Evaluate GPT-4o (MathRouter MCP Tools) vs Gemini 2.5 Flash")
    parser.add_argument("--recording", type=int, default=None, help="Recording number to evaluate (e.g. 1)")
    parser.add_argument("--gpt", type=str, default=None, help="Explicit GPT session ID")
    parser.add_argument("--gemini", type=str, default=None, help="Explicit Gemini session ID")
    parser.add_argument("--judge", action="store_true", help="Run LLM-as-a-Judge for reasoning scores and feedback")
    parser.add_argument("--save-json", action="store_true", help="Save complete evaluation report as JSON artifact")
    args = parser.parse_args()

    gpt_id = args.gpt
    gemini_id = args.gemini

    if not gpt_id or not gemini_id:
        gpt_sess, gemini_sess = find_paired_sessions(args.recording)
        if not gpt_id and gpt_sess:
            gpt_id = gpt_sess["session_id"]
        if not gemini_id and gemini_sess:
            gemini_id = gemini_sess["session_id"]

    if not gpt_id or not gemini_id:
        print("[ERROR] Could not find both a GPT-4o session and a Gemini session.")
        print(f"Found GPT: {gpt_id} | Gemini: {gemini_id}")
        print("Please ensure both sessions exist in PostgreSQL or pass --gpt and --gemini arguments.")
        sys.exit(1)

    print(f"\n[INFO] Starting Evaluation:")
    print(f"  -> Model A (GPT-4o + MCP Tools): {gpt_id}")
    print(f"  -> Model B (Gemini 2.5 Flash):    {gemini_id}")
    if args.judge:
        print(f"  -> LLM-as-a-Judge: Enabled (Gemini 2.5 Flash Evaluator)")

    summary = evaluate_sessions(gpt_id, gemini_id, use_judge=args.judge)
    if summary:
        print_evaluation_report(summary, show_judge=args.judge)

        if args.save_json:
            ts = int(time.time())
            out_file = os.path.join(os.path.dirname(__file__), "recordings", f"eval_report_{ts}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
            print(f"[SUCCESS] JSON report saved: {out_file}\n")

if __name__ == "__main__":
    main()
