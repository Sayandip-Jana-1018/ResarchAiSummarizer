"""
AI Summarizer Module for Scientific Research Summarizer
Handles integration with various AI models for text summarization
"""

import os
import sys
import time
import logging
import json
import re
import requests
from typing import Dict, Any, Optional, List, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import AI model libraries if available
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    logger.warning("Google Generative AI library not installed. Run: pip install google-generativeai")
    HAS_GEMINI = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    logger.warning("OpenAI library not installed. Run: pip install openai")
    HAS_OPENAI = False

try:
    from anthropic import Anthropic
    HAS_CLAUDE = True
except ImportError:
    logger.warning("Anthropic library not installed. Run: pip install anthropic")
    HAS_CLAUDE = False

try:
    from mistralai.client import MistralClient
    from mistralai.models.chat_completion import ChatMessage
    HAS_MISTRAL = True
except ImportError:
    logger.warning("Mistral AI library not installed. Run: pip install mistralai")
    HAS_MISTRAL = False

# Type definitions
SummarizationOptions = Dict[str, Any]
SummarizationResult = Dict[str, Any]

def clean_text(text: str, options: SummarizationOptions) -> str:
    """
    Clean text output from AI models to remove special characters and improve formatting
    based on the selected summarization options.

    Args:
        text: Text to clean
        options: Summarization options that were used

    Returns:
        Cleaned text with proper markdown formatting
    """
    if not text:
        return ""

    # Get the style and language options
    style = options.get('style', 'paragraph')
    language = options.get('language', 'en')

    # Normalize line endings to \n
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Remove control characters (except newline)
    text = re.sub(r'[\x00-\x09\x0B-\x1F\x7F-\x9F]', '', text)

    # Remove problematic special characters while preserving language-specific ones
    unwanted_chars = r'[\\|\^~`@#\$%&[\]{}()<>]'
    text = re.sub(unwanted_chars, '', text)

    # Fix Markdown formatting issues

    ## Headers: Ensure space after # and proper line spacing
    text = re.sub(r'(?m)^(#+)([^\s#])', r'\1 \2', text)  # Space after #
    text = re.sub(r'([^\n])\n(#+)\s', r'\1\n\n\2 ', text)  # Blank line before headers
    text = re.sub(r'(#+\s.*?)\n([^#\n])', r'\1\n\n\2', text)  # Blank line after headers

    # Clean up whitespace
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs to single space
    text = re.sub(r'\n{3,}', '\n\n', text)  # 3+ newlines to 2
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)  # Trailing spaces

    # Process based on style
    if style == 'bullet':
        # Split into sections
        sections = text.split('\n\n')
        formatted_sections = []

        for section in sections:
            lines = section.split('\n')
            if len(lines) > 1:
                # Format as bullet points if multiple lines
                formatted_lines = ['- ' + line.lstrip('•-* ').strip() for line in lines if line.strip()]
                formatted_sections.append('\n'.join(formatted_lines))
            else:
                # Keep as is if it's a single line (likely a header)
                formatted_sections.append(section.strip())

        text = '\n\n'.join(formatted_sections)
    else:
        # For paragraph style
        text = re.sub(r'\s*[•\-]\s*', '', text)  # Remove bullet points
        text = re.sub(r'([.!?])\s*\n(?!\n)', r'\1 ', text)  # Join sentences
        text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines

    # Clean up markdown formatting
    text = re.sub(r'\*\*\s*([^*\n]+?)\s*\*\*', r'**\1**', text)  # Fix bold
    text = re.sub(r'__\s*([^_\n]+?)\s*__', r'**\1**', text)  # Convert __ to **
    text = re.sub(r'_\s*([^_\n]+?)\s*_', r'_\1_', text)  # Fix italics
    text = re.sub(r'\*(?!\*)\s*([^*\n]+?)\s*\*(?!\*)', r'_\1_', text)  # Convert * to _

    # Fix headers
    text = re.sub(r'^\s*(#+)\s*', r'\1 ', text, flags=re.MULTILINE)  # Fix header spacing
    text = re.sub(r'\n(#+\s[^\n]+)\n(?!\n)', r'\n\1\n\n', text)  # Add newline after headers

    # Clean up spacing and punctuation
    text = re.sub(r'([.,;:!?])([^\s0-9])', r'\1 \2', text)  # Add space after punctuation
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = re.sub(r'\s*\n\s*\n\s*', '\n\n', text)  # Normalize paragraph spacing

    # Final cleanup
    text = text.strip()

    return text

