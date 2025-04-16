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
from pydantic import BaseModel, Field
from fastapi import Depends

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.text_extraction import extract_text_from_image, preprocess_text
from models.ai_summarizer import (
    summarize_text,
    summarize_with_gemini,
    summarize_with_openai,
    summarize_with_claude,
    summarize_with_mistral,
    clean_text
)

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# Define request and response models
class Base64ImageRequest(BaseModel):
    """Request model for real-time image analysis"""
    image: str
    model: str
    options: Dict[str, Any] = {}
    userId: Optional[str] = None
    subscription: Optional[str] = "free"  # Default subscription tier
    subscription_tier: Optional[str] = None  # Added for compatibility with upload page

def get_language_name(language_code: str) -> str:
    """
    Get the full language name from a language code
    
    Args:
        language_code: ISO language code (e.g., 'en', 'fr', 'es')
        
    Returns:
        Full language name (e.g., 'English', 'French', 'Spanish')
    """
    language_map = {
        'en': 'English',
        'fr': 'French',
        'es': 'Spanish',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'nl': 'Dutch',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'pa': 'Punjabi',
        'ta': 'Tamil',
        'te': 'Telugu',
        'mr': 'Marathi',
        'gu': 'Gujarati',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'or': 'Odia',
        'vi': 'Vietnamese',
        'th': 'Thai',
        'id': 'Indonesian',
        'ms': 'Malay',
        'tr': 'Turkish',
        'pl': 'Polish',
        'uk': 'Ukrainian',
        'cs': 'Czech',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'da': 'Danish',
        'fi': 'Finnish',
        'hu': 'Hungarian',
        'ro': 'Romanian',
        'bg': 'Bulgarian',
        'el': 'Greek',
        'he': 'Hebrew',
        'fa': 'Persian',
        'ur': 'Urdu',
        'ne': 'Nepali',
        'si': 'Sinhala',
        'my': 'Burmese',
        'km': 'Khmer',
        'lo': 'Lao',
        'am': 'Amharic',
        'sw': 'Swahili',
        'yo': 'Yoruba',
        'ig': 'Igbo',
        'ha': 'Hausa',
        'zu': 'Zulu',
        'xh': 'Xhosa',
        'af': 'Afrikaans'
    }
    
    return language_map.get(language_code, 'English')

def check_subscription_access(model: str, subscription: str) -> bool:
    """
    Check if the user has access to the requested model based on their subscription
    
    Args:
        model: The requested AI model
        subscription: User's subscription tier
        
    Returns:
        Boolean indicating whether the user has access
    """
    # Define model access by subscription tier
    subscription_tiers = {
        "free": ["gemini"],
        "basic": ["gemini"],
        "silver": ["gemini", "openai", "mistral"],
        "gold": ["gemini", "openai", "mistral", "claude"],
        "premium": ["gemini", "mistral", "openai"],
        "enterprise": ["gemini", "mistral", "openai", "claude"]
    }
    
    # Get allowed models for the subscription tier
    allowed_models = subscription_tiers.get(subscription.lower(), ["gemini"])
    
    # Log the subscription check
    logger.info(f"Checking access for model {model} with subscription {subscription}")
    logger.info(f"Allowed models for {subscription}: {allowed_models}")
    
    # Check if the requested model is allowed
    return model.lower() in allowed_models

def get_fallback_model(subscription: str) -> str:
    """
    Get the best available model for the user's subscription tier
    
    Args:
        subscription: User's subscription tier
        
    Returns:
        Name of the best available model
    """
    subscription_models = {
        "free": "gemini",
        "basic": "mistral",
        "silver": "openai",
        "gold": "claude",
        "premium": "openai",
        "enterprise": "claude"
    }
    
    return subscription_models.get(subscription.lower(), "gemini")

@router.post("/extract-text-from-base64")
async def extract_text_from_base64(request: Base64ImageRequest):
    """
    Extract text from a base64-encoded image
    """
    try:
        # Check subscription access
        if not check_subscription_access(request.model, request.subscription):
            return JSONResponse({
                "status": "error",
                "message": f"Model '{request.model}' is not available for your subscription tier",
                "text": "",
                "summary": ""
            }, status_code=403)
        
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

