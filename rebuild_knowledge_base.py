#!/usr/bin/env python3
"""
Complete Database Wipe & Knowledge Base Rebuilder
=================================================
1. Wipes all data in PostgreSQL:
   - rag_evaluations (resets Viewport UI history completely)
   - document_embeddings (resets old chunks & embeddings)
2. Ingests all 11 books from rigid_docs/ into Local pgvector:
   - Extracts text using pypdf
   - Chunks text into 1200-character segments with sentence overlap
   - Computes embeddings via text-embedding-3-small in batches of 100
   - Stores vectors and metadata into PostgreSQL
3. Syncs Cloud RAG (Cloud_RAG_KnowledgeBase):
   - Removes obsolete non-book files
   - Uploads new book PDFs to OpenAI Vector Store
   - Polls until cloud indexing is fully completed
4. Displays clean real-time terminal progress for every book.
"""

import os
import sys
import time
from dotenv import load_dotenv
import pypdf
from openai import OpenAI

load_dotenv()

from src.db import get_connection, insert_document_chunks
from src.embeddings import chunk_text, get_embeddings

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("[ERROR] OPENAI_API_KEY not found in environment or .env file.")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)
DOCS_DIR = "rigid_docs"

# ANSI Color Codes
BOLD = "\033[1m"
GREEN = "\033[32m"
BLUE = "\033[34m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
RESET = "\033[0m"

def log_step(step_num: int, total_steps: int, title: str):
    print(f"\n{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BOLD}{CYAN}[Step {step_num}/{total_steps}] {title}{RESET}")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")

def wipe_database():
    """Truncates both tables and resets auto-increment IDs to 1."""
    print(f"Connecting to PostgreSQL (port 5434)...")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) as cnt FROM rag_evaluations;")
            old_evals = cur.fetchone()["cnt"]
            cur.execute("SELECT count(*) as cnt FROM document_embeddings;")
            old_chunks = cur.fetchone()["cnt"]

            print(f"Found {YELLOW}{old_evals}{RESET} evaluation records and {YELLOW}{old_chunks}{RESET} existing document chunks.")
            print(f"Executing: {BOLD}TRUNCATE TABLE rag_evaluations, document_embeddings RESTART IDENTITY;{RESET}")
            
            cur.execute("TRUNCATE TABLE rag_evaluations, document_embeddings RESTART IDENTITY;")
        conn.commit()
    print(f"{BOLD}{GREEN}✓ Database successfully cleansed! Viewport UI and pgvector are 100% clean.{RESET}")

def ingest_books_to_local_pgvector():
    """Extracts, chunks, embeds, and loads all books from rigid_docs/ into PostgreSQL."""
    if not os.path.exists(DOCS_DIR):
        print(f"[ERROR] Directory {DOCS_DIR} not found.")
        sys.exit(1)

    book_files = sorted([f for f in os.listdir(DOCS_DIR) if f.lower().endswith(".pdf")])
    print(f"Discovered {BOLD}{len(book_files)}{RESET} books in {DOCS_DIR}/ to ingest:\n")

    total_chunks_ingested = 0

    for idx, fname in enumerate(book_files, 1):
        file_path = os.path.join(DOCS_DIR, fname)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        print(f"{BOLD}[{idx}/{len(book_files)}]{RESET} {BLUE}{fname}{RESET} ({file_size_mb:.2f} MB)")
        t0 = time.perf_counter()

        # 1. Extract text
        print(f"    ├─ Extracting text from PDF pages...", end="", flush=True)
        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)
        raw_text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                raw_text += t + "\n"
        print(f" {GREEN}{total_pages} pages extracted ({len(raw_text):,} chars){RESET}")

        # 2. Chunk text
        print(f"    ├─ Chunking text (1200 chars / 200 overlap)...", end="", flush=True)
        chunks = chunk_text(raw_text, chunk_size=1200, overlap=200)
        print(f" {GREEN}{len(chunks)} chunks created{RESET}")

        # 3. Compute Embeddings in Batches of 100
        print(f"    ├─ Generating OpenAI embeddings (text-embedding-3-large)...", flush=True)
        batch_size = 100
        all_embeddings = []
        for b_idx in range(0, len(chunks), batch_size):
            b_chunks = chunks[b_idx:b_idx + batch_size]
            b_embeddings = get_embeddings(b_chunks)
            all_embeddings.extend(b_embeddings)
            print(f"    │   └─ Processed batch {min(b_idx + batch_size, len(chunks))}/{len(chunks)} chunks", flush=True)

        # 4. Insert into PostgreSQL
        print(f"    ├─ Storing vectors into PostgreSQL document_embeddings...", end="", flush=True)
        insert_document_chunks(
            document_name=fname,
            chunks=chunks,
            embeddings=all_embeddings,
            metadata={"source": "rigid_docs", "filename": fname, "pages": total_pages}
        )
        elapsed = time.perf_counter() - t0
        print(f" {BOLD}{GREEN}Done ({elapsed:.1f}s){RESET}")
        total_chunks_ingested += len(chunks)

    print(f"\n{BOLD}{GREEN}✓ Local Ingestion Complete: {len(book_files)} books ({total_chunks_ingested:,} total chunks) in pgvector.{RESET}")
    return book_files

