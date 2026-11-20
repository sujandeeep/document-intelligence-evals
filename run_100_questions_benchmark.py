#!/usr/bin/env python3
"""
Comprehensive 100-Question RAG Benchmark Runner & Comparison Suite
===================================================================
Compares:
  - System A: "Evaluation Console" (Local pgvector Hybrid Search + LLM Generation)
  - System B: "Cloud RAG - RAGFlow" (Cloud Managed Vector Store + LLM Generation)

Target Documents:
  1. epdf.pub_rich-dad-poor-dad.pdf (50 questions)
  2. the-metamorphosis-franz-kafka.pdf (50 questions)

LLM as a Judge:
  - GPT-6.2 Sol (Evaluates Groundedness, Completeness, Score 1-10, and Declares Winner)

Report Output:
  - Generates high-fidelity PDF with Executive Scorecard, Book Breakdown, and per-question comparison.
"""

import os
import sys
import time
import json
import argparse
from dotenv import load_dotenv
from openai import OpenAI

from questions_100 import BENCHMARK_100_QUESTIONS
from generate_pdf_report import build_pdf_report
from src.server import ask_rag

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY is not set in environment or .env file.")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

RESULTS_FILE = "benchmark_100_results.json"
PDF_FILE = "rag_benchmark_comparison_100.pdf"

def get_cloud_vector_store():
    """Retrieves or validates the Cloud_RAG_KnowledgeBase vector store."""
    stores = client.vector_stores.list()
    for s in stores.data:
        if s.name == "Cloud_RAG_KnowledgeBase":
            return s
    raise RuntimeError("Cloud_RAG_KnowledgeBase not found in OpenAI vector stores.")

def query_cloud_rag(query: str, vector_store_id: str, model_id: str = "gpt-4o") -> dict:
    """
    Executes Cloud RAG pipeline:
    1. Cloud vector search over Cloud_RAG_KnowledgeBase.
    2. Grounded generation using model_id.
    """
    t0 = time.perf_counter()
    search_res = client.vector_stores.search(
        vector_store_id=vector_store_id,
        query=query
    )
    retrieval_ms = int((time.perf_counter() - t0) * 1000)

    cloud_chunks = []
    for c in search_res.data[:5]:
        for item in c.content:
            if getattr(item, "type", "") == "text":
                cloud_chunks.append(item.text)

    context_block = "\n\n".join([f"--- Context Chunk {i+1} ---\n{chk}" for i, chk in enumerate(cloud_chunks)])

    system_prompt = (
        "You are an accurate, strictly grounded Cloud RAG assistant. "
        "Answer the user question thoroughly and strictly based on the context excerpts below. "
        "Do not invent or extrapolate outside facts. If a specific detail is not found, state that clearly."
    )
    user_content = f"Context:\n{context_block}\n\nQuestion: {query}\n\nAnswer:"

    t1 = time.perf_counter()
    gen_res = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        max_tokens=600,
        temperature=0.2
    )
    gen_ms = int((time.perf_counter() - t1) * 1000)
    answer = gen_res.choices[0].message.content.strip()

    return {
        "answer": answer,
        "chunks": cloud_chunks,
        "retrieval_latency_ms": retrieval_ms,
        "generation_latency_ms": gen_ms,
        "total_latency_ms": retrieval_ms + gen_ms
    }