def get_language_name(language_code: str) -> str:
    """
    Get the full language name from a language code

    Args:
        language_code: ISO language code (e.g., 'en', 'hi', 'es')

    Returns:
        Full language name
    """
    language_map = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
        'pt': 'Portuguese', 'nl': 'Dutch', 'ru': 'Russian', 'pl': 'Polish', 'sv': 'Swedish',
        'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'cs': 'Czech', 'hu': 'Hungarian',
        'ro': 'Romanian', 'bg': 'Bulgarian', 'el': 'Greek', 'tr': 'Turkish', 'zh': 'Chinese',
        'ja': 'Japanese', 'ko': 'Korean', 'vi': 'Vietnamese', 'th': 'Thai', 'id': 'Indonesian',
        'ms': 'Malay', 'hi': 'Hindi', 'bn': 'Bengali', 'mr': 'Marathi', 'te': 'Telugu',
        'ta': 'Tamil', 'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi',
        'or': 'Odia', 'as': 'Assamese', 'ur': 'Urdu', 'sa': 'Sanskrit', 'ar': 'Arabic',
        'he': 'Hebrew', 'fa': 'Persian', 'sw': 'Swahili', 'am': 'Amharic', 'ha': 'Hausa',
        'yo': 'Yoruba', 'ig': 'Igbo'
    }

    if language_code in language_map:
        logger.info(f"Using language: {language_map[language_code]} ({language_code})")
    else:
        logger.warning(f"Unknown language code: {language_code}, using as is")
    return language_map.get(language_code, language_code)

def generate_prompt(text: str, options: SummarizationOptions) -> str:
    """
    Generate a prompt for the AI model based on the extracted text and options

    Args:
        text: Text to summarize
        options: Summarization options

    Returns:
        Prompt for the AI model
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
        'bullet': 'organized bullet points with clear sections and subsections (use proper Markdown bullet point format with - or * followed by a space)',
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
        if language != 'en' else "Output in English"
    )

    style_specific_instructions = (
        """
