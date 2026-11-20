-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Document Embeddings Table (The Elephant Knowledge Base)
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW Index for fast approximate nearest neighbor cosine search
CREATE INDEX IF NOT EXISTS idx_doc_embedding_hnsw 
ON document_embeddings USING hnsw (embedding vector_cosine_ops);

-- 2. RAG Evaluation Audit Log Table (The Elephant Audit Trail)
CREATE TABLE IF NOT EXISTS rag_evaluations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    query TEXT NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    retrieved_contexts JSONB NOT NULL,
    response TEXT NOT NULL,
    faithfulness_score FLOAT NOT NULL,
    context_relevance_score FLOAT NOT NULL,
    answer_relevance_score FLOAT NOT NULL,
    confidence_score FLOAT NOT NULL,
    verdict VARCHAR(50) NOT NULL,
    unsupported_claims JSONB DEFAULT '[]'::jsonb,
    explanations JSONB DEFAULT '{}'::jsonb,
    latency_ms INT
);

-- Fast indexes for Grafana time-series and verdict filtering
CREATE INDEX IF NOT EXISTS idx_rag_evals_verdict ON rag_evaluations(verdict);
CREATE INDEX IF NOT EXISTS idx_rag_evals_model ON rag_evaluations(model_id);
CREATE INDEX IF NOT EXISTS idx_rag_evals_created_at ON rag_evaluations(created_at DESC);
