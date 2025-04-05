"""
AI Scientific Research Summarizer Backend
Main application file for handling document processing and AI summarization
"""

import os
import sys
import json
import time
import logging
import uuid
from typing import Dict, Any, Optional, List, Union
from dotenv import load_dotenv

# Try to import supabase, but don't fail if it's not installed
try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("WARNING: Supabase Python client not installed. Supabase features will be disabled.")

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Initialize Supabase client
supabase_client = None
if HAS_SUPABASE:
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("Supabase client initialized successfully")
        except Exception as e:
            print(f"WARNING: Failed to initialize Supabase client: {str(e)}")
    else:
        print("WARNING: SUPABASE_URL or SUPABASE_KEY not set")
else:
    print("WARNING: Supabase features disabled. Install the Python client with 'pip install supabase'")

# Check if the API keys are loaded
api_keys = {
    'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY'),
    'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
    'ANTHROPIC_API_KEY': os.getenv('ANTHROPIC_API_KEY'),
    'MISTRAL_API_KEY': os.getenv('MISTRAL_API_KEY')
}

for key, value in api_keys.items():
    if value:
        print(f"{key} is set")
    else:
        print(f"WARNING: {key} is not set")

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.document_processor import DocumentProcessor
from utils.text_extraction import extract_text_from_file
from models.ai_summarizer import (
    summarize_with_gemini,
    summarize_with_openai,
    summarize_with_claude,
    summarize_with_mistral
)
from utils.rag_processor import RAGProcessor

