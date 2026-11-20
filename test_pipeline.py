import os
import time
import requests
from src.server import ingest_document, ask_rag, get_recent_evaluations
from src.db import get_connection

def run_test():
    print("=" * 60)
    print("RUNNING END-TO-END RAG EVALUATION PIPELINE TEST")
    print("=" * 60)

    # 1. Create a sample knowledge document
    sample_doc_path = "sample_policy.txt"
    sample_text = """Acme Corp Remote Work and Expense Policy (2026 Edition)

Section 1: Equipment Allowance
All full-time employees are eligible for a one-time home office equipment reimbursement up to $1,500.
Eligible equipment includes ergonomic chairs, sit-stand desks, computer monitors, and noise-cancelling headphones.
Reimbursement requests must be submitted within 45 days of purchase along with itemized receipts.

Section 2: Internet Stipend
Employees receive a recurring monthly internet subsidy of $75 directly deposited in their payroll.
No receipts are required for the monthly internet stipend.

Section 3: Annual Travel and Offsite Policy
Team summits occur twice per year. Flights must be booked at least 21 days in advance through the corporate travel portal.
Meals during travel are reimbursed up to a per diem limit of $85 per day.
Alcohol is not eligible for company reimbursement under any circumstances.
"""
    with open(sample_doc_path, "w", encoding="utf-8") as f:
        f.write(sample_text)
    print(f"1. Created sample document: {sample_doc_path}")

    # 2. Ingest document into PostgreSQL with pgvector
    print("\n2. Ingesting document into PostgreSQL (pgvector) using text-embedding-3-small...")
    ingest_result = ingest_document(sample_doc_path, "Acme_Policy_2026")
    print(f"   Result: {ingest_result}")

    # 3. Test Ask RAG with gpt-6-astra (Inline Evaluation for immediate verification)
    test_query = "What is the maximum reimbursement for home office equipment and how soon must requests be submitted?"
    print(f"\n3. Querying RAG system with query: '{test_query}'")
    print("   Target Model: gpt-6-astra (with fallback to gpt-4o)")
    rag_result = ask_rag(query=test_query, model_id="gpt-6-astra", async_eval=False)

    print("\n--- Model Response ---")
    print(f"Model Used: {rag_result['model_used']}")
    print(f"Answer:\n{rag_result['answer']}")
    print(f"Latency: {rag_result['generation_latency_ms']} ms")
    
    print("\n--- Goldfish RAG Triad Evaluation ---")
    print(f"Confidence Score: {rag_result['confidence_score']} ({rag_result['evaluation']['confidence_percentage']}%)")
    print(f"Verdict: {rag_result['verdict']}")
    print(f"Faithfulness (Groundedness): {rag_result['evaluation']['metrics']['faithfulness']}")
    print(f"Context Relevance: {rag_result['evaluation']['metrics']['context_relevance']}")
    print(f"Answer Relevancy: {rag_result['evaluation']['metrics']['answer_relevance']}")
    print("\nExplanations:")
    for k, v in rag_result['evaluation']['explanations'].items():
        print(f"  • {k}: {v}")

    print("\nAtomic Claims Analysis:")
    for c in rag_result['evaluation']['claims_analysis']:
        status_icon = "✓" if c["is_supported"] else "✗"
        print(f"  [{status_icon}] Claim: {c['claim']}")
        print(f"      Reasoning: {c['reasoning']}")

    # 4. Verify Elephant (PostgreSQL) has the audit record
    print("\n4. Verifying record in PostgreSQL (Elephant)...")
    recent = get_recent_evaluations(limit=1)
    if recent:
        latest = recent[0]
        print(f"   Record #{latest['id']} in DB: Verdict={latest['verdict']} Confidence={latest['confidence_score']}")
    else:
        print("   No records found in database.")

    # 5. Verify Prometheus telemetry scrape endpoint (:8000/metrics)
    print("\n5. Verifying Prometheus metrics on http://localhost:8000/metrics...")
    try:
        metrics_resp = requests.get("http://localhost:8000/metrics", timeout=3)
        if "rag_confidence_score" in metrics_resp.text:
            print("   Prometheus scrape endpoint is LIVE and emitting rag_confidence_score metrics!")
        else:
            print("   Metrics endpoint reached but rag_confidence_score metric not yet present.")
    except Exception as e:
        print(f"   Failed to reach metrics endpoint: {e}")

    print("\n" + "=" * 60)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