def judge_with_gpt62_sol(query: str, book: str, ans_a: str, ans_b: str, max_retries: int = 3) -> dict:
    """
    Invokes GPT-6.2 Sol to rigorously evaluate and compare System A vs System B.
    """
    judge_prompt = f"""You are an elite, impartial benchmark judge evaluating two AI RAG systems on the book '{book}'.

Systems Under Test:
- System A: 'Evaluation Console' (Local pgvector Hybrid RAG)
- System B: 'Cloud RAG - RAGFlow' (Cloud Vector Store RAG)

User Query:
{query}

==================== [System A: Evaluation Console Answer] ====================
{ans_a}

==================== [System B: Cloud RAG - RAGFlow Answer] ====================
{ans_b}

Evaluation Instructions:
1. Factuality & Groundedness: Does the answer contain any hallucinations, inaccuracies, or anachronisms regarding the book?
2. Completeness & Sub-details: Did the system answer all parts of the question, including names, numbers, mechanics, or specific scenes?
3. Structure & Readability: Is the answer organized with clear, digestible phrasing?

Decide a WINNER:
- Must be strictly one of: "Evaluation Console", "Cloud RAG - RAGFlow", or "Tie".
- Rate System A score from 1 to 10 (integer).
- Rate System B score from 1 to 10 (integer).
- Provide a concise, clear paragraph explaining your reasoning and why the winner was chosen.

Respond with valid JSON in this exact schema:
{{
  "winner": "Evaluation Console" | "Cloud RAG - RAGFlow" | "Tie",
  "system_a_score": 1-10,
  "system_b_score": 1-10,
  "reasoning": "..."
}}
"""

    for attempt in range(max_retries):
        try:
            res = client.chat.completions.create(
                model="gpt-6.2-sol",
                messages=[{"role": "user", "content": judge_prompt}],
                response_format={"type": "json_object"},
                max_completion_tokens=800
            )
            content = res.choices[0].message.content
            parsed = json.loads(content)
            
            # Normalize winner string
            winner = parsed.get("winner", "Tie").strip()
            if "Evaluation Console" in winner:
                winner = "Evaluation Console"
            elif "Cloud RAG" in winner or "RAGFlow" in winner:
                winner = "Cloud RAG - RAGFlow"
            else:
                winner = "Tie"

            return {
                "winner": winner,
                "system_a_score": int(parsed.get("system_a_score", 5)),
                "system_b_score": int(parsed.get("system_b_score", 5)),
                "reasoning": parsed.get("reasoning", "No explanation provided.")
            }
        except Exception as e:
            print(f"    [Judge Retry {attempt+1}/{max_retries}] GPT-6.2 Sol call failed: {e}")
            time.sleep(2)

    return {
        "winner": "Tie",
        "system_a_score": 5,
        "system_b_score": 5,
        "reasoning": "Judge call failed after multiple retries."
    }

def load_checkpoint() -> list:
    if os.path.exists(RESULTS_FILE):
        try:
            with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_checkpoint(results: list):
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