def sync_ragflow(book_files: list[str]):
    """Attempts to upload books directly to RAGFlow Cloud if an active plan is enabled."""
    from src.ragflow_client import ragflow_client
    if not ragflow_client.is_configured:
        print(f"RAGFlow API key not configured. Skipping direct RAGFlow push.")
        return

    print(f"Connecting to RAGFlow Cloud API ({ragflow_client.base_url})...")
    try:
        ds = ragflow_client.get_or_create_dataset("books_knowledge_base")
        print(f"{BOLD}{GREEN}✓ RAGFlow Cloud connected! Dataset: {ds.name}{RESET}")
        for b in book_files:
            fp = os.path.join(DOCS_DIR, b)
            res = ragflow_client.upload_document("books_knowledge_base", fp)
            print(f"    ├─ Uploaded {b} to RAGFlow: {res.get('status')}")
    except Exception as e:
        print(f"{YELLOW}    ├─ [RAGFlow Cloud Note] {e}{RESET}")
        print(f"{YELLOW}    └─ RAGFlow's demo/free API requires upgrading to a Starter or Pro plan.{RESET}")

def sync_cloud_rag(book_files: list[str]):
    """Synchronizes Cloud_RAG_KnowledgeBase on OpenAI vector stores."""
    stores = client.vector_stores.list()
    kb = None
    for s in stores.data:
        if s.name == "Cloud_RAG_KnowledgeBase":
            kb = s
            break
    
    if not kb:
        print(f"Creating new Cloud Vector Store: {BOLD}Cloud_RAG_KnowledgeBase{RESET}...")
        kb = client.vector_stores.create(name="Cloud_RAG_KnowledgeBase")
    
    print(f"Connected to Cloud Vector Store: {BOLD}{kb.name}{RESET} (ID: {CYAN}{kb.id}{RESET})")

    # Fetch currently attached files
    cloud_files_data = client.vector_stores.files.list(vector_store_id=kb.id).data
    cloud_files_map = {}
    for f in cloud_files_data:
        try:
            info = client.files.retrieve(f.id)
            cloud_files_map[info.filename] = f.id
        except Exception:
            pass

    print(f"Current files in Cloud Vector Store: {len(cloud_files_map)}")

    # 1. Remove obsolete non-book files
    valid_names = set(book_files)
    for fname, fid in list(cloud_files_map.items()):
        if fname not in valid_names:
            print(f"    ├─ Removing obsolete non-book file from Cloud KB: {YELLOW}{fname}{RESET} (ID: {fid})...", end="", flush=True)
            try:
                client.vector_stores.files.delete(vector_store_id=kb.id, file_id=fid)
                client.files.delete(file_id=fid)
                print(f" {GREEN}Removed{RESET}")
                del cloud_files_map[fname]
            except Exception as e:
                print(f" {YELLOW}Failed ({e}){RESET}")

    # 2. Upload missing books
    missing_books = [b for b in book_files if b not in cloud_files_map]
    print(f"\nBooks to upload to Cloud RAG: {BOLD}{len(missing_books)}{RESET}")

    for idx, fname in enumerate(missing_books, 1):
        fp = os.path.join(DOCS_DIR, fname)
        size_mb = os.path.getsize(fp) / (1024 * 1024)
        print(f"    ├─ [{idx}/{len(missing_books)}] Uploading {BLUE}{fname}{RESET} ({size_mb:.2f} MB)...", end="", flush=True)
        with open(fp, "rb") as f:
            batch = client.vector_stores.file_batches.upload_and_poll(
                vector_store_id=kb.id,
                files=[f]
            )
        print(f" {BOLD}{GREEN}Status: {batch.status}{RESET}")

    # Final verification
    final_files = client.vector_stores.files.list(vector_store_id=kb.id).data
    print(f"\n{BOLD}{GREEN}✓ Cloud RAG Synchronization Complete: {len(final_files)} books live in Cloud Vector Store!{RESET}")

def print_final_summary():
    """Prints live summary table of the newly ingested library."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT document_name, count(*) as chunks
                FROM document_embeddings
                GROUP BY document_name
                ORDER BY document_name;
            """)
            rows = cur.fetchall()

    print(f"\n{BOLD}{GREEN}======================================================================{RESET}")
    print(f"{BOLD}{GREEN}          ALL SYSTEMS SYNCHRONIZED & READY FOR VIEWPORT              {RESET}")
    print(f"{BOLD}{GREEN}======================================================================{RESET}")
    print(f"{BOLD}{'#':<3} {'Book / Document Name':<58} {'Chunks Ingested':<15}{RESET}")
    print("─" * 78)
    total_c = 0
    for idx, r in enumerate(rows, 1):
        c = r["chunks"]
        total_c += c
        print(f"{idx:<3} {r['document_name']:<58} {c:<15}")
    print("─" * 78)
    print(f"{BOLD}Total Library Chunks in PostgreSQL: {total_c:,}{RESET}")
    print(f"{BOLD}Viewport URL: http://localhost:5173{RESET}")
    print(f"{BOLD}Grafana URL:  http://localhost:3000{RESET}")
    print(f"{BOLD}{GREEN}======================================================================{RESET}\n")

def main():
    print(f"{BOLD}{MAGENTA}")
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║     DATABASE PURGE & KNOWLEDGE BASE REBUILDER (LOCAL & CLOUD)        ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print(f"{RESET}")

    # Step 1: Wipe Database
    log_step(1, 3, "Purging PostgreSQL Evaluation Logs & Document Embeddings")
    wipe_database()

    # Step 2: Ingest all books to PostgreSQL pgvector
    log_step(2, 3, "Extracting, Chunking & Ingesting All Books into pgvector")
    book_files = ingest_books_to_local_pgvector()

    # Step 3: Sync to Cloud RAG
    log_step(3, 3, "Synchronizing All Books into Cloud RAG (RAGFlow & Cloud Vector Store)")
    sync_ragflow(book_files)
    sync_cloud_rag(book_files)

    # Summary
    print_final_summary()

if __name__ == "__main__":
    main()
