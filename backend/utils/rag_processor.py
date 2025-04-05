"""
RAG (Retrieval-Augmented Generation) Processor for AI Scientific Research Summarizer
Handles document chunking, embedding, retrieval, and context-aware question answering
"""

import os
import sys
import logging
import numpy as np
import uuid
from typing import Dict, Any, Optional, List, Union
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if the API keys are loaded
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')

# Try to import necessary libraries, but don't fail if they're not installed
try:
    import openai
    from openai import OpenAI
    HAS_OPENAI = True
    if OPENAI_API_KEY:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
except ImportError:
    HAS_OPENAI = False
    logger.warning("OpenAI Python client not installed. OpenAI features will be disabled.")

try:
    import google.generativeai as genai
    HAS_GENAI = True
    if GEMINI_API_KEY:
        # Configure with the API key
        genai.configure(api_key=GEMINI_API_KEY)
        # Test if the client works by listing models
        try:
            models = genai.list_models()
            logger.info(f"Gemini API initialized successfully. Available models: {[m.name for m in models if 'generateContent' in m.supported_generation_methods]}")
        except Exception as e:
            logger.error(f"Error initializing Gemini API: {str(e)}")
            HAS_GENAI = False
except ImportError:
    HAS_GENAI = False
    logger.warning("Google GenerativeAI Python client not installed. Gemini features will be disabled.")

try:
    from anthropic import Anthropic
    HAS_ANTHROPIC = True
    if ANTHROPIC_API_KEY:
        try:
            # Print the API key length for debugging (without revealing the key)
            logger.info(f"Claude API key length: {len(ANTHROPIC_API_KEY.strip())}")
            
            # Initialize with API key, making sure to strip any whitespace
            anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY.strip())
            
            # Test the client with a simple API call
            try:
                logger.info("Testing Claude API by listing models...")
                models = anthropic_client.models.list()
                model_names = [m.name for m in models.data]
                logger.info(f"Claude API initialized successfully. Available models: {model_names}")
                if not model_names:  # If no models are available, disable Claude
                    logger.warning("No Claude models available. Claude features will be disabled.")
                    HAS_ANTHROPIC = False
            except Exception as e:
                logger.error(f"Error listing Claude models: {str(e)}")
                # Try a simple message completion to see if the API works at all
                try:
                    logger.info("Testing Claude API with a simple message...")
                    response = anthropic_client.messages.create(
                        model="claude-3-haiku-20240307",
                        max_tokens=10,
                        messages=[{"role": "user", "content": "Hello"}]
                    )
                    logger.info("Claude API works for message completions but not for listing models")
                except Exception as msg_error:
                    logger.error(f"Error with Claude messages API: {str(msg_error)}")
                    HAS_ANTHROPIC = False
        except Exception as e:
            logger.error(f"Error initializing Claude API: {str(e)}")
            HAS_ANTHROPIC = False
    else:
        logger.warning("ANTHROPIC_API_KEY not set or empty")
        HAS_ANTHROPIC = False
except ImportError:
    HAS_ANTHROPIC = False
    logger.warning("Anthropic Python client not installed. Claude features will be disabled.")

try:
    from mistralai.client import MistralClient
    from mistralai.models.chat_completion import ChatMessage
    HAS_MISTRAL = True
    if MISTRAL_API_KEY:
        try:
            # Print the API key length for debugging (without revealing the key)
            logger.info(f"Mistral API key length: {len(MISTRAL_API_KEY.strip())}")
            
            # Initialize with API key and optional API endpoint
            mistral_client = MistralClient(
                api_key=MISTRAL_API_KEY.strip(),
                endpoint="https://api.mistral.ai"
            )
            
            # Test the client with a simple API call to list models
            try:
                logger.info("Testing Mistral API by listing models...")
                models = mistral_client.list_models()
                model_ids = [m.id for m in models.data]
                logger.info(f"Mistral API initialized successfully. Available models: {model_ids}")
                if not model_ids:  # If no models are available, disable Mistral
                    logger.warning("No Mistral models available. Mistral features will be disabled.")
                    HAS_MISTRAL = False
            except Exception as e:
                logger.error(f"Error listing Mistral models: {str(e)}")
                # Try a simple chat completion to see if the API works at all
                try:
                    logger.info("Testing Mistral API with a simple chat message...")
                    response = mistral_client.chat(
                        model="mistral-tiny",  # Try with the smallest model
                        messages=[ChatMessage(role="user", content="Hello")],
                    )
                    logger.info("Mistral API works for chat completions but not for listing models")
                except Exception as chat_error:
                    logger.error(f"Error with Mistral chat API: {str(chat_error)}")
                    HAS_MISTRAL = False
        except Exception as e:
            logger.error(f"Error initializing Mistral API: {str(e)}")
            HAS_MISTRAL = False
    else:
        logger.warning("MISTRAL_API_KEY not set or empty")
        HAS_MISTRAL = False
