"""
Unit tests for file_parser utility
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
import asyncio

# Force asyncio mode
pytest_plugins = ('pytest_asyncio',)
import pytest
import io
from fastapi import UploadFile, HTTPException
from utils.file_parser import parse_uploaded_file, MAX_FILE_SIZE

# ============================================
# FIXTURES - Create mock files
# ============================================

@pytest.fixture
def mock_txt_file():
    """Create a mock .txt file"""
    content = b"This is a test policy document.\nIt has multiple lines."
    file = UploadFile(
        filename="test.txt",
        file=io.BytesIO(content)
    )
    return file

@pytest.fixture
def mock_empty_file():
    """Create an empty file"""
    content = b""
    file = UploadFile(
        filename="empty.txt",
        file=io.BytesIO(content)
    )
    return file

@pytest.fixture
def mock_large_file():
    """Create a file exceeding size limit"""
    content = b"x" * (MAX_FILE_SIZE + 1000)  # Larger than max
    file = UploadFile(
        filename="large.txt",
        file=io.BytesIO(content)
    )
    return file

@pytest.fixture
def mock_invalid_file():
    """Create an unsupported file type"""
    content = b"fake content"
    file = UploadFile(
        filename="test.exe",
        file=io.BytesIO(content)
    )
    return file

# ============================================
# TESTS
# ============================================

@pytest.mark.asyncio
async def test_parse_txt_file_success(mock_txt_file):
    """Test successful parsing of .txt file"""
    result = await parse_uploaded_file(mock_txt_file)
    
    assert result["filename"] == "test.txt"
    assert "This is a test policy" in result["text"]
    assert result["characters"] > 0
    assert result["file_type"] == "txt"
    print("TXT parsing test passed")

@pytest.mark.asyncio
async def test_parse_empty_file_fails(mock_empty_file):
    """Test that empty files are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_empty_file)
    
    assert exc_info.value.status_code == 400
    assert "empty" in str(exc_info.value.detail).lower()
    print("Empty file validation test passed")

@pytest.mark.asyncio
async def test_parse_large_file_fails(mock_large_file):
    """Test that files exceeding size limit are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_large_file)
    
    assert exc_info.value.status_code == 413
    assert "too large" in str(exc_info.value.detail).lower()
    print("✅ File size validation test passed")

@pytest.mark.asyncio
async def test_parse_invalid_extension_fails(mock_invalid_file):
    """Test that unsupported file types are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_invalid_file)
    
    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail
    print(" File type validation test passed")

@pytest.mark.asyncio
async def test_parse_md_file():
    """Test markdown file parsing"""
    content = b"# Policy Document\n\nThis is a **markdown** file."
    file = UploadFile(
        filename="test.md",
        file=io.BytesIO(content)
    )
    
    result = await parse_uploaded_file(file)
    assert result["file_type"] == "md"
    assert "markdown" in result["text"]
    print("Markdown parsing test passed")