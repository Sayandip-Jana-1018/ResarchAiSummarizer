"""
Document Processor for AI Scientific Research Summarizer
Handles document processing, text extraction, and preprocessing
"""

import os
import sys
import logging
import tempfile
import requests
from typing import Dict, Any, Optional, List, Union
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.text_extraction import extract_text_from_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Document processing class for handling various file types"""
    
    def __init__(self):
        """Initialize the document processor"""
        # Create a temporary directory for downloaded files
        self.temp_dir = tempfile.mkdtemp()
        logger.info(f"Initialized DocumentProcessor with temp directory: {self.temp_dir}")
    
    def extract_text(self, file_path: str, file_type: str) -> str:
        """
        Extract text from a document
        
        Args:
            file_path: Path to the document (local path or URL)
            file_type: Type of document (pdf, image, etc.)
            
        Returns:
            Extracted text from the document
        """
        logger.info(f"Extracting text from {file_path} of type {file_type}")
        
        # Handle URL-based files
        if file_path.startswith('http'):
            local_path = self._download_file(file_path)
            if not local_path:
                raise ValueError(f"Failed to download file from {file_path}")
            file_path = local_path
        
        # Extract text based on file type
        try:
            extracted_text = extract_text_from_file(file_path, file_type)
            
            # Apply text preprocessing
            processed_text = self._preprocess_text(extracted_text)
            
            # Log extraction statistics
            word_count = len(processed_text.split())
            logger.info(f"Extracted {word_count} words from document")
            
            return processed_text
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            raise
    
    def _download_file(self, url: str) -> Optional[str]:
        """
        Download a file from a URL to a temporary location
        
        Args:
            url: URL of the file to download
            
        Returns:
            Local path to the downloaded file, or None if download failed
        """
        try:
            logger.info(f"Downloading file from {url}")
            
            # Parse URL to get filename
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            
            # If no filename, use a default name based on content type
            if not filename:
                response = requests.head(url)
                content_type = response.headers.get('Content-Type', '')
                ext = self._get_extension_from_content_type(content_type)
                filename = f"downloaded_file{ext}"
            
            # Create temporary file path
            local_path = os.path.join(self.temp_dir, filename)
            
            # Download the file
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"Downloaded file to {local_path}")
            return local_path
        
        except Exception as e:
            logger.error(f"Error downloading file: {str(e)}", exc_info=True)
            return None
    
    def _get_extension_from_content_type(self, content_type: str) -> str:
        """
        Get file extension from content type
        
        Args:
            content_type: HTTP Content-Type header
            
        Returns:
            File extension including the dot
        """
        content_type = content_type.lower()
        
        if 'pdf' in content_type:
            return '.pdf'
        elif 'image/jpeg' in content_type or 'image/jpg' in content_type:
            return '.jpg'
        elif 'image/png' in content_type:
            return '.png'
        elif 'image/webp' in content_type:
            return '.webp'
        elif 'image/tiff' in content_type:
            return '.tiff'
        elif 'image/bmp' in content_type:
            return '.bmp'
        elif 'application/msword' in content_type:
            return '.doc'
        elif 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
            return '.docx'
        elif 'text/plain' in content_type:
            return '.txt'
        elif 'text/csv' in content_type:
            return '.csv'
        elif 'application/vnd.ms-excel' in content_type:
            return '.xls'
        elif 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type:
            return '.xlsx'
        else:
            return '.bin'
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess extracted text to improve quality
        
        Args:
            text: Raw extracted text
            
        Returns:
            Preprocessed text
        """
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Fix common OCR errors
        text = text.replace('|', 'I')
        text = text.replace('0', 'O')
        
        # Split into paragraphs for better readability
        lines = text.splitlines()
        paragraphs = []
        current_paragraph = []
        
        for line in lines:
            if not line.strip():
                if current_paragraph:
                    paragraphs.append(' '.join(current_paragraph))
                    current_paragraph = []
            else:
                current_paragraph.append(line)
        
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        # Join paragraphs with double newlines
        processed_text = '\n\n'.join(paragraphs)
        
        return processed_text
