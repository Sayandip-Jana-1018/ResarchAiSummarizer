"""
RAG API for AI Scientific Research Summarizer
Provides endpoints for document processing and question answering using RAG
"""

import os
import sys
import json
import time
import logging
from typing import Dict, Any, Optional, List, Union
from fastapi import FastAPI, HTTPException, Body, File, UploadFile, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.rag_processor import RAGProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Scientific Research Summarizer RAG API",
    description="API for context-aware question answering using RAG",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG processor
rag_processor = RAGProcessor()

# Define request/response models
class DocumentProcessRequest(BaseModel):
    document_id: str
    document_text: str
    chunk_size: Optional[int] = 500
    chunk_overlap: Optional[int] = 100

class QuestionRequest(BaseModel):
    question: str
    document_id: str
    model: str = "gemini"
    conversation_history: Optional[List[Dict[str, str]]] = None

class Message(BaseModel):
    role: str
    content: str

class ConversationRequest(BaseModel):
    document_id: str
    messages: List[Message]
    model: str = "gemini"

@app.post("/process-document")
async def process_document(request: DocumentProcessRequest):
    """
    Process a document for RAG by chunking and embedding
    """
    logger.info(f"Processing document {request.document_id} for RAG")
    
    try:
        result = rag_processor.process_document(
            document_id=request.document_id,
            document_text=request.document_text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        return result
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/answer-question")
async def answer_question(request: QuestionRequest):
    """
    Answer a question using RAG
    """
    logger.info(f"Answering question with RAG: '{request.question}' for document {request.document_id}")
    
    try:
        result = rag_processor.answer_question(
            question=request.question,
            document_id=request.document_id,
            model=request.model,
            conversation_history=request.conversation_history
        )
        
        return result
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ConversationRequest):
    """
    Handle a conversation with RAG context
    """
    logger.info(f"Processing chat for document {request.document_id}")
    
    try:
        # Convert messages to the format expected by the RAG processor
        conversation_history = []
        user_question = ""
        
        for i, message in enumerate(request.messages):
            # Skip the last user message as we'll use it as the question
            if i == len(request.messages) - 1 and message.role == "user":
                user_question = message.content
            else:
                conversation_history.append({
                    "role": message.role,
                    "content": message.content
                })
        
        if not user_question:
            raise HTTPException(status_code=400, detail="No user question found in the conversation")
        
        result = rag_processor.answer_question(
            question=user_question,
            document_id=request.document_id,
            model=request.model,
            conversation_history=conversation_history
        )
        
        return result
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Test route
@app.get("/")
async def read_root():
    return {"message": "RAG API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
