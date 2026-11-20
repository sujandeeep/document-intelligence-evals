import os
import threading
from fastmcp import FastMCP
from dotenv import load_dotenv

from src.db import (
    insert_document_chunks,
    search_similar_chunks,
    save_rag_evaluation,
    fetch_recent_evaluations
)
from src.embeddings import chunk_text, get_embeddings, get_single_embedding
from src.generator import generate_rag_answer, AVAILABLE_MODELS
from src.evaluator import evaluate_rag_triad
from src.metrics import start_metrics_server, record_evaluation_metrics
from src.ragflow_client import ragflow_client

load_dotenv()

# FastMCP Server
mcp = FastMCP("rag-eval-server")

def _run_async_evaluation_worker(
    query: str,
    model_id: str,
    context_chunks: list[str],
    response: str,
    document_name: str = "Knowledge Base"
):
    """
    Background worker thread function executing the Goldfish evaluation,
    writing results to the Elephant (PostgreSQL), and incrementing Prometheus.
    """
    try:
        eval_result = evaluate_rag_triad(
            query=query,
            context_chunks=context_chunks,
            response=response,
            judge_model="gpt-6-astra"
        )
        
        # Save to Elephant (PostgreSQL)
        record_id = save_rag_evaluation(
            query=query,
            model_id=model_id,
            retrieved_contexts=context_chunks,
            response=response,
            faithfulness_score=eval_result["metrics"]["faithfulness"],
            context_relevance_score=eval_result["metrics"]["context_relevance"],
            answer_relevance_score=eval_result["metrics"]["answer_relevance"],
            confidence_score=eval_result["confidence_score"],
            verdict=eval_result["verdict"],
            unsupported_claims=eval_result["unsupported_claims"],
            explanations=eval_result["explanations"],
            latency_ms=eval_result["eval_latency_ms"],
            document_name=document_name,
            claims_analysis=eval_result.get("claims_analysis", [])
        )
        
        # Record to Prometheus Telemetry
        record_evaluation_metrics(
            model_id=model_id,
            faithfulness=eval_result["metrics"]["faithfulness"],
            context_relevance=eval_result["metrics"]["context_relevance"],
            answer_relevance=eval_result["metrics"]["answer_relevance"],
            confidence=eval_result["confidence_score"],
            verdict=eval_result["verdict"],
            latency_ms=eval_result["eval_latency_ms"]
        )
        
        print(f"[Async Evaluator] Evaluation complete for record #{record_id}: Verdict={eval_result['verdict']} Score={eval_result['confidence_score']}")
    except Exception as e:
        print(f"[Async Evaluator Error] Failed to evaluate in background: {e}")

@mcp.tool()
def ingest_document(file_path: str, dataset_name: str = "default_kb") -> dict:
    """
    Ingests a document (.pdf, .docx, .txt, .csv) into RAGFlow for DeepDoc layout analysis,
    OCR, and hybrid indexing. Also provides local pgvector storage as a fallback.
    """
    if not os.path.exists(file_path):
        return {"status": "error", "message": f"File not found: {file_path}"}
    
    # 1. If RAGFlow Cloud/Instance is configured, upload to RAGFlow
    if ragflow_client.is_configured:
        try:
            ragflow_res = ragflow_client.upload_document(dataset_name, file_path)
            return {
                "engine": "RAGFlow DeepDoc",
                "ragflow_result": ragflow_res
            }
        except Exception as e:
            print(f"[RAGFlow Notice] RAGFlow upload failed ({e}), falling back to local pgvector pipeline.")

    # 2. Local pgvector fallback
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    elif ext == ".docx":
        import docx
        doc = docx.Document(file_path)
        text = "\n".join([p.text for p in doc.paragraphs if p.text])
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    chunks = chunk_text(text, chunk_size=1200, overlap=200)
    embeddings = get_embeddings(chunks)
    insert_document_chunks(
        document_name=os.path.basename(file_path),
        chunks=chunks,
        embeddings=embeddings,
        metadata={"dataset_name": dataset_name, "file_path": file_path}
    )

    return {
        "engine": "Local pgvector",
        "document_name": os.path.basename(file_path),
        "chunks_ingested": len(chunks)
    }

