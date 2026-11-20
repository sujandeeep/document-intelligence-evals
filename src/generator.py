import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

AVAILABLE_MODELS = [
    "gpt-6-astra",
    "gpt-6.1-sol",
    "gpt-5.5",
    "gpt-4o",
    "gpt-4o-mini"
]

RAG_SYSTEM_PROMPT = """You are an accurate, strictly grounded AI assistant.
Your task is to answer the user's question thoroughly using the retrieved context chunks provided below.

Rules:
1. Strict Grounding: Ground every statement strictly in the provided context chunks. Only state facts, characters, rules, thresholds, and metrics that are directly supported by the context. Do not invent facts, extrapolate unsupported claims, or rely on outside world knowledge.
2. Completeness & Sub-questions: Thoroughly address all aspects, categories, criteria, and sub-questions requested by the user to the fullest extent supported by the retrieved context.
3. Partial Information Handling: If the context contains information for most aspects of the question but lacks a specific sub-detail (e.g. a specific minor character or unstated threshold), answer all supported aspects fully and clearly state which specific sub-details were not found in the retrieved excerpts. Do not refuse to answer when relevant facts exist in the context.
4. Structured Output & Presentation:
   - Organize the answer cleanly using numbered markdown section headers (e.g. ### 1. **Theme / Principle Name**).
   - Use bullet points with bold highlights for key sub-points and textual evidence.
   - For multi-part or comparative questions, use clear headers or clean markdown tables.
   - Always conclude with a succinct synthesis under a dedicated '### Conclusion' heading.
   - Avoid dense, unbroken walls of prose paragraphs.
"""

def generate_rag_answer(
    query: str,
    context_chunks: list[str],
    model_id: str = "gpt-6-astra"
) -> dict:
    """
    Generates a grounded answer for the user query using the chosen GPT model.
    Supports dynamic model selection via model_id.
    """
    context_block = "\n\n".join([f"--- Context Chunk {idx+1} ---\n{c}" for idx, c in enumerate(context_chunks)])
    user_content = f"Context:\n{context_block}\n\nUser Question: {query}\n\nPlease provide a grounded answer:"

    # Match system or developer role depending on model requirements
    if model_id in ["o1", "o3-mini"]:
        messages = [
            {"role": "developer", "content": RAG_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]
    else:
        messages = [
            {"role": "system", "content": RAG_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]

    kwargs = {
        "model": model_id,
        "messages": messages
    }

    # High reasoning effort for reasoning tier models
    if model_id.startswith("gpt-6") or model_id in ["o1", "o3-mini"]:
        kwargs["reasoning_effort"] = "high"
        kwargs["max_completion_tokens"] = 4000
    elif model_id.startswith("gpt-5"):
        kwargs["max_completion_tokens"] = 4000
    else:
        kwargs["temperature"] = 0.2
        kwargs["max_completion_tokens"] = 4000

    start_time = time.perf_counter()
    try:
        response = client.chat.completions.create(**kwargs)
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        # Graceful fallback if a frontier model is unavailable in early access
        if model_id.startswith("gpt-6"):
            kwargs["model"] = "gpt-4o"
            kwargs.pop("reasoning_effort", None)
            kwargs["temperature"] = 0.2
            kwargs["max_completion_tokens"] = 4000
            response = client.chat.completions.create(**kwargs)
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            answer = response.choices[0].message.content.strip()
            model_id = "gpt-4o (fallback from gpt-6)"
        else:
            raise e

    return {
        "model_id": model_id,
        "answer": answer,
        "latency_ms": latency_ms
    }
