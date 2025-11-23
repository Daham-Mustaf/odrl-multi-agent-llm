# ODRL Frontend

React-based UI for the ODRL Policy Generator with multi-agent processing pipeline.

## Features

- Multi-agent processing pipeline (Parser → Reasoner → Generator → Validator)
- Real-time agent status monitoring via Server-Sent Events
- Custom LLM model configuration with persistent storage
- File upload support (TXT, MD, JSON)
- Dark mode interface
- Chat history management
- Advanced per-agent model selection
- Token counting and performance metrics

## Quick Start

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your backend URL:

**Local development:**
```bash
REACT_APP_API_URL=http://localhost:8000
```

**Production:**
```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
```

### Run Development Server

```bash
npm start
```

Access at: http://localhost:3000

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:8000` |
| `DISABLE_ESLINT_PLUGIN` | Disable ESLint warnings | `true` |

## Key Components

### Main Application (`App.js`)
- Multi-agent processing pipeline
- State management for all processing stages
- Model configuration and selection
- Real-time status updates via SSE

### Agent Tabs
- **ParserTab**: Text parsing and entity extraction
- **ReasonerTab**: Policy analysis and conflict detection
- **GeneratorTab**: ODRL policy generation
- **ValidatorTab**: SHACL validation and error reporting
- **StatusTab**: Real-time agent status monitoring

### Custom Models
- Add custom LLM endpoints (Ollama, OpenAI-compatible, Google GenAI)
- Persistent storage (localStorage, backend, or both)
- Per-agent model selection in advanced mode

## Processing Modes

### Auto-Progress Mode
Automatically progresses through all four agents without user intervention.

### Manual Mode (Step-by-Step)
Allows review and approval at each stage:
1. Parse text
2. Review analysis
3. Generate ODRL
4. Validate output

## Architecture

```
User Input → Parser → Reasoner → Generator → Validator → Final ODRL
             LLM      LLM         LLM          LLM+SHACL
```

## Dependencies

- React 18+
- lucide-react (icons)
- js-tiktoken (token counting)