- Use bullet points consistently throughout the summary
- Format each main point as a bullet point starting with '- ' (dash followed by a space)
- Use indentation for sub-points where appropriate (4 spaces followed by '- ')
- Ensure each bullet point is concise and focused
- Use headers to organize sections (# for main sections, ## for subsections), followed by bullet points
- IMPORTANT: Always use proper Markdown bullet point format (dash or asterisk followed by a space)
- IMPORTANT: Make sure each bullet point appears on a new line"""
        if style == 'bullet' else
        """
- Use well-structured paragraphs with clear topic sentences
- Ensure smooth transitions between paragraphs
- Group related information in the same paragraph
- Use headers to separate major sections (# for main sections, ## for subsections)
- IMPORTANT: Include at least 3-4 paragraphs for short summaries, 5-7 for medium, and 8-12 for long summaries"""
    )

    prompt = f"""
You are an expert document summarizer. Your task is to create a high-quality {length_map.get(length, 'moderate length')} summary of the following document. The document could be any type: research paper, article, certificate, report, presentation, or other text.

SUMMARY REQUIREMENTS:
- Use {style_map.get(style, 'well-structured paragraphs')} for the summary format
- Focus primarily on {focus_map.get(focus, 'all key aspects of the research')}
- {language_instruction}
- Organize the summary with clear structure
- Preserve key statistics, findings, and citations
- Format using clean Markdown with appropriate headings, subheadings, bullet points, and emphasis
- Include a brief executive summary at the beginning
- Adapt your summary style to match the document type (e.g., formal for research/reports, descriptive for certificates/achievements)
{style_specific_instructions}

FORMATTING REQUIREMENTS:
- Ensure proper spacing in Markdown formatting (e.g., '# Title' not '#Title')
- Use proper formatting for emphasis: **bold** and *italic* with proper spacing
- Avoid using special characters that might break formatting
- Ensure bullet points have proper spacing after the marker (e.g., '- Item' not '-Item')
- Use proper Markdown syntax for headers (# for main headers, ## for subheaders)

IMPORTANT LANGUAGE REQUIREMENT:
{language_instruction}

DOCUMENT TEXT:
{text}
"""
    return prompt

def summarize_with_gemini(text: str, options: SummarizationOptions) -> SummarizationResult:
    """
    Summarize text using Google Gemini models

    Args:
        text: Text to summarize
        options: Summarization options

    Returns:
        Dict containing summary and processing time
    """
    start_time = time.time()
    if not HAS_GEMINI:
        logger.warning("Using mock Gemini response (library not installed)")
        time.sleep(2)
        summary = f"""# Research Summary (Gemini)\n\n## Executive Summary\nThis research presents significant findings in the field, with novel methodological approaches and important implications for future work.\n\n## Key Findings\n- The study demonstrates a 42% improvement over baseline methods\n- Statistical significance was achieved at p < 0.001\n- The methodology introduces innovations in data processing\n\n## Methodology\nThe researchers employed a comprehensive approach combining quantitative and qualitative methods. The sample included 500 participants across diverse demographics.\n\n## Conclusions\nThe findings support the theoretical framework and suggest several avenues for future research. Limitations include sample size constraints and potential regional biases."""
    else:
        try:
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
            if not api_key:
                raise ValueError("Neither GEMINI_API_KEY nor GOOGLE_AI_API_KEY environment variables are set")
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = generate_prompt(text, options)
            response = model.generate_content(prompt)
            summary = response.text
        except Exception as e:
            logger.error(f"Error using Gemini API: {str(e)}", exc_info=True)
            raise ValueError(f"Gemini summarization failed: {str(e)}")
    processing_time = time.time() - start_time
    cleaned_summary = clean_text(summary, options)
    return {"summary": cleaned_summary, "model": "gemini", "processing_time": processing_time}

def summarize_with_openai(text: str, options: SummarizationOptions) -> SummarizationResult:
    """
    Summarize text using OpenAI models

    Args:
        text: Text to summarize
        options: Summarization options

    Returns:
        Dict containing summary and processing time
    """
    start_time = time.time()
    if not HAS_OPENAI:
        logger.warning("Using mock OpenAI response (library not installed)")
        time.sleep(2.5)
        summary = f"""# Research Summary (OpenAI)\n\n## Executive Summary\nThis research investigates the relationship between neural network architecture and performance in computer vision tasks. The study demonstrates a 42% improvement in accuracy while reducing computational requirements by 30%.\n\n## Methodology\nThe researchers employed a novel approach combining transfer learning with specialized convolutional layers. The experiment included:\n- 10,000 labeled images across 5 categories\n- Comparison with 3 state-of-the-art baseline models\n- Rigorous cross-validation procedures\n\n## Results\nThe proposed architecture achieved:\n- 94.7% accuracy on the test dataset\n- 30% reduction in computational complexity\n- 45% faster inference time\n- Statistically significant improvements (p<0.001)\n\n## Conclusions\nThis work demonstrates that specialized architectural modifications can dramatically improve both accuracy and efficiency. The authors suggest several promising directions for future research."""
    else:
        try:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            client = openai.OpenAI(api_key=api_key)
            prompt = generate_prompt(text, options)
            model = "gpt-4o-2024-05-13"
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert scientific research summarizer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2500
            )
            summary = response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error using OpenAI API: {str(e)}", exc_info=True)
            raise ValueError(f"OpenAI summarization failed: {str(e)}")
    processing_time = time.time() - start_time
    cleaned_summary = clean_text(summary, options)
    return {"summary": cleaned_summary, "model": "openai", "processing_time": processing_time}

def summarize_with_claude(text: str, options: SummarizationOptions) -> SummarizationResult:
    """
    Summarize text using Anthropic Claude models

    Args:
        text: Text to summarize
        options: Summarization options

    Returns:
        Dict containing summary and processing time
    """
    start_time = time.time()
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        prompt = generate_prompt(text, options)
        model = "claude-3-opus-20240229"

        # Direct API call to Claude
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        data = {
            "model": model,
            "max_tokens": 2500,
            "temperature": 0.3,
            "system": "You are an expert document summarizer, capable of analyzing and summarizing any type of document.",
            "messages": [{"role": "user", "content": prompt}]
        }

        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data,
            timeout=120
        )
        response.raise_for_status()
        result = response.json()
        summary = result["content"][0]["text"]
        cleaned_summary = clean_text(summary, options)

        return {
            "summary": cleaned_summary,
            "model": "claude",
            "processing_time": time.time() - start_time
        }

    except Exception as e:
        error_msg = f"Claude summarization failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "summary": f"Summarization failed: {error_msg}",
            "model": "claude",
            "processing_time": time.time() - start_time,
            "error": True
        }

