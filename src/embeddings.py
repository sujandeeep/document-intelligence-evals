import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

EMBEDDING_MODEL = "text-embedding-3-large"

def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    """
    Splits raw text into larger, context-rich chunks with sentence-boundary overlap.
    - Default chunk_size = 1200 characters (~250-300 words), preserving full sections.
    - Default overlap = 200 characters, snapping cleanly to complete sentence boundaries.
    - Prevents fragmenting atomic factual statements across chunk boundaries,
      making RAG generation and evaluation substantially easier and more grounded.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    # Split cleanly by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        # If a single paragraph is longer than chunk_size, split by sentences
        if len(p) > chunk_size:
            sentences = [s.strip() for s in p.replace(". ", ".\n").splitlines() if s.strip()]
            for s in sentences:
                if not current_chunk:
                    current_chunk = s
                elif len(current_chunk) + len(s) + 1 <= chunk_size:
                    current_chunk = f"{current_chunk} {s}"
                else:
                    chunks.append(current_chunk)
                    if overlap > 0 and len(current_chunk) > overlap:
                        overlap_tail = current_chunk[-overlap:]
                        period_idx = overlap_tail.find(". ")
                        seed = overlap_tail[period_idx + 2:].strip() if period_idx != -1 else overlap_tail.strip()
                        current_chunk = f"{seed} {s}" if seed else s
                    else:
                        current_chunk = s
            continue

        if not current_chunk:
            current_chunk = p
        elif len(current_chunk) + len(p) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{p}"
        else:
            chunks.append(current_chunk)
            if overlap > 0 and len(current_chunk) > overlap:
                overlap_tail = current_chunk[-overlap:]
                period_idx = overlap_tail.find(". ")
                seed = overlap_tail[period_idx + 2:].strip() if period_idx != -1 else overlap_tail.strip()
                current_chunk = f"{seed}\n\n{p}" if seed else p
            else:
                current_chunk = p

    if current_chunk and (not chunks or chunks[-1] != current_chunk):
        chunks.append(current_chunk)

    return chunks if chunks else [text]

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generates embeddings for a batch of text chunks using text-embedding-3-small."""
    if not texts:
        return []
    
    # Strip newlines as recommended by OpenAI documentation
    cleaned_texts = [t.replace("\n", " ").strip() for t in texts]
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        dimensions=1536,
        input=cleaned_texts
    )
    return [item.embedding for item in response.data]

def get_single_embedding(text: str) -> list[float]:
    """Generates embedding for a single query."""
    embeddings = get_embeddings([text])
    return embeddings[0] if embeddings else []
