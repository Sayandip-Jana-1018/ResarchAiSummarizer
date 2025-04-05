"""
FastAPI Server for AI Scientific Research Summarizer
Provides API endpoints for document processing and summarization
"""

import os
import sys
import json
import time
import logging
from typing import Dict, Any, Optional, List, Union
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
import uvicorn
import importlib

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import SummarizerBackend
from utils.document_processor import DocumentProcessor

# Configure logging
# Create logs directory if it doesn't exist
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, "api.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Scientific Research Summarizer API",
    description="API for processing and summarizing scientific research documents",
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

# Initialize backend
summarizer_backend = SummarizerBackend()
document_processor = DocumentProcessor()

# Define request and response models
class SummarizeRequest(BaseModel):
    fileUrl: str
    fileType: str
    model: str
    options: Dict[str, Any]
    userId: Optional[str] = None

class SummarizeResponse(BaseModel):
    summary: str
    extractedText: str
    model: str
    processingTime: float
    wordCount: int

class ErrorResponse(BaseModel):
    error: str

# RAG API models
class ProcessDocumentRequest(BaseModel):
    document_id: str
    document_text: str
    chunk_size: int = 500
    chunk_overlap: int = 100

class QuestionRequest(BaseModel):
    question: str
    document_id: str
    model: str = "gemini"
    conversation_history: Optional[List[Dict[str, str]]] = None

@app.get("/")
async def root():
    """Root endpoint to check if the API is running"""
    return {"status": "API is running", "version": "1.0.0"}

@app.post("/api/summarize", response_model=Union[SummarizeResponse, ErrorResponse])
async def summarize(request: SummarizeRequest):
    """
    Summarize a document from a URL
    
    Args:
        request: SummarizeRequest containing fileUrl, fileType, model, options, and userId
        
    Returns:
        SummarizeResponse containing summary, extractedText, model, processingTime, and wordCount
    """
    try:
        logger.info(f"Summarize request received for {request.fileUrl}")
        
        # Process document
        result = summarizer_backend.process_document(
            request.fileUrl,
            request.fileType,
            {
                "model": request.model,
                **request.options
            }
        )
        
        # Check for errors
        if result.get("status") == "error":
            logger.error(f"Error processing document: {result.get('error')}")
            return {"error": result.get("error", "Unknown error")}
        
        # Return response
        return {
            "summary": result["summary"],
            "extractedText": result["extracted_text"],
            "model": result["model"],
            "processingTime": result["processing_time"],
            "wordCount": result["word_count"]
        }
    
    except Exception as e:
        logger.error(f"Error in summarize endpoint: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/upload-and-summarize", response_model=Union[SummarizeResponse, ErrorResponse])
async def upload_and_summarize(
    file: UploadFile = File(...),
    model: str = Form(...),
    length: str = Form("medium"),
    style: str = Form("academic"),
    focus: str = Form("comprehensive"),
    language: str = Form("en"),
    userId: Optional[str] = Form(None)
):
    """
    Upload a file and summarize it
    
    Args:
        file: File to upload
        model: AI model to use
        length: Summary length
        style: Summary style
        focus: Summary focus
        language: Summary language
        userId: User ID
        
    Returns:
        SummarizeResponse containing summary, extractedText, model, processingTime, and wordCount
    """
    try:
        logger.info(f"Upload and summarize request received for {file.filename}")
        
        # Determine file type
        file_extension = os.path.splitext(file.filename)[1].lower().lstrip('.')
        
        # Map file extension to file type
        if file_extension == 'pdf':
            file_type = 'pdf'
        elif file_extension in ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']:
            file_type = 'image'
        elif file_extension in ['docx', 'doc', 'txt', 'rtf', 'odt']:
            file_type = 'document'
        elif file_extension in ['csv', 'xls', 'xlsx']:
            file_type = 'spreadsheet'
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
        
        # Create temp directory if it doesn't exist
        os.makedirs("backend/temp", exist_ok=True)
        
        # Save file to temp directory
        temp_file_path = f"backend/temp/{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
        
        # Process document
        result = summarizer_backend.process_document(
            temp_file_path,
            file_type,
            {
                "model": model,
                "length": length,
                "style": style,
                "focus": focus,
                "language": language
            }
        )
        
        # Remove temp file
        os.remove(temp_file_path)
        
        # Check for errors
        if result.get("status") == "error":
            logger.error(f"Error processing document: {result.get('error')}")
            return {"error": result.get("error", "Unknown error")}
        
        # Return response
        return {
            "summary": result["summary"],
            "extractedText": result["extracted_text"],
            "model": result["model"],
            "processingTime": result["processing_time"],
            "wordCount": result["word_count"]
        }
    
    except HTTPException as e:
        logger.error(f"HTTP error in upload_and_summarize: {str(e)}")
        return {"error": str(e.detail)}
    except Exception as e:
        logger.error(f"Error in upload_and_summarize: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/models")
async def get_models():
    """Get available AI models"""
    return {
        "models": [
            {"id": "gemini", "name": "Google Gemini", "tier": "basic"},
            {"id": "openai", "name": "OpenAI GPT", "tier": "silver"},
            {"id": "claude", "name": "Anthropic Claude", "tier": "premium"},
            {"id": "mistral", "name": "Mistral AI", "tier": "premium"}
        ]
    }

@app.post("/api/rag/process-document")
async def process_document_for_rag(request: ProcessDocumentRequest):
    """Process a document for RAG"""
    try:
        logger.info(f"Processing document {request.document_id} for RAG")
        
        result = summarizer_backend.process_document_for_rag(
            document_id=request.document_id,
            document_text=request.document_text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        return result
    except Exception as e:
        logger.error(f"Error processing document for RAG: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/rag/answer-question")
async def answer_question_with_rag(request: QuestionRequest):
    """Answer a question using RAG"""
    try:
        logger.info(f"Answering question with RAG: '{request.question}' for document {request.document_id}")
        
        result = summarizer_backend.answer_question_with_rag(
            question=request.question,
            document_id=request.document_id,
            model=request.model,
            conversation_history=request.conversation_history
        )
        
        return result
    except Exception as e:
        logger.error(f"Error answering question with RAG: {str(e)}", exc_info=True)
        return {"error": str(e)}

# Import and include the real-time extraction API router
try:
    from app.api.realtime_extraction import router as realtime_router
    app.include_router(realtime_router, prefix="/api/realtime", tags=["Real-time Analysis"])
    logger.info("Real-time extraction API endpoints registered")
except ImportError as e:
    logger.error(f"Failed to import real-time extraction API: {str(e)}")

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run("app.server:app", host="0.0.0.0", port=8000, reload=True)