@router.post("/realtime-extract")
async def realtime_extract(request: Base64ImageRequest):
    """
    Endpoint for real-time extraction from the camera page
    This is an alias for real_time_analysis to maintain compatibility with frontend
    """
    logger.info(f"Received request to /realtime-extract with model: {request.model}")
    logger.info(f"Subscription tier: {request.subscription}")
    logger.info(f"Options: {request.options}")
    
    # Force the model to be the one requested by the client, if it's allowed
    # This is a workaround for the model selection issue
    subscription = request.subscription_tier or request.subscription
    subscription = subscription.lower() if subscription else "free"
    requested_model = request.model.lower()
    
    # Log the requested model and subscription
    logger.info(f"Requested model: {requested_model}")
    logger.info(f"Subscription: {subscription}")
    
    # Check if the model is allowed for the subscription
    allowed = check_subscription_access(requested_model, subscription)
    logger.info(f"Model {requested_model} allowed for subscription {subscription}: {allowed}")
    
    # Create a copy of the request to avoid modifying the original
    modified_request = Base64ImageRequest(
        image=request.image,
        model=request.model,
        options=request.options,
        userId=request.userId,
        subscription=request.subscription,
        subscription_tier=request.subscription_tier
    )
    
    return await real_time_analysis(modified_request)

@router.post("/real-time-analysis")
async def real_time_analysis(request: Base64ImageRequest):
    """
    Perform real-time analysis on a document image
    This directly sends the image to AI models for analysis without OCR extraction
    """
    try:
        # Check subscription access - prioritize subscription_tier over subscription for compatibility
        subscription = request.subscription_tier or request.subscription
        subscription = subscription.lower() if subscription else "free"
        requested_model = request.model.lower()
        
        logger.info(f"Processing real-time analysis with requested model: {requested_model}")
        logger.info(f"User subscription tier: {subscription}")
        logger.info(f"Allowed models for this tier: {check_subscription_access(requested_model, subscription)}")
        
        # Override subscription check for testing/development - REMOVE IN PRODUCTION
        # This allows all models to be used regardless of subscription tier
        allow_all_models = False  # Set to False in production
        
        if allow_all_models:
            logger.info(f"Allowing access to {requested_model} model regardless of subscription tier")
            model = requested_model
        else:
            if not check_subscription_access(requested_model, subscription):
                fallback_model = get_fallback_model(subscription)
                logger.warning(f"User with {subscription} subscription requested {requested_model} model, using {fallback_model} instead")
                model = fallback_model
            else:
                logger.info(f"User has access to requested model {requested_model}, proceeding")
                model = requested_model
            
        logger.info(f"Processing with {model} model based on {subscription} subscription")
        
        # Decode base64 image
        image_data = base64.b64decode(request.image.split(',')[1] if ',' in request.image else request.image)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_data)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing image for real-time analysis: {temp_file_path}")
        
        try:
            # Prepare summarization options
            summarization_options = {
                "length": request.options.get("length", "medium"),
                "style": request.options.get("style", "academic"),
                "focus": request.options.get("focus", "comprehensive"),
                "language": request.options.get("language", "en"),
                "min_length": 100,  # Ensure we get a meaningful summary
                "force_summary": True,  # Always generate a summary even for short texts
                "is_realtime": True,  # Flag to indicate this is from the video page
                "is_direct_image": True,  # Flag to indicate we're sending the image directly
                "subscription_tier": subscription  # Pass subscription tier to the model
            }
            
            logger.info(f"Sending image directly to {model} model for analysis")
            
            # Process the image with the selected AI model
            summary_result = await process_image_with_ai(temp_file_path, model, summarization_options, subscription)
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            # Clean the summary text to remove special characters
            summary = clean_text(summary_result["summary"], summarization_options)
            
            logger.info(f"Generated summary with {len(summary.split())} words")
            
            # Create a response
            return JSONResponse({
                "status": "success",
                "message": "Image analyzed successfully",
                "text": "",  # We don't return extracted text since we're going directly to AI
                "analysis": {
                    "summary": summary,
                    "key_points": [],  # Not implemented for direct image analysis
                    "entities": [],    # Not implemented for direct image analysis
                    "sentiment": "",   # Not implemented for direct image analysis
                    "topics": []       # Not implemented for direct image analysis
                }
            })
            
        except Exception as e:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            
            logger.error(f"Error processing image: {str(e)}")
            return JSONResponse({
                "status": "error",
                "message": f"Error processing image: {str(e)}",
                "text": "",
                "analysis": {
                    "summary": "",
                    "key_points": [],
                    "entities": [],
                    "sentiment": "",
                    "topics": []
                }
            }, status_code=500)
            
    except Exception as e:
        logger.error(f"Error in real-time analysis: {str(e)}")
        return JSONResponse({
            "status": "error",
            "message": f"Error in real-time analysis: {str(e)}",
            "text": "",
            "analysis": {
                "summary": "",
                "key_points": [],
                "entities": [],
                "sentiment": "",
                "topics": []
            }
        }, status_code=500)

