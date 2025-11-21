# ODRL Multi-Agent LLM

Multi-agent system for generating, reasoning about, and validating ODRL policies using Large Language Models.

## 🎯 Overview

Transform natural language into validated ODRL policies through a 4-agent pipeline:

1. **Parser** - Extract policy elements from text
2. **Reasoner** - Detect contradictions and constraints  
3. **Generator** - Create ODRL Turtle policies
4. **Validator** - SHACL validation and refinement

## Quick Start

**Local Development:**
```bash
# Backend
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm start
```

Access at: http://localhost:3000

**Production Deployment:** See [Deployment Guide →](docs/DEPLOYMENT.md)

## Documentation

- **[ Deployment Guide](docs/DEPLOYMENT.md)** - Production setup on Ubuntu
- **[ Configuration](docs/CONFIGURATION.md)** - Environment variables and settings
- **[ Docker Setup](docs/DOCKER.md)** - Container deployment
- **[ Development](docs/DEVELOPMENT.md)** - Local development setup
- **[ Testing](docs/TESTING.md)** - How to test the system
- **[ API Reference](docs/API.md)** - Backend API documentation
- **[ hangelog](docs/CHANGELOG.md)** - Version history

##  Tech Stack

- **Backend:** FastAPI, LangChain, UV, RDFLib, PySHACL
- **Frontend:** React, Tailwind CSS
- **LLMs:** Groq, Ollama, OpenAI-compatible, Google GenAI

## Requirements

- Python 3.11+
- Node.js 20+
- 4GB RAM recommended

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE)

## Links

- [Repository](https://github.com/Daham-Mustaf/odrl-multi-agent-llm)
- [Issues](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/issues)
- [ODRL Specification](https://www.w3.org/TR/odrl-model/)