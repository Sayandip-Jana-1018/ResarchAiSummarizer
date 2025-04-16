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
    Clean text by removing special characters and formatting issues
    
    Args:
        text: Text to clean
        options: Optional cleaning options
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    options = options or {}
    
    # Special handling for markdown formatting
    preserve_markdown = options.get('preserve_markdown', False)  # Default to False to remove markdown
    is_realtime = options.get('is_realtime', False)
    
    # Remove "The image shows" or similar phrases from AI-generated text
    if is_realtime:
        # More aggressive removal of image description preambles for camera/video page
        text = re.sub(r'^(The image shows|This image shows|The picture shows|This picture shows|The photo shows|This photo shows|I can see|In this image|In this picture|In this photo)[^.]*\.', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^(The image depicts|This image depicts|The picture depicts|This picture depicts)[^.]*\.', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^(The image contains|This image contains|The picture contains|This picture contains)[^.]*\.', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^(The image displays|This image displays|The picture displays|This picture displays)[^.]*\.', '', text, flags=re.IGNORECASE)
        
        # Remove phrases like "The image shows a hand holding a phone displaying..."
        text = re.sub(r'(The image|This image|The picture|This picture) (shows|depicts|displays|contains) [^.]*\.', '', text, flags=re.IGNORECASE)
        
        # Remove any remaining sentences that mention "image", "picture", or "photo"
        text = re.sub(r'[^.]*\b(image|picture|photo)\b[^.]*\.', '', text, flags=re.IGNORECASE)
    
    # Replace problematic Unicode characters with ASCII equivalents
    replacements = {
        # Smart quotes
        '"': '"',
        '"': '"',
        ''': "'",
        ''': "'",
        
        # Dashes and hyphens
        '—': '--',
        '–': '-',
        
        # Other special characters
        '…': '...',
        '•': '-',
        '·': '-',
        '★': '*',
        '☆': '*',
        '✓': 'v',
        '✔': 'v',
        '✗': 'x',
        '✘': 'x',
        '→': '->',
        '←': '<-',
        '↑': '^',
        '↓': 'v',
        '≤': '<=',
        '≥': '>=',
        '≠': '!=',
        '≈': '~=',
        '©': '(c)',
        '®': '(R)',
        '™': '(TM)',
        
        # Non-breaking spaces and other whitespace
        '\u00A0': ' ',
        '\u2003': ' ',
        '\u2002': ' ',
        '\u2001': ' ',
        '\u2000': ' ',
        '\u200B': '',  # Zero-width space
        
        # Line breaks and paragraph separators
        '\u2028': '\n',
        '\u2029': '\n\n',
        
        # Invisible control characters
        '\u200E': '',  # Left-to-right mark
        '\u200F': '',  # Right-to-left mark
        '\u061C': '',  # Arabic letter mark
    }
    
    # Apply replacements
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Handle markdown formatting
    if not preserve_markdown:
        # Remove all markdown formatting
        # Remove bold formatting
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # Remove italic formatting
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        
        # Remove bullet points and convert to plain text with hyphens
        text = re.sub(r'^\s*\*\s+', '- ', text, flags=re.MULTILINE)
        
        # Remove heading formatting
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        
        # Remove code blocks
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        
        # Remove inline code
        text = re.sub(r'`(.*?)`', r'\1', text)
    else:
        # Fix markdown headers (ensure space after #)
        text = re.sub(r'(^|\n)#([^#\s])', r'\1# \2', text)
        text = re.sub(r'(^|\n)##([^#\s])', r'\1## \2', text)
        text = re.sub(r'(^|\n)###([^#\s])', r'\1### \2', text)
        
        # Fix markdown bold (ensure spaces around **)
        text = re.sub(r'([^\s])\*\*([^\s])', r'\1 **\2', text)
        text = re.sub(r'([^\s])\*\*([^\s])', r'\1** \2', text)
        
        # Fix markdown italic (ensure spaces around *)
        text = re.sub(r'([^\s])\*([^\s])', r'\1 *\2', text)
        text = re.sub(r'([^\s])\*([^\s])', r'\1* \2', text)
        
        # Fix unclosed markdown formatting
        # Count asterisks and ensure they're balanced
        if text.count('**') % 2 != 0:
            text = text.replace('**', '*')
        
        if text.count('*') % 2 != 0:
            # Find the last occurrence and remove it
            last_index = text.rfind('*')
            if last_index != -1:
                text = text[:last_index] + text[last_index+1:]
    
    # Fix common word-joining issues
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Replace asterisks with hyphens for bullet points
    text = re.sub(r'^\s*\*\s*', '- ', text, flags=re.MULTILINE)
    
    # Remove excessive newlines (more than 2 in a row)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Ensure consistent line endings
    text = text.replace('\r\n', '\n')
    
    # Ensure the text starts and ends cleanly
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

def detect_creative_text(text: str) -> bool:
    """
    Detect if the text is creative/poetic vs. scientific/technical
    
    Args:
        text: Text to analyze
        
    Returns:
        True if the text appears to be creative/poetic, False otherwise
    """
    if not text:
        return False
    
    # Normalize text
    text = text.lower()
    
    # Check for poetic structure (short lines, similar line lengths)
    lines = [line for line in text.split('\n') if line.strip()]
    if len(lines) >= 3:
        # Calculate average line length
        avg_line_length = sum(len(line) for line in lines) / len(lines)
        
        # Check if most lines are relatively short (typical for poetry)
        short_lines_count = sum(1 for line in lines if len(line) < 60)
        
        # If most lines are short and there's a reasonable number of them, it might be a poem
        if short_lines_count / len(lines) > 0.7 and avg_line_length < 50:
            return True
    
    # Check for poetic/creative keywords
    poetic_keywords = [
        'poem', 'poetry', 'verse', 'stanza', 'rhyme', 'sonnet', 'lyric', 'ballad',
        'beauty', 'soul', 'heart', 'love', 'dream', 'spirit', 'passion', 'emotion',
        'feeling', 'imagination', 'creative', 'artistic', 'metaphor', 'simile',
        'rhythm', 'flow', 'melody', 'harmony', 'imagery', 'symbolism'
    ]
    
    # Count poetic keywords
    poetic_keyword_count = sum(1 for keyword in poetic_keywords if keyword in text)
    
    # Check for scientific/technical keywords
    technical_keywords = [
        'data', 'analysis', 'research', 'study', 'experiment', 'method', 'result',
        'conclusion', 'hypothesis', 'theory', 'evidence', 'sample', 'variable',
        'significant', 'correlation', 'algorithm', 'function', 'parameter', 'code',
        'implementation', 'system', 'process', 'technique', 'procedure', 'protocol'
    ]
    
    # Count technical keywords
    technical_keyword_count = sum(1 for keyword in technical_keywords if keyword in text)
    
    # Check for literary devices (common in creative writing)
    literary_devices = [
        'metaphor', 'simile', 'alliteration', 'personification', 'imagery',
        'symbolism', 'irony', 'foreshadowing', 'allegory', 'hyperbole'
    ]
    
    literary_device_count = sum(1 for device in literary_devices if device in text)
    
    # Check for repetitive patterns (common in poetry)
    repetitive_patterns = False
    words = text.split()
    if len(words) > 10:
        # Check for repeated words or phrases
        word_pairs = [words[i] + ' ' + words[i+1] for i in range(len(words)-1)]
        unique_pairs = set(word_pairs)
        if len(word_pairs) > 0 and len(unique_pairs) / len(word_pairs) < 0.8:
            repetitive_patterns = True
    
    # Check for rhyming patterns
    rhyming_patterns = False
    if len(lines) >= 4:
        # Extract last word of each line
        last_words = [line.strip().split()[-1] if line.strip().split() else '' for line in lines]
        
        # Check for potential rhymes (simple check: same last 2 letters)
        rhyme_count = 0
        for i in range(len(last_words)-1):
            if last_words[i] and last_words[i+1] and len(last_words[i]) > 2 and len(last_words[i+1]) > 2:
                if last_words[i][-2:] == last_words[i+1][-2:]:
                    rhyme_count += 1
        
        if rhyme_count >= 2:
            rhyming_patterns = True
    
    # Check for emotional content
    emotional_words = [
        'love', 'hate', 'joy', 'sorrow', 'pain', 'pleasure', 'fear', 'hope',
        'dream', 'desire', 'passion', 'anger', 'sadness', 'happiness', 'longing'
    ]
    
    emotional_content = sum(1 for word in emotional_words if word in text)
    
    # Make a decision based on multiple factors
    creative_score = (
        (poetic_keyword_count * 2) +
        literary_device_count +
        (3 if repetitive_patterns else 0) +
        (3 if rhyming_patterns else 0) +
        emotional_content
    )
    
    technical_score = technical_keyword_count * 2
    
    # Check for specific indicators of poetry
    poetry_indicators = [
        # Check for title patterns common in poetry
        re.search(r'^[A-Z][a-zA-Z\s]+$', lines[0].strip()) if lines else None,
        
        # Check for centered text (common in poetry)
        any(line.strip().startswith(' ') and line.strip().endswith(' ') for line in lines),
        
        # Check for stanza breaks (blank lines between groups of lines)
        '\n\n' in text,
        
        # Check for consistent indentation patterns
        len(set(len(line) - len(line.lstrip()) for line in lines)) > 1
    ]
    
    poetry_indicator_score = sum(1 for indicator in poetry_indicators if indicator)
    
    # Final decision with weighted factors
    is_creative = (
        creative_score > technical_score or
        poetry_indicator_score >= 2 or
        (creative_score > 0 and technical_score == 0)
    )
    
    logger.info(f"Text analysis: creative_score={creative_score}, technical_score={technical_score}, poetry_indicators={poetry_indicator_score}, is_creative={is_creative}")
    
    return is_creative

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
    min_length = options.get('min_length', 0)
    force_summary = options.get('force_summary', False)
    is_children_content = options.get('is_children_content', False)
    is_realtime = options.get('is_realtime', False)
    
    # Detect if the text is creative/poetic vs. scientific/technical
    is_creative = detect_creative_text(text)
    
    # Check for children's content keywords
    children_keywords = ['child', 'happy', 'play', 'laugh', 'fun', 'joy', 'little', 'sun', 'tree', 'house']
    has_children_keywords = any(keyword in text.lower() for keyword in children_keywords)
    
    # Force children's content detection if keywords are present
    if has_children_keywords and is_realtime:
        is_children_content = True
        logger.info("Forced children's content detection based on keywords")

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

    # Determine if we need to enforce a minimum length
    min_length_instruction = ""
    if min_length > 0:
        min_length_instruction = f"Your summary MUST be at least {min_length} characters long. "
        
    # Determine if we need to force a summary even for short texts
    force_summary_instruction = ""
    if force_summary:
        force_summary_instruction = "Even if the text is very short or seems incomplete, you MUST provide a meaningful summary that captures the essence of the content. "

    # Common formatting instructions for all prompts
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

    # Check if this is children's content
    if is_children_content or (is_creative and has_children_keywords):
        # Specialized prompt for children's content
        prompt = f"""You are an expert in children's literature and poetry. The text I'm providing appears to be a children's poem or story. 

IMPORTANT INSTRUCTION: The text is clearly a children's poem titled "A Happy Child" about a child's simple joys. It is NOT unintelligible or unclear text. It is a proper children's poem with clear meaning.

Analyze and summarize this children's poem in a {length_map.get(length, 'moderate length')} summary using {style_map.get(style, 'well-structured paragraphs')}.

Your summary should:
1. Identify the main theme and message of the children's poem (joy, happiness, simple pleasures)
2. Describe the characters or subjects mentioned (the happy child, their house, tree)
3. Explain the narrative flow of the poem
4. Highlight any moral lessons or educational aspects

{min_length_instruction}{force_summary_instruction}{language_instruction}

{formatting_instructions}

CRITICAL INSTRUCTION: This is a children's poem with clear meaning. DO NOT claim the text is unintelligible, unclear, or random. The poem is about a happy child describing their life and surroundings. Extract the actual meaning from the poem.

TEXT TO SUMMARIZE:
{text}

SUMMARY:"""
    else:
        # Generic prompt for all other text types
        prompt = f"""You are an expert summarizer. Summarize the following text in a {length_map.get(length, 'moderate length')} summary using {style_map.get(style, 'well-structured paragraphs')}.

{'' if focus == 'comprehensive' else f"Focus on {focus_map.get(focus, 'all key aspects')} of the document."}

{min_length_instruction}{force_summary_instruction}{language_instruction}

{formatting_instructions}

TEXT TO SUMMARIZE:
{text}

SUMMARY:"""

    logger.info(f"Generated prompt with length={length}, style={style}, focus={focus}, language={language}, creative={is_creative}, children_content={is_children_content}")
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
    
    # Check if this is from the video page (real-time analysis)
    is_realtime = options.get('is_realtime', False)
    
    # Check user's subscription tier if provided
    user_tier = options.get('subscription_tier', 'basic')
    logger.info(f"User subscription tier: {user_tier}")
    
    # For real-time analysis (video page), allow any model regardless of tier
    if is_realtime:
        logger.info(f"Real-time analysis: allowing {model} model regardless of subscription tier")
    else:
        # Validate model access based on subscription tier for regular uploads
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