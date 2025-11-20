# ODRL Multi-Agent LLM Demo

A demo project showcasing a **multi-agent LLM framework** for **ODRL policy generation, reasoning, and validation**.

## Features

- **Multi-agent system**: Parser, Reasoner, Generator, Validator  
- **Custom LLM model support** (Groq, Ollama, OpenAI-compatible)  
- **Persistent custom model storage**  
- **Backend**: FastAPI  
- **Frontend**: React (or your JS framework)  

## Getting Started

1. **Clone the repo**

```bash
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm
```
2. ## Run Backend

The backend is built with **Python** and **FastAPI**. It is located in the `backend` directory.  

### Development

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload


## Version
Current version: **v2.1.0**

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for details.
