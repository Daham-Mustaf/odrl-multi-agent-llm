"""
File Upload & Parsing Utilities
Handles TXT and MD files (simplified version)
"""

from fastapi import UploadFile, HTTPException
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Configuration
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = ['.txt', '.md']

async def parse_uploaded_file(file: UploadFile) -> Dict[str, any]:
    """
    Extract text from uploaded text files
    
    Args:
        file: UploadFile from FastAPI
        
    Returns:
        Dict with text, filename, size, and character count
        
    Raises:
        HTTPException: If file is invalid or parsing fails
    """
    
    # Read file content
    content = await file.read()
    
    # Log what we received
    logger.info(f"Received file: {file.filename} ({len(content)} bytes)")
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty (0 bytes)"
        )
    
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
            detail=f"Unsupported file type. Only .txt and .md files are supported"
        )
    
    try:
        # Decode text content
        text = _decode_text(content)
        
        # Final validation
        if not text or len(text.strip()) == 0:
            raise HTTPException(
                status_code=400, 
                detail="File contains no readable text"
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
        logger.error(f"Error parsing {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error parsing file: {str(e)}"
        )


def _decode_text(content: bytes) -> str:
    """Decode text content with multiple encoding fallbacks"""
    
    # Try UTF-8 first (most common)
    try:
        text = content.decode('utf-8')
        logger.info(f"Decoded as UTF-8")
        return text
    except UnicodeDecodeError:
        logger.debug(f"UTF-8 decode failed, trying Latin-1")
    
    # Fallback to Latin-1
    try:
        text = content.decode('latin-1')
        logger.info(f"Decoded as Latin-1")
        return text
    except UnicodeDecodeError:
        logger.debug(f"Latin-1 decode failed, trying with errors='ignore'")
    
    # Last resort: decode with errors ignored
    try:
        text = content.decode('utf-8', errors='ignore')
        logger.warning(f"  ⚠ Decoded with some characters ignored")
        return text
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to decode text file: {str(e)}"
        )