# Configure logging
# Create logs directory if it doesn't exist
os.makedirs(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs"), exist_ok=True)

log_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "app.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class SummarizerBackend:
    """Main backend class for the AI Scientific Research Summarizer"""
    
    def __init__(self):
        """Initialize the summarizer backend"""
        self.document_processor = DocumentProcessor()
        self.rag_processor = RAGProcessor()
        logger.info("SummarizerBackend initialized")
    
    def process_document(self, file_path: str, file_type: str, options: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a document and generate a summary
        
        Args:
            file_path: Path to the document (local path or URL)
            file_type: Type of document (pdf, image, etc.)
            options: Summarization options including model, length, style, focus, language
            user_id: Optional user ID for storing in Supabase
            
        Returns:
            Dict containing summary, extracted text, processing time, and word count
        """
        start_time = time.time()
        logger.info(f"Processing document: {file_path} of type {file_type}")
        
        try:
            # Extract text from document
            extracted_text = self.document_processor.extract_text(file_path, file_type)
            
            if not extracted_text or len(extracted_text.strip()) < 50:
                logger.warning(f"Insufficient text extracted from document: {file_path}")
                return {
                    "status": "error",
                    "error": "Insufficient text could be extracted from the document",
                    "extracted_text": extracted_text
                }
            
            # Calculate word count
            word_count = len(extracted_text.split())
            logger.info(f"Extracted {word_count} words from document")
            
            # Summarize text using selected AI model
            model = options.get("model", "gemini").lower()
            summary_result = self.summarize_text(extracted_text, model, options)
            
            # Calculate total processing time
            processing_time = time.time() - start_time
            
            # Store summary in Supabase if client is available and user_id is provided
            summary_id = None
            if supabase_client and user_id:
                try:
                    summary_id = str(uuid.uuid4())
                    summary_data = {
                        "id": summary_id,
                        "user_id": user_id,
                        "summary": summary_result["summary"],
                        "model": model,
                        "document_url": file_path,
                        "document_type": file_type,
                        "word_count": word_count,
                        "processing_time": processing_time,
                        "options": json.dumps(options),
                        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    }
                    
                    # Insert into summaries table
                    result = supabase_client.table("summaries").insert(summary_data).execute()
                    logger.info(f"Summary stored in Supabase with ID: {summary_id}")
                except Exception as e:
                    logger.error(f"Error storing summary in Supabase: {str(e)}", exc_info=True)
                    # Continue even if Supabase storage fails
            
            return {
                "status": "success",
                "summary": summary_result["summary"],
                "extracted_text": extracted_text,
                "model": model,
                "processing_time": processing_time,
                "word_count": word_count,
                "summary_id": summary_id
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def summarize_text(self, text: str, model: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarize text using the specified AI model
        
        Args:
            text: Text to summarize
            model: AI model to use (gemini, openai, claude, mistral)
            options: Summarization options
            
        Returns:
            Dict containing summary and processing time
        """
        logger.info(f"Summarizing text with {model} model")
        
        # Map frontend options to backend options
        # Ensure defaults match those in the frontend
        summarization_options = {
            "length": options.get("length", "medium"),
            "style": options.get("style", "paragraph"),  # Updated default to match frontend
            "focus": options.get("focus", "comprehensive"),
            "language": options.get("language", "en")
        }
        
        logger.info(f"Using summarization options: {summarization_options}")
        
        try:
            if model == "gemini":
                return summarize_with_gemini(text, summarization_options)
            elif model == "openai":
                return summarize_with_openai(text, summarization_options)
            elif model == "claude":
                return summarize_with_claude(text, summarization_options)
            elif model == "mistral":
                return summarize_with_mistral(text, summarization_options)
            else:
                raise ValueError(f"Unsupported AI model: {model}")
        except Exception as e:
            logger.error(f"Error summarizing with {model}: {str(e)}", exc_info=True)
            raise
            
    def process_document_for_rag(self, document_id: str, document_text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> Dict[str, Any]:
        """
        Process a document for RAG by chunking and embedding
        
        Args:
            document_id: Unique identifier for the document
            document_text: Full text of the document
            chunk_size: Size of each chunk in words
            chunk_overlap: Overlap between chunks in words
            
        Returns:
            Dict containing processing results
        """
        logger.info(f"Processing document {document_id} for RAG")
        
        try:
            result = self.rag_processor.process_document(
                document_id=document_id,
                document_text=document_text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            return result
        except Exception as e:
            logger.error(f"Error processing document for RAG: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def answer_question_with_rag(self, question: str, document_id: str, model: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Answer a question using RAG
        
        Args:
            question: User's question
            document_id: ID of the document to search in
            model: AI model to use (gemini, openai, claude, mistral)
            conversation_history: Optional list of previous messages
            
        Returns:
            Dict containing answer and source chunks
        """
        logger.info(f"Answering question with RAG: '{question}' for document {document_id} using {model}")
        
        try:
            result = self.rag_processor.answer_question(
                question=question,
                document_id=document_id,
                model=model,
                conversation_history=conversation_history
            )
            return result
        except Exception as e:
            logger.error(f"Error answering question with RAG: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }

# Command-line interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Process and summarize a document')
    parser.add_argument('file_path', help='Path to the document or URL')
    parser.add_argument('--file-type', required=True, help='Type of document (pdf, image, etc.)')
    parser.add_argument('--model', default='gemini', help='AI model to use (gemini, openai, claude, mistral)')
    parser.add_argument('--length', default='medium', help='Summary length (short, medium, long)')
    parser.add_argument('--style', default='academic', help='Summary style (academic, casual, technical, simplified)')
    parser.add_argument('--focus', default='comprehensive', help='Summary focus (comprehensive, methodology, results, conclusions)')
    parser.add_argument('--language', default='en', help='Summary language')
    parser.add_argument('--output', help='Output file path (optional)')
    
    args = parser.parse_args()
    
    # Initialize backend
    backend = SummarizerBackend()
    
    # Process document
    result = backend.process_document(
        args.file_path,
        args.file_type,
        {
            "model": args.model,
            "length": args.length,
            "style": args.style,
            "focus": args.focus,
            "language": args.language
        }
    )
    
    # Output result
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
    else:
        print(json.dumps(result, indent=2))

    # Example usage
    result = backend.process_document(
        "https://example.com/sample.pdf",
        "pdf",
        {
            "model": "gemini",
            "length": "medium",
            "style": "paragraph",  # Updated to match frontend options
            "focus": "comprehensive",
            "language": "en"
        },
        "test-user-id"
    )
    
    print(json.dumps(result, indent=2))
