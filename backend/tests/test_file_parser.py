"""
Unit tests for file_parser utility (TXT/MD only)
"""

import pytest
import io
from fastapi import UploadFile, HTTPException
from utils.file_parser import parse_uploaded_file, MAX_FILE_SIZE

# ============================================
# FIXTURES
# ============================================

@pytest.fixture
def mock_txt_file():
    """Create a mock .txt file"""
    content = b"This is a test policy document.\nUsers can read and modify."
    file = UploadFile(
        filename="test.txt",
        file=io.BytesIO(content)
    )
    return file

@pytest.fixture
def mock_md_file():
    """Create a mock .md file"""
    content = b"# Policy Document\n\n## Permissions\n- Read: Allowed\n- Modify: Prohibited"
    file = UploadFile(
        filename="test.md",
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
    content = b"x" * (MAX_FILE_SIZE + 1000)
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
        filename="test.pdf",
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
    assert "test policy" in result["text"]
    assert result["characters"] > 0
    assert result["file_type"] == "txt"
    print("TXT parsing test passed")

@pytest.mark.asyncio
async def test_parse_md_file_success(mock_md_file):
    """Test successful parsing of .md file"""
    result = await parse_uploaded_file(mock_md_file)
    
    assert result["filename"] == "test.md"
    assert "Policy Document" in result["text"]
    assert result["file_type"] == "md"
    print("Markdown parsing test passed")

@pytest.mark.asyncio
async def test_parse_empty_file_fails(mock_empty_file):
    """Test that empty files are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_empty_file)
    
    assert exc_info.value.status_code == 400
    assert "empty" in str(exc_info.value.detail).lower()
    print(" Empty file validation test passed")

@pytest.mark.asyncio
async def test_parse_large_file_fails(mock_large_file):
    """Test that files exceeding size limit are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_large_file)
    
    assert exc_info.value.status_code == 413
    assert "too large" in str(exc_info.value.detail).lower()
    print(" File size validation test passed")

@pytest.mark.asyncio
async def test_parse_invalid_extension_fails(mock_invalid_file):
    """Test that unsupported file types are rejected"""
    with pytest.raises(HTTPException) as exc_info:
        await parse_uploaded_file(mock_invalid_file)
    
    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail
    print("File type validation test passed")

@pytest.mark.asyncio
async def test_parse_utf8_file():
    """Test UTF-8 encoded file"""
    content = "Hello 世界! This is UTF-8 text.".encode('utf-8')
    file = UploadFile(
        filename="utf8.txt",
        file=io.BytesIO(content)
    )
    
    result = await parse_uploaded_file(file)
    assert "世界" in result["text"]
    print("UTF-8 encoding test passed")