@mcp.tool()
def ask_rag(
    query: str,
    dataset_name: str = "default_kb",
    model_id: str = "gpt-6-astra",
    top_k: int = 8,
    async_eval: bool = True,
    document_name: str = None
) -> dict:
    """
    Executes RAG Retrieval + Answer Generation with selected GPT model,
    followed by the Goldfish RAG Triad Evaluation.

    - Retrieves chunks using RAGFlow Hybrid Search (if configured) or pgvector.
    - Generates grounded answer with model_id (gpt-6-astra, gpt-6.1-sol, gpt-5.5, gpt-4o).
    - Dispatches Asynchronous Background Evaluation (Faithfulness, Relevancy, Confidence).
    """
    context_chunks = []
    sources = []

    # 1. Retrieve from RAGFlow if configured (fallback seamlessly if unauthenticated or error)
    if ragflow_client.is_configured:
        try:
            ragflow_chunks = ragflow_client.retrieve_chunks(dataset_name, query, top_k=top_k)
            context_chunks = [c["content"] for c in ragflow_chunks if c.get("content")]
            sources = [
                {
                    "source": c.get("doc_name", dataset_name),
                    "similarity": c.get("similarity", 1.0),
                    "engine": "RAGFlow Hybrid"
                }
                for c in ragflow_chunks
            ]
        except Exception as e:
            # RAGFlow demo instance requires Starter/Pro plan; gracefully fall back to local pgvector
            pass

    # 2. Local pgvector Intelligent Hybrid Search (Vector + Lexical + Document Filtering)
    if not context_chunks:
        query_vector = get_single_embedding(query)
        search_results = search_similar_chunks(
            query_embedding=query_vector,
            top_k=top_k,
            document_name=document_name,
            query_text=query
        )
        context_chunks = [r["chunk_text"] for r in search_results]
        sources = [
            {
                "id": r["id"],
                "source": r["document_name"],
                "chunk_index": r["chunk_index"],
                "similarity": round(float(r["similarity_score"]), 4),
                "engine": "pgvector"
            }
            for r in search_results
        ]

    if not context_chunks:
        return {
            "answer": "No relevant documents found in the database. Please ingest documents first.",
            "sources": [],
            "evaluation": None
        }

    # 3. Determine primary document name
    primary_doc = document_name or (sources[0]["source"] if sources else "Knowledge Base")

    # 4. Generate grounded answer with chosen model
    gen_result = generate_rag_answer(query, context_chunks, model_id=model_id)
    answer = gen_result["answer"]

    # 4. Trigger Asynchronous Background Evaluation or Synchronous Evaluation
    if async_eval:
        threading.Thread(
            target=_run_async_evaluation_worker,
            args=(query, model_id, context_chunks, answer, primary_doc),
            daemon=True
        ).start()

        return {
            "model_used": gen_result["model_id"],
            "document_name": primary_doc,
            "answer": answer,
            "sources": sources,
            "generation_latency_ms": gen_result["latency_ms"],
            "evaluation_status": "ASYNC_EVALUATION_IN_PROGRESS"
        }
    else:
        eval_result = evaluate_rag_triad(
            query=query,
            context_chunks=context_chunks,
            response=answer,
            judge_model="gpt-6-astra"
        )

        eval_id = save_rag_evaluation(
            query=query,
            model_id=model_id,
            retrieved_contexts=context_chunks,
            response=answer,
            faithfulness_score=eval_result["metrics"]["faithfulness"],
            context_relevance_score=eval_result["metrics"]["context_relevance"],
            answer_relevance_score=eval_result["metrics"]["answer_relevance"],
            confidence_score=eval_result["confidence_score"],
            verdict=eval_result["verdict"],
            unsupported_claims=eval_result["unsupported_claims"],
            explanations=eval_result["explanations"],
            latency_ms=eval_result["eval_latency_ms"],
            document_name=primary_doc,
            claims_analysis=eval_result.get("claims_analysis", [])
        )

        record_evaluation_metrics(
            model_id=model_id,
            faithfulness=eval_result["metrics"]["faithfulness"],
            context_relevance=eval_result["metrics"]["context_relevance"],
            answer_relevance=eval_result["metrics"]["answer_relevance"],
            confidence=eval_result["confidence_score"],
            verdict=eval_result["verdict"],
            latency_ms=eval_result["eval_latency_ms"]
        )

        return {
            "evaluation_id": eval_id,
            "model_used": gen_result["model_id"],
            "answer": answer,
            "sources": sources,
            "generation_latency_ms": gen_result["latency_ms"],
            "confidence_score": eval_result["confidence_score"],
            "verdict": eval_result["verdict"],
            "evaluation": eval_result
        }

@mcp.tool()
def evaluate_rag_triad_tool(
    query: str,
    context_chunks: list[str],
    response: str,
    model_id: str = "gpt-6-astra"
) -> dict:
    """
    Pure Goldfish Evaluator tool: Audits any provided query, context chunks, and answer.
    Computes Faithfulness, Context Relevance, Answer Relevancy, and Confidence Score.
    Saves the audit trail to PostgreSQL and logs to Prometheus.
    """
    eval_result = evaluate_rag_triad(
        query=query,
        context_chunks=context_chunks,
        response=response,
        judge_model="gpt-6-astra"
    )

    record_id = save_rag_evaluation(
        query=query,
        model_id=model_id,
        retrieved_contexts=context_chunks,
        response=response,
        faithfulness_score=eval_result["metrics"]["faithfulness"],
        context_relevance_score=eval_result["metrics"]["context_relevance"],
        answer_relevance_score=eval_result["metrics"]["answer_relevance"],
        confidence_score=eval_result["confidence_score"],
        verdict=eval_result["verdict"],
        unsupported_claims=eval_result["unsupported_claims"],
        explanations=eval_result["explanations"],
        latency_ms=eval_result["eval_latency_ms"]
    )

    record_evaluation_metrics(
        model_id=model_id,
        faithfulness=eval_result["metrics"]["faithfulness"],
        context_relevance=eval_result["metrics"]["context_relevance"],
        answer_relevance=eval_result["metrics"]["answer_relevance"],
        confidence=eval_result["confidence_score"],
        verdict=eval_result["verdict"],
        latency_ms=eval_result["eval_latency_ms"]
    )

    eval_result["audit_record_id"] = record_id
    return eval_result

@mcp.tool()
def get_recent_evaluations(limit: int = 10, low_confidence_only: bool = False) -> list[dict]:
    """
    Fetches recent evaluation logs directly from the Elephant (PostgreSQL).
    Allows inspecting low-confidence queries or detected hallucinations.
    """
    rows = fetch_recent_evaluations(limit=limit, low_confidence_only=low_confidence_only)
    for r in rows:
        if "created_at" in r and r["created_at"]:
            r["created_at"] = r["created_at"].isoformat()
    return rows

if __name__ == "__main__":
    mcp.run()