async def process_image_with_ai(image_path: str, model: str, options: Dict, subscription: str = "free") -> Dict:
    """
    Process an image directly with AI models without OCR extraction
    
    Args:
        image_path: Path to the image file
        model: AI model to use (gemini, openai, claude, mistral)
        options: Processing options
        subscription: User's subscription tier
        
    Returns:
        Dictionary with summary and other analysis results
    """
    # Validate model selection and check subscription access
    valid_models = ["gemini", "openai", "claude", "mistral"]
    
    # Log the requested model for debugging
    logger.info(f"Processing image with requested model: {model}")
    
    if model.lower() not in valid_models:
        logger.warning(f"Invalid model '{model}', defaulting to subscription-based model")
        model = get_fallback_model(subscription)
    else:
        # Ensure we're using lowercase for consistency
        model = model.lower()
    
    # Ensure the user has access to the requested model
    if not check_subscription_access(model, subscription):
        fallback = get_fallback_model(subscription)
        logger.warning(f"User with {subscription} subscription requested {model} model, using fallback {fallback}")
        model = fallback
    
    # Log the final model being used
    logger.info(f"Final model selected for processing: {model}")
    
    # Process based on model type
    if model == "gemini":
        return await process_image_with_gemini(image_path, options)
    elif model == "openai":
        return await process_image_with_openai(image_path, options)
    elif model == "claude":
        return await process_image_with_claude(image_path, options)
    elif model == "mistral":
        return await process_image_with_mistral(image_path, options)
    else:
        # Default to Gemini as fallback
        logger.warning(f"Unsupported model '{model}', using gemini as fallback")
        return await process_image_with_gemini(image_path, options)

async def process_image_with_gemini(image_path: str, options: Dict) -> Dict:
    """Process image with Gemini Vision model"""
    try:
        # Import Gemini libraries
        import google.generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        
        # Configure the Gemini API
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Set up the model
        generation_config = {
            "temperature": 0.4,
            "top_p": 0.95,
            "top_k": 0,
            "max_output_tokens": 2048,
        }
        
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
        
        # Initialize the model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Read the image
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Generate prompt for image analysis
        prompt = generate_image_prompt(options)
        
        # Create the content parts
        content_parts = [prompt, {"mime_type": "image/jpeg", "data": image_data}]
        
        # Generate response
        response = model.generate_content(content_parts)
        
        # Extract the summary
        summary = response.text
        
        return {
            "summary": summary,
            "model": "gemini-2.0-flash"
        }
    except Exception as e:
        logger.error(f"Error processing image with Gemini: {str(e)}")
        raise Exception(f"Gemini processing failed: {str(e)}")

async def process_image_with_openai(image_path: str, options: Dict) -> Dict:
    """Process image with OpenAI GPT-4 Vision model"""
    try:
        # Import OpenAI library
        from openai import OpenAI
        import base64
        
        # Initialize the client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Read and encode the image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Generate prompt for image analysis
        prompt = generate_image_prompt(options)
        
        # Create the API request
        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500
        )
        
        # Extract the summary
        summary = response.choices[0].message.content
        
        return {
            "summary": summary,
            "model": "gpt-4-vision"
        }
    except Exception as e:
        logger.error(f"Error processing image with OpenAI: {str(e)}")
        raise Exception(f"OpenAI processing failed: {str(e)}")

async def process_image_with_claude(image_path: str, options: Dict) -> Dict:
    """Process image with Anthropic Claude model"""
    try:
        # Import Anthropic library
        import anthropic
        import base64
        
        # Initialize the client
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        # Read and encode the image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Generate prompt for image analysis
        prompt = generate_image_prompt(options)
        
        # Create the API request
        message = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }
            ]
        )
        
        # Extract the summary
        summary = message.content[0].text
        
        return {
            "summary": summary,
            "model": "claude-3-opus"
        }
    except Exception as e:
        logger.error(f"Error processing image with Claude: {str(e)}")
        raise Exception(f"Claude processing failed: {str(e)}")

