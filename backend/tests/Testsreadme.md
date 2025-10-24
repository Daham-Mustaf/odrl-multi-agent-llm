# Tests

Automated tests for the ODRL Policy Generator backend.

## Quick Start

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_file_parser.py -v

# Run with coverage
pytest --cov=utils --cov=main
```

## Test Files

- `test_file_parser.py` - File upload utility tests (5 tests)
- `test_api.py` - API endpoint integration tests (3 tests)
- `fixtures/` - Sample test files (.txt, .md)

## Requirements

```bash
pip install pytest pytest-asyncio httpx
```
