# Configuration Guide

## Backend Configuration

### Environment Variables (.env)
```bash
# LLM Providers
ENABLE_GROQ=true
GROQ_API_KEY=your_groq_key

ENABLE_OLLAMA=false
OLLAMA_BASE_URL=http://localhost:11434

ENABLE_FITS=false
FITS_SERVER_URL=http://dgx.fit.fraunhofer.de

# Model Settings
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
DEFAULT_TEMPERATURE=0.3

# API Settings
CORS_ORIGINS=["http://localhost:3000"]
```

### Custom Models

Located in: `backend/config/custom_models.json`

Add via UI or API:
```bash
POST /api/custom-models
{
  "name": "My Model",
  "provider_type": "openai-compatible",
  "base_url": "https://api.example.com/v1",
  "model_id": "model-name",
  "api_key": "optional",
  "context_length": 8192
}
```

## Frontend Configuration

### Environment Variables (.env)

**Development:**
```bash
REACT_APP_API_URL=http://localhost:8000
```

**Production:**
```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
```

### API Configuration

Edit `src/config/api.js`:
```javascript
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```