async def process_image_with_mistral(image_path: str, options: Dict) -> Dict:
    """Process image with Mistral model"""
    try:
        # Import Mistral library
        from mistralai.client import MistralClient
        from mistralai.models.chat_completion import ChatMessage
        import base64
        
        # Initialize the client
        client = MistralClient(api_key=os.getenv("MISTRAL_API_KEY"))
        
        # Read and encode the image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Generate prompt for image analysis
        prompt = generate_image_prompt(options)
        
        # Create the API request
        messages = [
            ChatMessage(role="user", content=[
                {"type": "text", "text": prompt},
                {"type": "image", "data": f"data:image/jpeg;base64,{base64_image}"}
            ])
        ]
        
        # Call the Mistral API
        chat_response = client.chat(
            model="mistral-large-latest",
            messages=messages,
            max_tokens=1000
        )
        
        # Extract the summary
        summary = chat_response.choices[0].message.content
        
        return {
            "summary": summary,
            "model": "mistral-large"
        }
    except Exception as e:
        logger.error(f"Error processing image with Mistral: {str(e)}")
        raise Exception(f"Mistral processing failed: {str(e)}")

def generate_image_prompt(options: Dict) -> str:
    """
    Generate a prompt for AI image analysis
    
    Args:
        options: Processing options
        
    Returns:
        Prompt string for the AI model
    """
    length = options.get('length', 'medium')
    style = options.get('style', 'paragraph')
    focus = options.get('focus', 'comprehensive')
    language = options.get('language', 'en')
    
    language_name = get_language_name(language)
    length_map = {
        'short': 'concise (approximately 150-250 words)',
        'medium': 'moderate length (approximately 400-600 words)',
        'long': 'detailed and extensive (approximately 1000-1500 words)'
    }
    style_map = {
        'bullet': 'organized bullet points with clear sections and subsections',
        'paragraph': 'well-structured paragraphs with clear transitions and sections'
    }
    focus_map = {
        'comprehensive': 'all key aspects and important details of the document',
        'methods': 'processes, procedures, methods, or technical details',
        'results': 'outcomes, achievements, findings, or key points',
        'conclusions': 'conclusions, implications, or final takeaways'
    }
    
    language_instruction = (
        f"IMPORTANT: Write the ENTIRE summary in {language_name} language. Do NOT use English at all, "
        f"translate everything including headers and technical terms to {language_name}."
    ) if language != 'en' else ""
    
    # Common formatting instructions
    formatting_instructions = """
Format your summary with clear structure and organization. Use plain text formatting.

For headers:
- Use # for main headers with a space after the # (e.g., "# Main Header")
- Use ## for subheaders with a space after the ## (e.g., "## Subheader")

For emphasis:
- Use ** for bold text (e.g., **important term**)
- Use _ for italic text (e.g., _emphasized point_)

For lists:
- Use - followed by a space for bullet points (e.g., "- Point one")
- Use numbered lists for sequential items (e.g., "1. First item")

IMPORTANT: 
- DO NOT use special Unicode characters
- DO NOT use complex formatting
- Ensure there's a space after # and ## in headers
- Make sure all ** and _ formatting markers are properly closed
- Use simple ASCII characters only
"""
    
    # Generate the prompt
    prompt = f"""You are an expert at analyzing images and extracting meaning from them. 

Look at the provided image and create a {length_map.get(length, 'moderate length')} summary using {style_map.get(style, 'well-structured paragraphs')}.

{'' if focus == 'comprehensive' else f"Focus on {focus_map.get(focus, 'all key aspects')} of the content."}

{language_instruction}

{formatting_instructions}

If the image contains text:
1. Read and understand the text in the image
2. Summarize the content accurately
3. Preserve the meaning and key points

If the image contains a children's poem or story:
1. Identify the title and author if visible
2. Summarize the theme and message of the poem/story
3. Describe the narrative and any moral lessons

If the image contains a diagram, chart, or visual information:
1. Describe what the visual represents
2. Explain the key information it conveys
3. Analyze any trends or patterns shown

SUMMARY:"""
    
    return prompt