except ImportError:
    HAS_MISTRAL = False
    logger.warning("Mistral Python client not installed. Mistral features will be disabled.")

# Try to import supabase for vector storage
try:
    from supabase import create_client
    HAS_SUPABASE = True
    
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully for RAG")
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client for RAG: {str(e)}")
            supabase_client = None
    else:
        logger.warning("SUPABASE_URL or SUPABASE_KEY not set")
        supabase_client = None
except ImportError:
    HAS_SUPABASE = False
    supabase_client = None
    logger.warning("Supabase Python client not installed. Vector storage will be in-memory only.")

class RAGProcessor:
    """RAG processing class for context-aware question answering"""
    
    def __init__(self):
        """Initialize the RAG processor"""
        # In-memory storage for document chunks and embeddings when Supabase is not available
        self.document_chunks = {}
        self.document_embeddings = {}
        logger.info("Initialized RAGProcessor")
    
    def process_document(self, document_id: str, document_text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> Dict[str, Any]:
        """
        Process a document for RAG by chunking and embedding
        
        Args:
            document_id: Unique identifier for the document
            document_text: Full text of the document
            chunk_size: Size of each chunk in words (default: 500)
            chunk_overlap: Overlap between chunks in words (default: 100)
            
        Returns:
            Dict containing processing results
        """
        logger.info(f"Processing document {document_id} for RAG")
        
        try:
            # Split document into chunks
            chunks = self._chunk_document(document_text, chunk_size, chunk_overlap)
            logger.info(f"Split document into {len(chunks)} chunks")
            
            # Generate embeddings for each chunk
            chunk_ids = []
            if HAS_OPENAI and OPENAI_API_KEY:
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{document_id}_chunk_{i}"
                    embedding = self._generate_embedding_openai(chunk)
                    
                    # Store in Supabase if available, otherwise store in memory
                    if HAS_SUPABASE and supabase_client:
                        self._store_chunk_in_supabase(chunk_id, document_id, chunk, embedding)
                    else:
                        self.document_chunks[chunk_id] = {
                            "document_id": document_id,
                            "chunk_text": chunk,
                            "chunk_index": i
                        }
                        self.document_embeddings[chunk_id] = embedding
                    
                    chunk_ids.append(chunk_id)
                
                logger.info(f"Generated embeddings for {len(chunks)} chunks")
                
                return {
                    "status": "success",
                    "document_id": document_id,
                    "chunk_count": len(chunks),
                    "chunk_ids": chunk_ids
                }
            else:
                logger.warning("OpenAI API key not available for embeddings. Storing chunks without embeddings.")
                # Store chunks without embeddings for basic keyword search fallback
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{document_id}_chunk_{i}"
                    self.document_chunks[chunk_id] = {
                        "document_id": document_id,
                        "chunk_text": chunk,
                        "chunk_index": i
                    }
                    chunk_ids.append(chunk_id)
                
                return {
                    "status": "success",
                    "document_id": document_id,
                    "chunk_count": len(chunks),
                    "chunk_ids": chunk_ids,
                    "warning": "Embeddings not generated due to missing OpenAI API key"
                }
                
        except Exception as e:
            logger.error(f"Error processing document for RAG: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def answer_question(self, question: str, document_id: str, model: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
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
        
        # Verify if the requested model is available
        # We need to be more specific about availability since some models have API keys but aren't working
        model_availability = {
            "gemini": HAS_GENAI and GEMINI_API_KEY,
            "openai": HAS_OPENAI and OPENAI_API_KEY,
            "claude": HAS_ANTHROPIC and ANTHROPIC_API_KEY,  # Claude is working for message completions
            "mistral": False  # Mistral library not properly installed
        }
        
        # Log which models are available
        logger.info(f"Model availability: Gemini={model_availability['gemini']}, OpenAI={model_availability['openai']}, Claude={model_availability['claude']}, Mistral={model_availability['mistral']}")
        
        # If the requested model is not available, log a warning
        if not model_availability.get(model, False):
            logger.warning(f"Selected model {model} not available. Will try alternatives.")
        
        try:
            # Retrieve relevant chunks
            relevant_chunks = self._retrieve_relevant_chunks(question, document_id, top_k=3)
            
            if not relevant_chunks:
                logger.warning(f"No relevant chunks found for question: {question}")
                
                # Try to find the document in memory
                document_text = ""
                for doc_id, chunks in self.document_chunks.items():
                    if doc_id == document_id and chunks:
                        # Use the first chunk as a sample of the document
                        document_text = chunks[0]["chunk_text"]
                        break
                
                if not document_text:
                    return {
                        "status": "error",
                        "error": "No relevant content found in the document to answer this question."
                    }
                
                # Use a generic prompt with the document sample
                fallback_context = f"Document sample: {document_text[:500]}..."
                
                # Try to use the selected model first, then fall back to others if needed
                try:
                    model_used = model  # Track which model is actually used
                    
                    if model == "gemini" and HAS_GENAI and GEMINI_API_KEY:
                        logger.info(f"Using Gemini model for fallback response as selected")
                        answer = self._generate_answer_gemini(question, fallback_context, conversation_history or [])
                    elif model == "openai" and HAS_OPENAI and OPENAI_API_KEY:
                        logger.info(f"Using OpenAI model for fallback response as selected")
                        answer = self._generate_answer_openai(question, fallback_context, conversation_history or [])
                    elif model == "claude" and HAS_ANTHROPIC and ANTHROPIC_API_KEY:
                        logger.info(f"Using Claude model for fallback response as selected")
                        answer = self._generate_answer_claude(question, fallback_context, conversation_history or [])
                    elif model == "mistral" and HAS_MISTRAL and MISTRAL_API_KEY:
                        logger.info(f"Using Mistral model for fallback response as selected")
                        answer = self._generate_answer_mistral(question, fallback_context, conversation_history or [])
                    else:
                        # Change fallback order to prioritize Gemini over OpenAI
                        if model != "gemini" and HAS_GENAI and GEMINI_API_KEY:
                            logger.info("Falling back to Gemini model for fallback response")
                            answer = self._generate_answer_gemini(question, fallback_context, conversation_history or [])
                            model_used = "gemini"
                        elif model != "openai" and HAS_OPENAI and OPENAI_API_KEY:
                            logger.info("Falling back to OpenAI model for fallback response")
                            answer = self._generate_answer_openai(question, fallback_context, conversation_history or [])
                            model_used = "openai"
                        elif model != "claude" and HAS_ANTHROPIC and ANTHROPIC_API_KEY:
                            logger.info("Falling back to Claude model for fallback response")
                            answer = self._generate_answer_claude(question, fallback_context, conversation_history or [])
                            model_used = "claude"
                        elif model != "mistral" and HAS_MISTRAL and MISTRAL_API_KEY:
                            logger.info("Falling back to Mistral model for fallback response")
                            answer = self._generate_answer_mistral(question, fallback_context, conversation_history or [])
                            model_used = "mistral"
                        else:
                            return {
                                "status": "error",
                                "error": "No AI models available for fallback response."
                            }
                    
                    return {
                        "answer": answer,
                        "source_chunks": [],
                        "fallback": True,
                        "message": "Using document sample as no relevant chunks were found.",
                        "model_used": model_used
                    }
                    
                except Exception as e:
                    logger.error(f"Error generating fallback answer: {str(e)}")
                    return {
                        "status": "error",
                        "error": f"Failed to generate fallback answer: {str(e)}"
                    }
            
            # Combine chunks into context
            context = "\n\n".join([chunk["chunk_text"] for chunk in relevant_chunks])
            
            # Process conversation history
            processed_history = []
            if conversation_history:
                for msg in conversation_history:
                    processed_history.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            
            # Define the order of models to try based on availability
            available_models = []
            
            # First try the selected model if it's available
            if model in model_availability and model_availability[model]:
                available_models.append(model)
            
            # Then add all other available models in a preferred order
            fallback_order = ["gemini", "openai", "claude", "mistral"]
            for fallback_model in fallback_order:
                if fallback_model != model and fallback_model in model_availability and model_availability[fallback_model]:
                    available_models.append(fallback_model)
            
            if not available_models:
                return {
                    "status": "error",
                    "error": "No AI models available for generating responses."
                }
            
            # Try each model in order until one works
            last_error = None
            for current_model in available_models:
                try:
                    if current_model == "gemini":
                        if current_model == model:
                            logger.info(f"Using Gemini model for RAG response as selected")
                        else:
                            logger.info(f"Falling back to Gemini model for RAG response")
                        answer = self._generate_answer_gemini(question, context, processed_history)
                        return {
                            "status": "success",
                            "answer": answer,
                            "model_used": "gemini",
                            "source_chunks": relevant_chunks
                        }
                    elif current_model == "openai":
                        if current_model == model:
                            logger.info(f"Using OpenAI model for RAG response as selected")
                        else:
                            logger.info(f"Falling back to OpenAI model for RAG response")
                        answer = self._generate_answer_openai(question, context, processed_history)
                        return {
                            "status": "success",
                            "answer": answer,
                            "model_used": "openai",
                            "source_chunks": relevant_chunks
                        }
                    elif current_model == "claude":
                        if current_model == model:
                            logger.info(f"Using Claude model for RAG response as selected")
                        else:
                            logger.info(f"Falling back to Claude model for RAG response")
                        answer = self._generate_answer_claude(question, context, processed_history)
                        return {
                            "status": "success",
                            "answer": answer,
                            "model_used": "claude",
                            "source_chunks": relevant_chunks
                        }
                    elif current_model == "mistral":
                        if current_model == model:
                            logger.info(f"Using Mistral model for RAG response as selected")
                        else:
                            logger.info(f"Falling back to Mistral model for RAG response")
                        answer = self._generate_answer_mistral(question, context, processed_history)
                        return {
                            "status": "success",
                            "answer": answer,
                            "model_used": "mistral",
                            "source_chunks": relevant_chunks
                        }
                except Exception as e:
                    logger.error(f"Error with {current_model} model: {str(e)}")
                    last_error = e
                    continue
            
            # If we get here, all models failed
            return {
                "status": "error",
                "error": f"Error generating answer with all available models. Last error: {str(last_error)}"
            }
            
            # Extract source information for citations
            sources = []
            for chunk in relevant_chunks:
                sources.append({
                    "chunk_id": chunk.get("id", "unknown"),
                    "chunk_index": chunk.get("chunk_index", 0),
                    "text_preview": chunk["chunk_text"][:200] + "..." if len(chunk["chunk_text"]) > 200 else chunk["chunk_text"]
                })
            
            return {
                "status": "success",
                "answer": answer,
                "sources": sources
            }
            
        except Exception as e:
            logger.error(f"Error answering question with RAG: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _chunk_document(self, text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
        """
        Split document into overlapping chunks
        
        Args:
            text: Document text
            chunk_size: Size of each chunk in words
            chunk_overlap: Overlap between chunks in words
            
        Returns:
            List of text chunks
        """
        words = text.split()
        chunks = []
        
        if len(words) <= chunk_size:
            chunks.append(text)
        else:
            i = 0
            while i < len(words):
                chunk = " ".join(words[i:i + chunk_size])
                chunks.append(chunk)
                i += chunk_size - chunk_overlap
        
        return chunks
    
    def _generate_embedding_openai(self, text: str) -> List[float]:
        """
        Generate embedding for text using OpenAI
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        if not HAS_OPENAI or not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not available for embeddings")
        
        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        
        return response.data[0].embedding
    
    def _store_chunk_in_supabase(self, chunk_id: str, document_id: str, chunk_text: str, embedding: List[float]) -> None:
        """
        Store chunk and embedding in Supabase
        
        Args:
            chunk_id: Unique ID for the chunk
            document_id: ID of the parent document
            chunk_text: Text content of the chunk
            embedding: Vector embedding
        """
        if not HAS_SUPABASE or not supabase_client:
            raise ValueError("Supabase client not available")
        
        try:
            supabase_client.table("document_chunks").insert({
                "id": chunk_id,
                "document_id": document_id,
                "chunk_text": chunk_text,
                "embedding": embedding
            }).execute()
            
            logger.info(f"Stored chunk {chunk_id} in Supabase")
        except Exception as e:
            logger.error(f"Error storing chunk in Supabase: {str(e)}", exc_info=True)
            raise
    
    def _retrieve_relevant_chunks(self, query: str, document_id: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve relevant chunks for a query
        
        Args:
            query: User's question
            document_id: ID of the document to search in
            top_k: Number of top chunks to retrieve
            
        Returns:
            List of relevant chunks with metadata
        """
        # If OpenAI is available, use vector search
        if HAS_OPENAI and OPENAI_API_KEY:
            query_embedding = self._generate_embedding_openai(query)
            
            # If Supabase is available, use vector search in database
            if HAS_SUPABASE and supabase_client:
                try:
                    # Perform vector search in Supabase
                    response = supabase_client.rpc(
                        "match_document_chunks",
                        {
                            "query_embedding": query_embedding,
                            "match_document_id": document_id,
                            "match_count": top_k
                        }
                    ).execute()
                    
                    if response.data:
                        return response.data
                    else:
                        logger.warning(f"No chunks found in Supabase for document {document_id}")
                        return []
                except Exception as e:
                    logger.error(f"Error performing vector search in Supabase: {str(e)}", exc_info=True)
                    # Fall back to in-memory search
                    logger.info("Falling back to in-memory vector search")
            
            # In-memory vector search
            document_chunks = [chunk for chunk_id, chunk in self.document_chunks.items() 
                              if chunk["document_id"] == document_id]
            
            if not document_chunks:
                logger.warning(f"No chunks found in memory for document {document_id}")
                return []
            
            # Calculate cosine similarity
            similarities = []
            for chunk_id, chunk in self.document_chunks.items():
                if chunk["document_id"] == document_id:
                    if chunk_id in self.document_embeddings:
                        chunk_embedding = self.document_embeddings[chunk_id]
                        similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                        similarities.append((chunk_id, similarity))
            
            # Sort by similarity and get top_k
            similarities.sort(key=lambda x: x[1], reverse=True)
            top_chunk_ids = [chunk_id for chunk_id, _ in similarities[:top_k]]
            
            # Get chunk data
            result = []
            for chunk_id in top_chunk_ids:
                chunk_data = self.document_chunks[chunk_id].copy()
                chunk_data["id"] = chunk_id
                result.append(chunk_data)
            
            return result
        
        # Fallback to keyword search if embeddings are not available
        else:
            logger.warning("Falling back to basic keyword search (no embeddings available)")
            document_chunks = [chunk for chunk_id, chunk in self.document_chunks.items() 
                              if chunk["document_id"] == document_id]
            
            if not document_chunks:
                logger.warning(f"No chunks found for document {document_id}")
                return []
            
            # Simple keyword matching
            query_words = set(query.lower().split())
            chunk_scores = []
            
            for chunk_id, chunk in self.document_chunks.items():
                if chunk["document_id"] == document_id:
                    chunk_text = chunk["chunk_text"].lower()
                    score = sum(1 for word in query_words if word in chunk_text)
                    chunk_scores.append((chunk_id, score))
            
            # Sort by score and get top_k
            chunk_scores.sort(key=lambda x: x[1], reverse=True)
            top_chunk_ids = [chunk_id for chunk_id, _ in chunk_scores[:top_k]]
            
            # Get chunk data
            result = []
            for chunk_id in top_chunk_ids:
                chunk_data = self.document_chunks[chunk_id].copy()
                chunk_data["id"] = chunk_id
                result.append(chunk_data)
            
            return result
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score
        """
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)
        
        if norm_vec1 == 0 or norm_vec2 == 0:
            return 0
        
        return dot_product / (norm_vec1 * norm_vec2)
    
    def _generate_answer_gemini(self, question: str, context: str, conversation_history: List[Dict[str, str]]) -> str:
        """
        Generate answer using Gemini
        
        Args:
            question: User's question
            context: Retrieved context
            conversation_history: Previous conversation messages
            
        Returns:
            Generated answer
        """
        if not HAS_GENAI or not GEMINI_API_KEY:
            raise ValueError("Gemini API key not available")
        
        try:
            # Create system prompt with context
            system_prompt = f"""You are an AI research assistant helping with scientific documents. 
Use ONLY the following context to answer the question. If you don't know the answer based on the context, say so.
Do not make up information or use your training data.

CONTEXT:
{context}

Answer the question based only on the provided context."""
            
            # Find available models and filter out deprecated ones
            all_models = genai.list_models()
            available_models = []
            for m in all_models:
                if 'generateContent' in m.supported_generation_methods:
                    # Skip deprecated models
                    if 'vision' in m.name.lower() or '1.0' in m.name:
                        logger.debug(f"Skipping deprecated model: {m.name}")
                        continue
                    available_models.append(m.name)
            
            logger.info(f"Available Gemini models: {available_models}")
            
            # Try to use gemini-1.5-flash or other 1.5 models
            preferred_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-pro-latest']
            model_name = None
            
            # Find the first available preferred model
            for preferred in preferred_models:
                for available in available_models:
                    if preferred in available:
                        model_name = available
                        logger.info(f"Selected Gemini model: {model_name}")
                        break
                if model_name:
                    break
            
            # If no preferred model is available, use the first available model
            if not model_name and available_models:
                model_name = available_models[0]
                logger.info(f"Using alternative Gemini model: {model_name}")
            elif not model_name:
                raise ValueError("No suitable Gemini models available")
            
            # Create Gemini model
            model = genai.GenerativeModel(model_name)
            
            # Prepare the conversation
            if conversation_history:
                # Convert conversation history to Gemini format
                gemini_messages = []
                # Add system prompt as first message
                gemini_messages.append({"role": "user", "parts": [{"text": system_prompt}]})
                gemini_messages.append({"role": "model", "parts": [{"text": "I'll help you answer questions based only on the provided context."}]})
                
                # Add conversation history
                for msg in conversation_history:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_messages.append({"role": role, "parts": [{"text": msg["content"]}]})
                
                # Start a chat session
                chat = model.start_chat(history=gemini_messages)
                # Send the current question
                response = chat.send_message(question)
            else:
                # Without conversation history, just use the prompt and question
                prompt = f"{system_prompt}\n\nQuestion: {question}"
                response = model.generate_content(prompt)
            
            # Extract the response text
            if hasattr(response, 'text'):
                return response.text
            elif hasattr(response, 'parts'):
                return response.parts[0].text
            else:
                return str(response)
                
        except Exception as e:
            logger.error(f"Error with Gemini model: {str(e)}")
            raise ValueError(f"Failed to generate response with Gemini: {str(e)}")
    
    def _generate_answer_openai(self, question: str, context: str, conversation_history: List[Dict[str, str]]) -> str:
        """
        Generate answer using OpenAI
        
        Args:
            question: User's question
            context: Retrieved context
            conversation_history: Previous conversation messages
            
        Returns:
            Generated answer
        """
        if not HAS_OPENAI or not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not available")
        
        # Create system prompt with context
        system_prompt = f"""You are an AI research assistant helping with scientific documents. 
Use ONLY the following context to answer the question. If you don't know the answer based on the context, say so.
Do not make up information or use your training data.

CONTEXT:
{context}"""
        
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current question
        messages.append({"role": "user", "content": question})
        
        # Generate response
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.3,
            max_tokens=800
        )
        
        return response.choices[0].message.content
    
    def _generate_answer_claude(self, question: str, context: str, conversation_history: List[Dict[str, str]]) -> str:
        """
        Generate answer using Claude
        
        Args:
            question: User's question
            context: Retrieved context
            conversation_history: Previous conversation messages
            
        Returns:
            Generated answer
        """
        if not HAS_ANTHROPIC or not ANTHROPIC_API_KEY:
            raise ValueError("Claude API key not available")
        
        try:
            # Create system prompt with context
            system_prompt = f"""You are an AI research assistant helping with scientific documents. 
Use ONLY the following context to answer the question. If you don't know the answer based on the context, say so.
Do not make up information or use your training data.

CONTEXT:
{context}"""
            
            # Use a fixed model name since we can't reliably list models
            model_name = 'claude-3-haiku-20240307'  # Use a reliable model
            logger.info(f"Using Claude model: {model_name}")
            
            # Prepare messages in the correct format for Claude API
            messages = []
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history:
                    if msg["role"] in ["user", "assistant"]:
                        role = "user" if msg["role"] == "user" else "assistant"
                        messages.append({"role": role, "content": msg["content"]})
            
            # Add current question
            messages.append({"role": "user", "content": question})
            
            # Create a new client for each request to avoid session issues
            try:
                # Use the API key exactly as provided in the environment variable
                # Claude API keys should be used with their full format (including sk-ant- prefix)
                client = Anthropic(api_key=ANTHROPIC_API_KEY.strip())
                
                # Generate response
                response = client.messages.create(
                    model=model_name,
                    system=system_prompt,  # Pass system prompt as a separate parameter
                    messages=messages,
                    max_tokens=800
                )
                
                # Extract the response text
                if hasattr(response, 'content') and len(response.content) > 0:
                    if hasattr(response.content[0], 'text'):
                        return response.content[0].text
                    else:
                        return str(response.content[0])
                else:
                    return "I couldn't generate an answer based on the provided context."
            except Exception as client_error:
                logger.error(f"Error with Claude client: {str(client_error)}")
                # Don't try to modify the API key - just report the error
                raise ValueError(f"Failed to generate response with Claude: {str(client_error)}")
                
        except Exception as e:
            logger.error(f"Error with Claude model: {str(e)}")
            raise ValueError(f"Failed to generate response with Claude: {str(e)}")
    
    def _generate_answer_mistral(self, question: str, context: str, conversation_history: List[Dict[str, str]]) -> str:
        """
        Generate answer using Mistral
        
        Args:
            question: User's question
            context: Retrieved context
            conversation_history: Previous conversation messages
            
        Returns:
            Generated answer
        """
        if not HAS_MISTRAL or not MISTRAL_API_KEY:
            raise ValueError("Mistral API key not available")
        
        try:
            # Create system prompt with context
            system_prompt = f"""You are an AI research assistant helping with scientific documents. 
Use ONLY the following context to answer the question. If you don't know the answer based on the context, say so.
Do not make up information or use your training data.

CONTEXT:
{context}"""
            
            # Use a fixed model name since we can't reliably list models
            model_name = 'mistral-small'  # Use a reliable model
            logger.info(f"Using Mistral model: {model_name}")
            
            # Convert messages to Mistral format
            from mistralai.models.chat_completion import ChatMessage
            
            # Create the system message
            messages = [ChatMessage(role="system", content=system_prompt)]
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history:
                    if msg["role"] in ["user", "assistant"]:
                        role = "user" if msg["role"] == "user" else "assistant"
                        messages.append(ChatMessage(role=role, content=msg["content"]))
            
            # Add current question
            messages.append(ChatMessage(role="user", content=question))
            
            # Create a new client for each request to avoid session issues
            try:
                # Try with a new client instance
                client = MistralClient(
                    api_key=MISTRAL_API_KEY.strip(),
                    endpoint="https://api.mistral.ai"
                )
                
                # Generate response
                response = client.chat(
                    model=model_name,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=800
                )
                
                # Extract the response text
                if hasattr(response, 'choices') and len(response.choices) > 0:
                    if hasattr(response.choices[0], 'message') and hasattr(response.choices[0].message, 'content'):
                        return response.choices[0].message.content
                    else:
                        return str(response.choices[0])
                else:
                    return "I couldn't generate an answer based on the provided context."
            except Exception as client_error:
                logger.error(f"Error with Mistral client: {str(client_error)}")
                
                # Try with alternative models
                for alt_model in ['mistral-tiny', 'open-mistral-7b', 'open-mixtral-8x7b']:
                    try:
                        logger.info(f"Trying alternative Mistral model: {alt_model}")
                        client = MistralClient(
                            api_key=MISTRAL_API_KEY.strip(),
                            endpoint="https://api.mistral.ai"
                        )
                        
                        response = client.chat(
                            model=alt_model,
                            messages=messages,
                            temperature=0.3,
                            max_tokens=800
                        )
                        
                        # Extract the response text
                        if hasattr(response, 'choices') and len(response.choices) > 0:
                            if hasattr(response.choices[0], 'message') and hasattr(response.choices[0].message, 'content'):
                                return response.choices[0].message.content
                            else:
                                return str(response.choices[0])
                    except Exception as alt_error:
                        logger.error(f"Error with alternative Mistral model {alt_model}: {str(alt_error)}")
                        continue
                
                # If all attempts fail, raise the original error
                raise ValueError(f"Failed to generate response with any Mistral model: {str(client_error)}")
                
        except Exception as e:
            logger.error(f"Error with Mistral model: {str(e)}")
            raise ValueError(f"Failed to generate response with Mistral: {str(e)}")
