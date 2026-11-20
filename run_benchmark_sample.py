import time
from src.server import ask_rag

QUERIES_TO_RUN = [
    {
        "query": "What are the minimum password requirements and when are corporate accounts locked out?",
        "model": "gpt-6-astra",
        "doc": "it_security_compliance.txt"
    },
    {
        "query": "What are the strict RPO and RTO limits for Tier-1 mission-critical systems and what is the maximum replication lag?",
        "model": "gpt-6.1-sol",
        "doc": "cloud_disaster_recovery.txt"
    },
    {
        "query": "What is the monthly uptime commitment and what financial service credit applies if uptime drops below 99.0%?",
        "model": "gpt-5.5",
        "doc": "enterprise_sla_agreement.txt"
    },
    {
        "query": "What are the request limits for the Standard Developer Tier and what algorithm is used to enforce limits?",
        "model": "gpt-4o",
        "doc": "api_rate_limits_spec.pdf"
    },
    {
        "query": "Within how many business days must company-issued laptops be returned after contractor termination?",
        "model": "gpt-4o-mini",
        "doc": "contractor_onboarding_terms.pdf"
    }
]

def main():
    print("=" * 60)
    print("RUNNING BENCHMARK EVALUATIONS ACROSS MODELS")
    print("=" * 60)
    
    for idx, item in enumerate(QUERIES_TO_RUN, 1):
        print(f"\n[{idx}/5] Query: {item['query']}")
        print(f"      Model: {item['model']}  |  Target: {item['doc']}")
        
        # Run with async_eval=False so we can inspect the immediate scores
        res = ask_rag(query=item["query"], model_id=item["model"], async_eval=False)
        
        print(f"      Answer: {res['answer'][:120]}...")
        print(f"      Confidence: {res['confidence_score']} ({res['evaluation']['confidence_percentage']}%)")
        print(f"      Verdict: {res['verdict']}")
        print(f"      Faithfulness: {res['evaluation']['metrics']['faithfulness']}")
        print(f"      Atomic Claims: {len(res['evaluation']['claims_analysis'])} extracted")
        for c in res['evaluation']['claims_analysis']:
            icon = "✓" if c["is_supported"] else "✗"
            print(f"        [{icon}] {c['claim']}")
            
        time.sleep(1)

    print("\n" + "=" * 60)
    print("ALL 5 BENCHMARK EVALUATIONS POPULATED INTO POSTGRESQL & PROMETHEUS!")
    print("Open http://localhost:3000 to see them live in Grafana.")
    print("=" * 60)

if __name__ == "__main__":
    main()
