# ODRL Policy Generator API

Multi-agent LLM system for automatic ODRL (Open Digital Rights Language) policy generation from natural language descriptions.

## Overview

This API transforms natural language policy descriptions into valid ODRL policies using a four-agent architecture:

1. **Parser** - Extracts structured information from text
2. **Reasoner** - Applies logical reasoning and policy rules  
3. **Generator** - Creates valid ODRL Turtle policies
4. **Validator** - Validates against SHACL specifications

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cd backend
cp .env.example .env
# Add your API keys to .env

# Run server
uvicorn main:app --reload

# Access API
# Local: http://localhost:8000
# Docs: http://localhost:8000/docs
```

## Features

- Multi-agent architecture with specialized processing stages
- Flexible LLM support (Ollama, Groq, OpenAI, Claude, custom endpoints)
- Custom model configuration with persistent storage
- File upload support (TXT, DOCX, MD, PDF)
- Real-time agent status streaming via Server-Sent Events
- SHACL validation with automatic error correction
- Cross-platform configuration management

## Architecture

```
Input Text → Parser → Reasoner → Generator → Validator → ODRL Policy
              LLM      LLM        LLM         LLM+SHACL
```

## API Endpoints

### Core Operations

- `POST /api/parse` - Parse natural language text
- `POST /api/reason` - Apply reasoning to parsed data
- `POST /api/generate` - Generate ODRL Turtle policy
- `POST /api/validate` - Validate ODRL with SHACL

### Model Management

- `GET /api/available-providers` - List available LLM providers
- `GET /api/custom-models` - List custom models
- `POST /api/custom-models` - Add custom model configuration
- `DELETE /api/custom-models/{model_value}` - Remove custom model

### File Operations

- `POST /api/parse-file` - Extract text from uploaded files

### Monitoring

- `GET /health` - Health check with system status
- `GET /api/agent-status/{session_id}` - Stream agent status updates

## Configuration

Configuration files are stored in `config/`:

- `settings.py` - Main configuration
- `custom_models.json` - Persistent custom model storage

### Environment Variables

```bash
# LLM Providers
ENABLE_GROQ=true
GROQ_API_KEY=your_key_here

ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434

# Default Model
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

## Project Structure

```
backend/
├── main.py                    # FastAPI application
├── config/
│   ├── settings.py           # Configuration management
│   └── custom_models.json    # Custom model storage
├── agents/
│   ├── text_parser/          # Agent 1: Text parsing
│   ├── reasoner/             # Agent 2: Reasoning
│   ├── generator/            # Agent 3: ODRL generation
│   └── validator/            # Agent 4: SHACL validation
├── utils/
│   ├── llm_factory.py        # LLM provider routing
│   ├── file_parser.py        # File upload handling
│   └── request_utils.py      # Request management
└── api/
    └── storage_api.py         # Storage endpoints
```

## Custom Models

Add custom LLM endpoints:

```json
{
  "value": "custom:your-model",
  "label": "Your Model Name",
  "provider_type": "openai",
  "base_url": "https://your-endpoint.com/v1",
  "model_id": "your-model-id",
  "api_key": "optional-key",
  "context_length": 8192,
  "temperature_default": 0.3
}
```

## Client Disconnect Handling

The API includes automatic detection and cancellation of requests when clients disconnect, preventing unnecessary processing.

## Performance

Typical processing times (Groq Llama 3.1 70B):

- Parser: ~500ms
- Reasoner: ~600ms  
- Generator: ~700ms
- Validator: ~400ms
- Total: ~2.2s

## Requirements

- Python 3.8+
- FastAPI
- LangChain 0.3+
- pySHACL
- Optional: pypdf, python-docx for file parsing

## License

MIT License