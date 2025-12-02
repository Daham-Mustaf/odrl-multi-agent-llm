
# ODRL Policy Generator API  
### Multi-Agent LLM System for Parsing, Reasoning, Generating & Validating ODRL Policies

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)]()
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

A production-ready **multi-agent LLM pipeline** that transforms natural-language policy descriptions into valid **ODRL (Open Digital Rights Language)** policies.

This backend provides:
- 🧩 **Parser Agent** — extracts structured semantics  
- 🧠 **Reasoner Agent** — performs policy reasoning  
- ✏️ **Generator Agent** — produces ODRL Turtle  
- ✅ **Validator Agent** — SHACL-based validation  
- 💾 **Persistent custom model storage**  
- 📡 **SSE agent progress streaming**  
- 📁 **File parsing (`.txt`, `.md`, `.docx`)**  
- 🧱 **Extensible document/embedding storage layer**

---

## Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Custom Model System](#-custom-model-system)
- [Storage API](#-storage-api)
- [Debug Tools](#-debug-tools)

---

# Features

### Multi-Agent LLM Pipeline  
| Agent | Purpose |
|-------|---------|
| **Parser** | Extracts structured meaning from user text |
| **Reasoner** | Performs semantic interpretation & consistency checks |
| **Generator** | Produces ODRL output in Turtle syntax |
| **Validator** | Validates output using SHACL constraints |

### LLM Provider Abstraction
Supports:
- Groq  
- Ollama  
- OpenAI-compatible APIs  
- User-defined models (persisted to disk)

### File Parsing  
Upload `.txt`, `.md`, `.docx` → system extracts clean text.

### Server-Sent Events (SSE)  
Real-time agent status updates:
- `pending`
- `active`
- `done`
- `error`
- keepalive heartbeats

### Persistent Custom Model Registry  
Stored in:
```

config/custom_models.json

```
Readable, editable, import/export-capable.

### Storage Layer  
Document/embedding write, read, delete endpoints.

---

# Architecture

```

Natural Language Text
│
▼
┌───────────────────┐
│   Parser Agent    │  → Extracts semantic structure
└───────────────────┘
│
▼
┌───────────────────┐
│  Reasoner Agent   │  → Logical inference, consistency
└───────────────────┘
│
▼
┌───────────────────┐
│ Generator Agent   │  → Creates ODRL Turtle
└───────────────────┘
│
▼
┌───────────────────┐
│ Validator Agent   │  → SHACL validation
└───────────────────┘

```

All steps can be executed independently or chained.

---

# Project Structure

```

app/
│── api/
│    └── storage_api.py        # Storage CRUD endpoints
│
│── agents/
│    ├── text_parser/          # Parser agent
│    ├── reasoner/             # Semantic reasoning agent
│    ├── generator/            # ODRL generator agent
│    └── validator/            # SHACL validator agent
│
│── utils/
│    ├── llm_factory.py        # Provider abstraction
│    ├── file_parser.py        # TXT/MD/DOCX extraction
│    ├── request_utils.py
│    ├── logger_utils.py
│
│── config/
│    ├── settings.py           # Server config
│    └── custom_models.json    # Persistent custom model registry
│
└── main.py                    # FastAPI initialization, routes

````

---

# Getting Started

**Local Development:**
```bash
# Backend
cd backend && uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm install && npm start
```

### Access API

* Swagger → [http://localhost:8000/docs](http://localhost:8000/docs)
* ReDoc → [http://localhost:8000/redoc](http://localhost:8000/redoc)
* Root → [http://localhost:8000/](http://localhost:8000/)

---

# Configuration

### Environment Variables

Loaded automatically via `.env`.

### Important Paths

| Path                        | Purpose                          |
| --------------------------- | -------------------------------- |
| `config/custom_models.json` | Persistent custom model registry |
| `config/settings.py`        | Application configuration        |

---

# API Reference

## 1. Parse Text

Extract semantic structure.

```
POST /api/parse
```

## 2. Reasoning

Logical policy reasoning.

```
POST /api/reason
```

## 3. Generate ODRL

Initial or regenerated Turtle output.

```
POST /api/generate
```

## 4. Validate (SHACL)

```
POST /api/validate
```

---

# File Upload Parsing

```
POST /api/parse-file
```

Supports:

* `.txt`
* `.md`
* `.docx`

Returns:

* extracted text
* char count
* metadata

---

# SSE: Agent Status Streaming

```
GET /api/agent-status/{session_id}
```

Streaming events include:

* `pending`
* `active`
* `done`
* `error`
* keepalive ping

---

# Custom Model System

Stored at:

```
config/custom_models.json
```

### List all models

```
GET /api/custom-models
```

### Add / Update

```
POST /api/custom-models
```

### Delete

```
DELETE /api/custom-models/{value}
```

### Export

```
GET /api/custom-models/export
```

### Import

```
POST /api/custom-models/import
```

---

# Storage API (Document / Embedding)

```
/api/storage/write
/api/storage/read
/api/storage/delete
```

Supports embedding pipelines and document persistence.

---

# Debug Tools

Check for config, missing files, JSON validity:

```
GET /api/debug/config
```
