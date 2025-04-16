"""
Document Processor for AI Scientific Research Summarizer
Handles document processing, text extraction, and preprocessing
"""

import os
import sys
import logging
import tempfile
import requests
import shutil
import io
from typing import Dict, Any, Optional, List, Union, Tuple
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.text_extraction import extract_text_from_file, extract_text_from_image, fallback_extraction

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
        
        # Check for PyMuPDF availability
        try:
            import fitz
            self.has_pymupdf = True
            logger.info("PyMuPDF (fitz) is available for enhanced PDF processing")
        except ImportError:
            self.has_pymupdf = False
            logger.warning("PyMuPDF not available. Install with: pip install PyMuPDF")
    
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
        local_path = None
        
        try:
            # Handle URL-based files
            if file_path.startswith('http'):
                local_path, content_type = self._download_file(file_path)
                if not local_path:
                    raise ValueError(f"Failed to download file from {file_path}")
                
                # If file_type is not specified or doesn't match content, update it
                if file_type == 'auto' or not file_type:
                    detected_type = self._detect_file_type(local_path, content_type)
                    logger.info(f"Auto-detected file type: {detected_type}")
                    file_type = detected_type
                
                file_path = local_path
            
            # For local files, verify they exist
            elif not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Extract text based on file type
            extracted_text = ""
            
            # Try standard extraction first
            try:
                extracted_text = extract_text_from_file(file_path, file_type)
            except Exception as extraction_error:
                logger.warning(f"Standard extraction failed: {extraction_error}")
                
                # If standard extraction fails and it's a PDF, try alternative methods
                if file_type.lower() == 'pdf' and self.has_pymupdf:
                    logger.info("Attempting alternative PDF extraction with PyMuPDF")
                    extracted_text = self._extract_text_with_pymupdf(file_path)
            
            # If we still don't have text, try OCR as a last resort for PDFs and images
            if not extracted_text or len(extracted_text.strip()) < 50:
                if file_type.lower() in ['pdf', 'image', 'jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp']:
                    logger.info("Attempting OCR extraction as fallback")
                    ocr_text = self._extract_text_with_ocr(file_path, file_type)
                    if ocr_text and len(ocr_text.strip()) > len(extracted_text.strip()):
                        extracted_text = ocr_text
            
            # Apply text preprocessing
            processed_text = self._preprocess_text(extracted_text)
            
            # Log extraction statistics
            word_count = len(processed_text.split())
            logger.info(f"Extracted {word_count} words from document")
            
            return processed_text
            
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            raise
        finally:
            # Clean up temporary file if it was created
            if local_path and os.path.exists(local_path) and file_path.startswith('http'):
                try:
                    os.remove(local_path)
                    logger.info(f"Cleaned up temporary file: {local_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file: {cleanup_error}")
    
    def _download_file(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Download a file from a URL to a temporary location
        
        Args:
            url: URL of the file to download
            
        Returns:
            Tuple of (local_path, content_type) or (None, None) if download failed
        """
        try:
            logger.info(f"Downloading file from {url}")
            
            # Parse URL to get filename
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            
            # Make HEAD request to get content type
            try:
                head_response = requests.head(url, timeout=10)
                content_type = head_response.headers.get('Content-Type', '')
            except Exception as head_error:
                logger.warning(f"HEAD request failed: {head_error}, proceeding with GET")
                content_type = ''
            
            # If no filename or it has no extension, use content type
            if not filename or '.' not in filename:
                ext = self._get_extension_from_content_type(content_type)
                filename = f"downloaded_file{ext}"
            
            # Create temporary file path
            local_path = os.path.join(self.temp_dir, filename)
            
            # Download the file with timeout and stream
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            # If content type wasn't in HEAD, get it from GET response
            if not content_type:
                content_type = response.headers.get('Content-Type', '')
            
            # Save the file
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:  # Filter out keep-alive chunks
                        f.write(chunk)
            
            logger.info(f"Downloaded file to {local_path}")
            return local_path, content_type
        
        except Exception as e:
            logger.error(f"Error downloading file: {str(e)}", exc_info=True)
            return None, None
    
    def _detect_file_type(self, file_path: str, content_type: str = '') -> str:
        """
        Detect file type from file extension and/or content type
        
        Args:
            file_path: Path to the file
            content_type: HTTP Content-Type header (optional)
            
        Returns:
            Detected file type (pdf, image, etc.)
        """
        # Get file extension
        _, ext = os.path.splitext(file_path)
        ext = ext.lower().lstrip('.')
        
        # Map of extensions to file types
        extension_map = {
            'pdf': 'pdf',
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 
            'bmp': 'image', 'tiff': 'image', 'webp': 'image',
            'doc': 'document', 'docx': 'document', 'txt': 'document', 
            'rtf': 'document', 'odt': 'document',
            'csv': 'spreadsheet', 'xls': 'spreadsheet', 'xlsx': 'spreadsheet',
            'ppt': 'presentation', 'pptx': 'presentation',
            'html': 'webpage', 'htm': 'webpage'
        }
        
        # Check extension first
        if ext in extension_map:
            return extension_map[ext]
        
        # If no extension or unknown, check content type
        content_type = content_type.lower()
        if 'pdf' in content_type:
            return 'pdf'
        elif 'image/' in content_type:
            return 'image'
        elif 'text/html' in content_type:
            return 'webpage'
        elif 'text/' in content_type or 'document' in content_type:
            return 'document'
        elif 'spreadsheet' in content_type or 'excel' in content_type or 'csv' in content_type:
            return 'spreadsheet'
        elif 'presentation' in content_type or 'powerpoint' in content_type:
            return 'presentation'
        
        # Default to document if we can't determine
        logger.warning(f"Could not determine file type for {file_path}, defaulting to 'document'")
        return 'document'
    
    def _extract_text_with_pymupdf(self, file_path: str) -> str:
        """
        Extract text from PDF using PyMuPDF
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text
        """
        try:
            import fitz
            
            text = ""
            doc = fitz.open(file_path)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                text += page_text + "\n\n"
            
            word_count = len(text.split())
            logger.info(f"Extracted {word_count} words using PyMuPDF")
            return text
            
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            return ""
    
    def _extract_text_with_ocr(self, file_path: str, file_type: str) -> str:
        """
        Extract text using OCR for images or PDFs
        
        Args:
            file_path: Path to the file
            file_type: Type of file
            
        Returns:
            Extracted text
        """
        try:
            # Check if we have the necessary libraries
            try:
                from PIL import Image
                import pytesseract
                import cv2
                import numpy as np
                from utils.text_extraction import extract_text_from_image, fallback_extraction
            except ImportError as e:
                logger.error(f"OCR libraries not installed or import error: {str(e)}")
                return ""
            
            text = ""
            
            # For images, use the enhanced image extraction directly
            if file_type.lower() in ['image', 'jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp', 'gif']:
                logger.info(f"Using enhanced image extraction for {file_path}")
                try:
                    # Try the enhanced extraction first
                    text = extract_text_from_image(file_path)
                    logger.info(f"Enhanced image extraction returned {len(text.split())} words")
                    
                    # If that fails, try the fallback
                    if not text or len(text.strip()) < 10:
                        logger.warning("Enhanced extraction failed, trying fallback extraction")
                        text = fallback_extraction(file_path)
                        logger.info(f"Fallback extraction returned {len(text.split())} words")
                    
                    return text
                except Exception as img_error:
                    logger.error(f"Enhanced image extraction failed: {str(img_error)}")
                    # Continue to basic OCR below
            
            # For PDFs, convert to images first
            if file_type.lower() == 'pdf':
                try:
                    # Try pdf2image first
                    try:
                        from pdf2image import convert_from_path
                        images = convert_from_path(file_path)
                        logger.info(f"Converted PDF to {len(images)} images with pdf2image")
                    except Exception as pdf2image_error:
                        logger.warning(f"pdf2image conversion failed: {pdf2image_error}")
                        
                        # Fallback to PyMuPDF
                        if self.has_pymupdf:
                            logger.info("Attempting PDF to image conversion with PyMuPDF")
                            import fitz
                            import io
                            
                            images = []
                            doc = fitz.open(file_path)
                            
                            for page_num in range(len(doc)):
                                page = doc.load_page(page_num)
                                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                                img_data = pix.tobytes("png")
                                img = Image.open(io.BytesIO(img_data))
                                images.append(img)
                            
                            logger.info(f"Converted PDF to {len(images)} images with PyMuPDF")
                        else:
                            logger.error("Both pdf2image and PyMuPDF failed, cannot perform OCR on PDF")
                            return ""
                    
                    # Process each image with OCR
                    for i, img in enumerate(images):
                        page_text = self._process_image_with_ocr(img)
                        text += page_text + "\n\n"
                        logger.info(f"Extracted text from PDF page {i+1} with OCR")
                    
                except Exception as pdf_ocr_error:
                    logger.error(f"PDF OCR processing failed: {pdf_ocr_error}")
                    return ""
            
            # For images, process directly
            elif file_type.lower() in ['image', 'jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp']:
                try:
                    img = Image.open(file_path)
                    text = self._process_image_with_ocr(img)
                    logger.info(f"Extracted text from image with OCR")
                except Exception as img_ocr_error:
                    logger.error(f"Image OCR processing failed: {img_ocr_error}")
                    return ""
            
            return text
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return ""
    
    def _process_image_with_ocr(self, image) -> str:
        """
        Process an image with OCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Extracted text
        """
        try:
            from PIL import ImageEnhance, ImageFilter
            import pytesseract
            
            # Convert to grayscale
            grayscale_image = image.convert('L')
            
            # Enhance contrast
            contrast_enhancer = ImageEnhance.Contrast(grayscale_image)
            enhanced_image = contrast_enhancer.enhance(3.0)
            
            # Enhance brightness
            brightness_enhancer = ImageEnhance.Brightness(enhanced_image)
            enhanced_image = brightness_enhancer.enhance(1.3)
            
            # Enhance sharpness
            sharpness_enhancer = ImageEnhance.Sharpness(enhanced_image)
            enhanced_image = sharpness_enhancer.enhance(2.5)
            
            # Apply filters
            enhanced_image = enhanced_image.filter(ImageFilter.UnsharpMask(radius=2, percent=200, threshold=2))
            enhanced_image = enhanced_image.filter(ImageFilter.MedianFilter(size=3))
            enhanced_image = enhanced_image.filter(ImageFilter.EDGE_ENHANCE_MORE)
            
            # Resize for better OCR if needed
            if enhanced_image.width < 1500 or enhanced_image.height < 1500:
                scale_factor = max(1500 / enhanced_image.width, 1500 / enhanced_image.height)
                new_width = int(enhanced_image.width * scale_factor)
                new_height = int(enhanced_image.height * scale_factor)
                enhanced_image = enhanced_image.resize((new_width, new_height), Image.LANCZOS)
            
            # Try multiple OCR configurations
            configs = [
                r'--oem 1 --psm 3 -l eng --dpi 300',  # Default
                r'--oem 1 --psm 6 -l eng --dpi 300',  # For printed text
                r'--oem 1 --psm 4 -l eng --dpi 300',  # For single column
                r'--oem 1 --psm 1 -l eng --dpi 300',  # For dense text
            ]
            
            best_text = ""
            best_word_count = 0
            
            for config in configs:
                current_text = pytesseract.image_to_string(enhanced_image, config=config)
                current_word_count = len(current_text.split())
                
                if current_word_count > best_word_count:
                    best_text = current_text
                    best_word_count = current_word_count
            
            logger.info(f"Best OCR configuration extracted {best_word_count} words")
            return best_text
            
        except Exception as e:
            logger.error(f"Image OCR processing failed: {e}")
            return ""
    
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
    
    def __del__(self):
        """Clean up temporary directory when object is destroyed"""
        try:
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
        except Exception as e:
            logger.warning(f"Failed to clean up temporary directory: {e}")
