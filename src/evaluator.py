import os
import json
import time
from typing import List, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ClaimAnalysis(BaseModel):
    claim: str = Field(description="An atomic factual claim extracted from the response")
    is_supported: bool = Field(description="True if strictly supported by retrieved context, False if hallucinated/unsupported")
    evidence_chunk_index: Optional[int] = Field(None, description="Index of the context chunk supporting this claim, or null if unsupported")
    reasoning: str = Field(description="Brief explanation of why this claim is supported or unsupported")

class TriadEvaluationOutput(BaseModel):
    claims: List[ClaimAnalysis] = Field(description="List of atomic claims extracted and their groundedness check")
    context_relevance_score: float = Field(description="0.0 to 1.0: How relevant and noise-free was the retrieved context for answering the query?")
    context_relevance_explanation: str = Field(description="Explanation of retrieval quality and any irrelevant context detected")
    answer_relevance_score: float = Field(description="0.0 to 1.0: How directly and completely did the response answer the user query?")
    answer_relevance_explanation: str = Field(description="Explanation of answer completeness and directness")
    overall_summary: str = Field(description="Executive summary of the evaluation findings")

EVALUATOR_SYSTEM_PROMPT = """You are an expert, pedantic Goldfish RAG Auditor.
Your job is to strictly evaluate a generated AI answer against the provided context chunks and original user query.

Rules for Evaluation:
1. THE GOLDFISH PRINCIPLE: Evaluate with ZERO external knowledge. If a claim is true in the real world but NOT in the provided context, it is UNSUPPORTED.
2. Claim Decomposition: Break the response into discrete atomic factual statements.
3. Groundedness Verification: Verify each claim against the context chunks. Mark is_supported = false for any hallucination, assumption, or extrapolation.
4. Context Relevance: Assess how much of the retrieved context was genuinely needed versus extraneous background noise (0.0 to 1.0).
5. Answer Relevancy: Assess whether the response answered the user's question directly, concisely, and completely without dodging (0.0 to 1.0).
"""

def evaluate_rag_triad(
    query: str,
    context_chunks: list[str],
    response: str,
    judge_model: str = "gpt-6-astra"
) -> dict:
    """
    Evaluates the RAG Triad (Faithfulness, Context Relevance, Answer Relevancy)
    and computes a composite Confidence Score with detailed explanations.
    """
    context_text = "\n\n".join([f"--- Context Chunk {idx+1} ---\n{c}" for idx, c in enumerate(context_chunks)])
    user_payload = (
        f"User Query:\n{query}\n\n"
        f"Retrieved Context Chunks:\n{context_text}\n\n"
        f"Generated Response to Audit:\n{response}"
    )

    start_time = time.perf_counter()
    
    # Try calling structured output with the designated judge model (with fallback)
    try:
        completion = client.beta.chat.completions.parse(
            model=judge_model if not judge_model.startswith("gpt-6") else "gpt-4o",
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_payload}
            ],
            response_format=TriadEvaluationOutput
        )
        parsed: TriadEvaluationOutput = completion.choices[0].message.parsed
    except Exception as e:
        # Fallback to standard gpt-4o structured completion
        completion = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_payload}
            ],
            response_format=TriadEvaluationOutput
        )
        parsed: TriadEvaluationOutput = completion.choices[0].message.parsed

    eval_latency_ms = int((time.perf_counter() - start_time) * 1000)

    # 1. Faithfulness Score calculation
    total_claims = len(parsed.claims)
    supported_claims_count = sum(1 for c in parsed.claims if c.is_supported)
    unsupported_claims = [c.claim for c in parsed.claims if not c.is_supported]
    
    if total_claims > 0:
        faithfulness_score = round(supported_claims_count / total_claims, 3)
    else:
        faithfulness_score = 1.0  # If no factual claims made, zero hallucination

    # 2. Context Relevance & Answer Relevance
    context_relevance_score = round(parsed.context_relevance_score, 3)
    answer_relevance_score = round(parsed.answer_relevance_score, 3)

    # 3. Composite Confidence Score Calculation
    # Weights: Faithfulness = 0.50, Answer Relevancy = 0.30, Context Relevance = 0.20
    confidence_score = round(
        (0.50 * faithfulness_score) +
        (0.30 * answer_relevance_score) +
        (0.20 * context_relevance_score),
        3
    )

    # 4. Risk Verdict Assignment
    if faithfulness_score < 0.85:
        verdict = "HALLUCINATION_DETECTED"
    elif confidence_score >= 0.85 and faithfulness_score == 1.0:
        verdict = "HIGH_CONFIDENCE"
    elif confidence_score >= 0.70:
        verdict = "MEDIUM_CONFIDENCE"
    else:
        verdict = "LOW_QUALITY"

    explanations = {
        "faithfulness": f"{supported_claims_count} of {total_claims} claims supported by context chunks.",
        "context_relevance": parsed.context_relevance_explanation,
        "answer_relevance": parsed.answer_relevance_explanation,
        "summary": parsed.overall_summary
    }

    return {
        "confidence_score": confidence_score,
        "confidence_percentage": round(confidence_score * 100, 1),
        "verdict": verdict,
        "metrics": {
            "faithfulness": faithfulness_score,
            "context_relevance": context_relevance_score,
            "answer_relevance": answer_relevance_score
        },
        "claims_analysis": [c.model_dump() for c in parsed.claims],
        "unsupported_claims": unsupported_claims,
        "explanations": explanations,
        "eval_latency_ms": eval_latency_ms
    }
