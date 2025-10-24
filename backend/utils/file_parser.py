"""
File Upload & Parsing Utilities
Handles PDF, DOCX, TXT, MD files
"""

from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
import docx
import io
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Configuration
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.docx', '.md']

async def parse_uploaded_file(file: UploadFile) -> Dict[str, any]:
    """
    Extract text from uploaded files
    
    Args:
        file: UploadFile from FastAPI
        
    Returns:
        Dict with text, filename, size, and character count
        
    Raises:
        HTTPException: If file is invalid or parsing fails
    """
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    # Validate file type
    filename_lower = file.filename.lower()
    if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        text = ""
        
        # Parse based on file type
        if filename_lower.endswith('.pdf'):
            text = _parse_pdf(content)
            
        elif filename_lower.endswith('.docx'):
            text = _parse_docx(content)
            
        else:  # .txt or .md
            text = _parse_text(content)
        
        # Final validation
        if not text or len(text.strip()) == 0:
            raise HTTPException(
                status_code=400, 
                detail="File appears to be empty"
            )
        
        logger.info(f"Successfully parsed: {file.filename} ({len(text)} chars)")
        
        return {
            "text": text.strip(),
            "filename": file.filename,
            "size": len(content),
            "characters": len(text.strip()),
            "file_type": filename_lower.split('.')[-1]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing {file.filename}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error parsing file: {str(e)}"
        )


def _parse_pdf(content: bytes) -> str:
    """Extract text from PDF"""
    try:
        pdf_reader = PdfReader(io.BytesIO(content))
        text = ""
        
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        if not text.strip():
            raise HTTPException(
                status_code=400, 
                detail="PDF appears to be empty or contains only images"
            )
        
        return text
        
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error parsing PDF: {str(e)}"
        )


def _parse_docx(content: bytes) -> str:
    """Extract text from DOCX"""
    try:
        doc = docx.Document(io.BytesIO(content))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        text = "\n".join(paragraphs)
        
        if not text.strip():
            raise HTTPException(
                status_code=400, 
                detail="DOCX appears to be empty"
            )
        
        return text
        
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error parsing DOCX: {str(e)}"
        )


def _parse_text(content: bytes) -> str:
    """Extract text from plain text files (txt, md)"""
    try:
        # Try UTF-8 first
        return content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            # Fallback to latin-1
            return content.decode('latin-1')
        except Exception:
            raise HTTPException(
                status_code=400, 
                detail="Unable to decode text file. Please use UTF-8 encoding"
            )