def summarize_with_mistral(text: str, options: SummarizationOptions) -> SummarizationResult:
    """
    Summarize text using Mistral AI models

    Args:
        text: Text to summarize
        options: Summarization options

    Returns:
        Dict containing summary and processing time
    """
    start_time = time.time()
    try:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            raise ValueError("MISTRAL_API_KEY environment variable not set")

        prompt = generate_prompt(text, options)
        model = "mistral-large-latest"

        # Direct API call to Mistral
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are an expert document summarizer, capable of analyzing and summarizing any type of document."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 2500
        }

        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=120
        )
        response.raise_for_status()
        result = response.json()
        summary = result["choices"][0]["message"]["content"]
        cleaned_summary = clean_text(summary, options)

        return {
            "summary": cleaned_summary,
            "model": "mistral",
            "processing_time": time.time() - start_time
        }

    except Exception as e:
        error_msg = f"Mistral summarization failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "summary": f"Summarization failed: {error_msg}",
            "model": "mistral",
            "processing_time": time.time() - start_time,
            "error": True
        }

def summarize_text(text: str, model: str, options: SummarizationOptions) -> SummarizationResult:
    """
    Main function to summarize text using the specified AI model

    Args:
        text: Text to summarize
        model: AI model to use (gemini, openai, claude, mistral)
        options: Summarization options

    Returns:
        Dict containing summary and processing time
    """
    model = model.lower()
    if not text or len(text.strip()) < 50:
        raise ValueError("Text is too short for summarization")
    
    # Check user's subscription tier if provided
    user_tier = options.get('subscription_tier', 'basic')
    logger.info(f"User subscription tier: {user_tier}")
    
    # Validate model access based on subscription tier
    allowed_models = {
        'basic': ['gemini'],
        'silver': ['gemini', 'openai', 'mistral'],
        'gold': ['gemini', 'openai', 'mistral', 'claude']
    }
    
    # Default to basic tier if invalid tier provided
    if user_tier not in allowed_models:
        logger.warning(f"Invalid subscription tier: {user_tier}. Defaulting to 'basic'")
        user_tier = 'basic'
    
    # Check if user has access to the requested model
    if model not in allowed_models[user_tier]:
        logger.warning(f"User with {user_tier} tier doesn't have access to {model} model")
        # Fallback to the best available model for their tier
        if user_tier == 'basic':
            model = 'gemini'
        elif user_tier == 'silver':
            # Prefer OpenAI if requested model was Claude
            model = 'openai' if model == 'claude' else 'gemini'
        
        logger.info(f"Falling back to {model} model based on subscription tier")
    
    # Truncate text if too long
    max_chars = 32000
    if len(text) > max_chars:
        logger.warning(f"Text exceeds maximum length ({len(text)} chars). Truncating to {max_chars} chars.")
        first_part = int(max_chars * 0.33)
        last_part = max_chars - first_part
        text = text[:first_part] + "\n\n[...Content truncated due to length...]\n\n" + text[-last_part:]
    
    logger.info(f"Summarizing with {model} model")
    try:
        if model == "gemini":
            return summarize_with_gemini(text, options)
        elif model == "openai":
            return summarize_with_openai(text, options)
        elif model == "claude":
            return summarize_with_claude(text, options)
        elif model == "mistral":
            return summarize_with_mistral(text, options)
        else:
            raise ValueError(f"Unsupported AI model: {model}")
    except Exception as e:
        logger.error(f"Error in {model} summarization: {str(e)}", exc_info=True)
        raise ValueError(f"{model.capitalize()} summarization failed: {str(e)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Summarize text using AI models')
    parser.add_argument('text', help='Text to summarize or path to text file')
    parser.add_argument('--model', default='gemini', help='AI model to use (gemini, openai, claude, mistral)')
    parser.add_argument('--length', default='medium', help='Summary length (short, medium, long)')
    parser.add_argument('--style', default='academic', help='Summary style (academic, casual, technical, simplified)')
    parser.add_argument('--focus', default='comprehensive', help='Summary focus (comprehensive, methodology, results, conclusions)')
    parser.add_argument('--language', default='en', help='Summary language')
    parser.add_argument('--output', help='Output file path (optional)')
    args = parser.parse_args()
    try:
        if os.path.isfile(args.text):
            with open(args.text, 'r', encoding='utf-8') as f:
                text = f.read()
        else:
            text = args.text
        result = summarize_text(
            text,
            args.model,
            {
                "length": args.length,
                "style": args.style,
                "focus": args.focus,
                "language": args.language
            }
        )
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(result["summary"])
            print(f"Summary saved to {args.output}")
        else:
            print(result["summary"])
        print(f"\nModel: {result['model']}")
        print(f"Processing time: {result['processing_time']:.2f} seconds")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)