def main():
    parser = argparse.ArgumentParser(description="Run 100-Question RAG Benchmark and Generate PDF Report")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of questions to evaluate")
    parser.add_argument("--book", choices=["all", "rich_dad", "metamorphosis"], default="all", help="Filter by book")
    parser.add_argument("--generate-pdf-only", action="store_true", help="Skip query execution and build PDF from existing results")
    parser.add_argument("--output-pdf", default=PDF_FILE, help="Output PDF file path")
    parser.add_argument("--reset", action="store_true", help="Clear existing results and start fresh")
    args = parser.parse_args()

    if args.reset and os.path.exists(RESULTS_FILE):
        os.remove(RESULTS_FILE)
        print(f"Cleared existing results file: {RESULTS_FILE}")

    existing_results = load_checkpoint()

    if args.generate_pdf_only:
        if not existing_results:
            print(f"ERROR: Cannot generate PDF. No results found in {RESULTS_FILE}.")
            sys.exit(1)
        print(f"Generating PDF from {len(existing_results)} recorded evaluations...")
        build_pdf_report(existing_results, args.output_pdf)
        print(f"Report saved to: {args.output_pdf}")
        return

    # Filter questions
    questions = BENCHMARK_100_QUESTIONS
    if args.book == "rich_dad":
        questions = [q for q in questions if "Rich Dad" in q["book"]]
    elif args.book == "metamorphosis":
        questions = [q for q in questions if "Metamorphosis" in q["book"]]

    if args.limit:
        questions = questions[:args.limit]

    print("=" * 70)
    print("STARTING 100-QUESTION BENCHMARK EVALUATION")
    print("=" * 70)
    print(f"Total Target Questions: {len(questions)}")
    print(f"Existing Checkpoint Records: {len(existing_results)}")
    print(f"Judge Model: GPT-6.2 Sol")
    print(f"Results File: {RESULTS_FILE}")
    print(f"Output PDF: {args.output_pdf}")
    print("=" * 70)

    # Prepare Cloud Vector Store
    kb = get_cloud_vector_store()
    print(f"Connected to Cloud Vector Store: {kb.name} ({kb.id})")

    # Map existing results by id
    results_map = {r["id"]: r for r in existing_results}

    for idx, q_item in enumerate(questions, 1):
        q_id = q_item["id"]
        book = q_item["book"]
        doc = q_item["doc"]
        query = q_item["query"]
        category = q_item["category"]

        if q_id in results_map:
            print(f"[{idx}/{len(questions)}] Q#{q_id} ({book}) - Already evaluated. Skipping.")
            continue

        print(f"\n[{idx}/{len(questions)}] Q#{q_id} [{book}] | Category: {category}")
        print(f"  Query: {query}")

        # 1. System A: Evaluation Console
        t_a0 = time.perf_counter()
        try:
            res_a = ask_rag(query=query, model_id="gpt-4o", async_eval=False, document_name=doc)
            ans_a = res_a.get("answer", "")
            lat_a = int((time.perf_counter() - t_a0) * 1000)
            print(f"  [System A - Eval Console] Answered in {lat_a}ms")
        except Exception as e:
            print(f"  [System A Error] {e}")
            ans_a = f"Error during System A generation: {e}"
            lat_a = 0

        # 2. System B: Cloud RAG - RAGFlow
        try:
            res_b = query_cloud_rag(query=query, vector_store_id=kb.id, model_id="gpt-4o")
            ans_b = res_b.get("answer", "")
            lat_b = res_b.get("total_latency_ms", 0)
            print(f"  [System B - Cloud RAG] Answered in {lat_b}ms")
        except Exception as e:
            print(f"  [System B Error] {e}")
            ans_b = f"Error during System B generation: {e}"
            lat_b = 0

        # 3. Judge: GPT-6.2 Sol
        print(f"  [Judge - GPT-6.2 Sol] Evaluating answers...")
        t_j0 = time.perf_counter()
        judge_verdict = judge_with_gpt62_sol(query=query, book=book, ans_a=ans_a, ans_b=ans_b)
        lat_judge = int((time.perf_counter() - t_j0) * 1000)

        winner = judge_verdict["winner"]
        score_a = judge_verdict["system_a_score"]
        score_b = judge_verdict["system_b_score"]
        reasoning = judge_verdict["reasoning"]

        print(f"  >>> VERDICT: {winner} (Scores: System A={score_a}, System B={score_b}) in {lat_judge}ms")
        print(f"      Critique: {reasoning[:120]}...")

        # Record result
        record = {
            "id": q_id,
            "book": book,
            "category": category,
            "doc": doc,
            "query": query,
            "system_a_answer": ans_a,
            "system_b_answer": ans_b,
            "system_a_latency_ms": lat_a,
            "system_b_latency_ms": lat_b,
            "system_a_score": score_a,
            "system_b_score": score_b,
            "winner": winner,
            "reasoning": reasoning
        }

        results_map[q_id] = record
        # Save checkpoint after each question
        all_sorted_results = [results_map[k] for k in sorted(results_map.keys())]
        save_checkpoint(all_sorted_results)

        # Brief pause to respect API rate limits
        time.sleep(1)

    all_sorted_results = [results_map[k] for k in sorted(results_map.keys())]
    print("\n" + "=" * 70)
    print("BENCHMARK EXECUTION COMPLETE")
    print(f"Total Evaluations in Checkpoint: {len(all_sorted_results)}")
    print("Generating comprehensive PDF report...")
    pdf_path = build_pdf_report(all_sorted_results, args.output_pdf)
    print(f"PDF Report generated successfully at: {pdf_path}")
    print("=" * 70)

if __name__ == "__main__":
    main()
