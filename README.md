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
````

2. **Run Backend**

The backend is built with **Python** and **FastAPI**. It is located in the `backend` directory.

### Development

```bash
cd backend
uv venv --python 3.12
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
uv pip install -r requirements.txt
uv run uvicorn main:app --reload
```
## Frontend

The frontend is built with **React** and is located in the `frontend` directory.  

### Development

```bash
cd frontend
npm install
npm start
````

The frontend will be available at [http://localhost:3000](http://localhost:3000).


