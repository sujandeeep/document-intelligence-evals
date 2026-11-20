import os
from ragflow_sdk import RAGFlow
from dotenv import load_dotenv

load_dotenv()

RAGFLOW_API_KEY = os.getenv("RAGFLOW_API_KEY", "")
RAGFLOW_BASE_URL = os.getenv("RAGFLOW_BASE_URL", "https://api.ragflow.io")

class RAGFlowBridge:
    def __init__(self):
        self.api_key = RAGFLOW_API_KEY
        self.base_url = RAGFLOW_BASE_URL
        self._client = None
        
        if self.api_key:
            self._client = RAGFlow(api_key=self.api_key, base_url=self.base_url)

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client)

    def get_or_create_dataset(self, dataset_name: str):
        """Retrieves an existing dataset by name or creates a new one."""
        if not self.is_configured:
            raise ValueError("RAGFLOW_API_KEY is not set. Please add it to your .env file.")
        
        datasets = self._client.list_datasets(name=dataset_name)
        if datasets:
            return datasets[0]
        
        return self._client.create_dataset(name=dataset_name)

    def upload_document(self, dataset_name: str, file_path: str) -> dict:
        """
        Uploads a local file (.pdf, .docx, .txt, .csv) to the specified RAGFlow dataset
        and triggers RAGFlow's DeepDoc parsing and chunking.
        """
        if not os.path.exists(file_path):
            return {"status": "error", "message": f"File not found: {file_path}"}
            
        dataset = self.get_or_create_dataset(dataset_name)
        file_name = os.path.basename(file_path)
        
        with open(file_path, "rb") as f:
            blob_data = f.read()
            
        docs = dataset.upload_documents([{"display_name": file_name, "blob": blob_data}])
        
        if docs:
            # Trigger DeepDoc parsing on the uploaded document
            doc_ids = [d.id for d in docs]
            dataset.async_parse_documents(doc_ids)
            return {
                "status": "success",
                "dataset_name": dataset_name,
                "dataset_id": dataset.id,
                "document_name": file_name,
                "document_id": doc_ids[0],
                "message": "Document uploaded and DeepDoc parsing initiated."
            }
        return {"status": "error", "message": "Failed to upload document to RAGFlow."}

    def retrieve_chunks(self, dataset_name: str, query: str, top_k: int = 4) -> list[dict]:
        """
        Performs hybrid retrieval (BM25 + Dense Vector embeddings) via RAGFlow's retrieval API.
        Returns a list of structured chunks with content, similarity, and document provenance.
        """
        if not self.is_configured:
            raise ValueError("RAGFLOW_API_KEY is not set. Please add it to your .env file.")
            
        dataset = self.get_or_create_dataset(dataset_name)
        
        # Call RAGFlow's hybrid search API
        results = self._client.retrieve(
            dataset_ids=[dataset.id],
            question=query,
            page=1,
            page_size=top_k,
            similarity_threshold=0.2,
            vector_similarity_weight=0.5,
            keyword=True
        )
        
        chunks = []
        for item in results:
            content = getattr(item, "content", "")
            if not content and hasattr(item, "content_with_weight"):
                content = item.content_with_weight
            similarity = getattr(item, "similarity", 0.0)
            doc_name = getattr(item, "doc_name", dataset_name)
            
            chunks.append({
                "content": content,
                "similarity": round(float(similarity), 4) if similarity else 1.0,
                "doc_name": doc_name
            })
            
        return chunks

ragflow_client = RAGFlowBridge()
