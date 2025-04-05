"""
Real-time Text Extraction API
Provides endpoints for extracting text from images in real-time
"""

import os
import sys
import json
import base64
import logging
import tempfile
from typing import Dict, Any, Optional, List, Union
from fastapi import APIRouter, HTTPException, Body, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import cv2
from PIL import Image
import io

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.text_extraction import extract_text_from_image, preprocess_text
from models.ai_summarizer import (
    summarize_with_gemini,
    summarize_with_openai,
    summarize_with_claude,
    summarize_with_mistral
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

class Base64ImageRequest(BaseModel):
    image: str
    model: str = "gemini"  # Default model
    options: Dict[str, Any] = {}

@router.post("/extract-text-from-base64")
async def extract_text_from_base64(request: Base64ImageRequest):
    """
    Extract text from a base64-encoded image
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image.split(',')[1] if ',' in request.image else request.image)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_data)
            temp_file_path = temp_file.name
        
        # Extract text
        try:
            extracted_text = extract_text_from_image(temp_file_path)
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                return JSONResponse({
                    "status": "warning",
                    "message": "No text detected in the image",
                    "text": "",
                    "summary": ""
                })
            
            # Preprocess text
            processed_text = preprocess_text(extracted_text)
            
            # Generate summary if text was extracted
            summary = ""
            if processed_text and len(processed_text) > 50:
                # Select the appropriate model
                model = request.model.lower()
                
                if model == "gemini":
                    summary = summarize_with_gemini(processed_text, request.options)
                elif model == "openai":
                    summary = summarize_with_openai(processed_text, request.options)
                elif model == "claude":
                    summary = summarize_with_claude(processed_text, request.options)
                elif model == "mistral":
                    summary = summarize_with_mistral(processed_text, request.options)
                else:
                    # Default to Gemini
                    summary = summarize_with_gemini(processed_text, request.options)
            
            return JSONResponse({
                "status": "success",
                "text": processed_text,
                "summary": summary,
                "word_count": len(processed_text.split())
            })
            
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            # Clean up temporary file if it exists
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            
            return JSONResponse({
                "status": "error",
                "message": f"Error extracting text: {str(e)}",
                "text": "",
                "summary": ""
            }, status_code=500)
            
    except Exception as e:
        logger.error(f"Error processing base64 image: {str(e)}", exc_info=True)
        return JSONResponse({
            "status": "error",
            "message": f"Error processing image: {str(e)}",
            "text": "",
            "summary": ""
        }, status_code=400)

@router.post("/enhance-image")
async def enhance_image(file: UploadFile = File(...)):
    """
    Enhance an image for better text extraction
    """
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Image enhancement pipeline
        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # 3. Noise removal
        kernel = np.ones((1, 1), np.uint8)
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        # 4. Edge enhancement
        edges = cv2.Canny(opening, 50, 150)
        
        # 5. Combine with original
        enhanced = cv2.bitwise_and(gray, gray, mask=edges)
        
        # Convert back to PIL Image
        enhanced_img = Image.fromarray(enhanced)
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        enhanced_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Return base64 encoded image
        encoded_img = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        
        return JSONResponse({
            "status": "success",
            "enhanced_image": f"data:image/png;base64,{encoded_img}"
        })
        
    except Exception as e:
        logger.error(f"Error enhancing image: {str(e)}", exc_info=True)
        return JSONResponse({
            "status": "error",
            "message": f"Error enhancing image: {str(e)}"
        }, status_code=500)

@router.post("/real-time-analysis")
async def real_time_analysis(request: Base64ImageRequest):
    """
    Perform real-time analysis on a document image
    This combines text extraction, preprocessing, and AI analysis
    """
    try:
        # Extract text from image
        text_response = await extract_text_from_base64(request)
        text_data = json.loads(text_response.body)
        
        if text_data["status"] == "error":
            return text_response
        
        # If no text was detected, return early
        if not text_data["text"]:
            return JSONResponse({
                "status": "warning",
                "message": "No text detected in the image",
                "analysis": {
                    "summary": "",
                    "key_points": [],
                    "entities": [],
                    "sentiment": "",
                    "topics": []
                }
            })
        
        # Perform advanced analysis
        extracted_text = text_data["text"]
        
        # Initialize analysis results
        analysis = {
            "summary": text_data["summary"],
            "key_points": [],
            "entities": [],
            "sentiment": "neutral",
            "topics": []
        }
        
        # Extract key points (simplified implementation)
        sentences = extracted_text.split('.')
        key_points = [s.strip() for s in sentences if len(s.strip()) > 30][:5]
        analysis["key_points"] = key_points
        
        # Extract potential entities (simplified implementation)
        words = extracted_text.split()
        potential_entities = [word for word in words if word[0].isupper() and len(word) > 3]
        unique_entities = list(set(potential_entities))[:10]
        analysis["entities"] = unique_entities
        
        # Simple topic extraction (word frequency)
        word_freq = {}
        for word in words:
            if len(word) > 4:
                word = word.lower()
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top topics
        topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        analysis["topics"] = [topic[0] for topic in topics]
        
        return JSONResponse({
            "status": "success",
            "text": extracted_text,
            "analysis": analysis,
            "word_count": len(extracted_text.split())
        })
        
    except Exception as e:
        logger.error(f"Error in real-time analysis: {str(e)}", exc_info=True)
        return JSONResponse({
            "status": "error",
            "message": f"Error in real-time analysis: {str(e)}",
            "analysis": {
                "summary": "",
                "key_points": [],
                "entities": [],
                "sentiment": "",
                "topics": []
            }
        }, status_code=500)
