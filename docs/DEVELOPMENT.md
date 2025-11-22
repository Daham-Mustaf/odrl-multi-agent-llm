# Development Guide

## Local Setup

### Backend
```bash
cd backend

# Create virtual environment
uv venv

# Install dependencies
uv sync

# Run development server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm start
```

## Project Structure
```
backend/
├── agents/           # AI agents
│   ├── text_parser/
│   ├── reasoner/
│   ├── generator/
│   └── validator/
├── config/           # Configuration
├── utils/            # Utilities
└── main.py          # API entry point

frontend/
├── src/
│   ├── components/  # React components
│   ├── config/      # API config
│   └── App.js       # Main app
```

## Adding a New Agent

1. Create folder: `backend/agents/my_agent/`
2. Implement: `my_agent.py`
3. Add endpoint in `main.py`
4. Update frontend to call new endpoint

## Testing

See [Testing Guide](TESTING.md)