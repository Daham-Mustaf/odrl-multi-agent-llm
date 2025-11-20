# ODRL Multi-Agent LLM - Ubuntu Deployment Guide (uv)

## Prerequisites
- Ubuntu 22.04+
- Python 3.11+ (avoid 3.14 - has Pydantic compatibility issues)
- Node.js 20.x
- uv (Python package manager)
- Git

## Quick Start with uv

### Backend Setup
```bash
cd /home/operation/src/odrl-multi-agent-llm/backend

# uv automatically creates .venv on first sync
uv sync

# Activate virtual environment
. .venv/bin/activate

# Configure environment
cp .env.example .env
nano .env  # Add your API keys

# Run backend (accessible from network)
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd /home/operation/src/odrl-multi-agent-llm/frontend

# Install Node.js 20.x (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Run frontend (accessible from network)
HOST=0.0.0.0 PORT=3000 npm start
```

## Access URLs
- **Backend API**: http://10.33.42.87:8000/docs
- **Frontend**: http://10.33.42.87:3000

## Using tmux (Run Both Together)
```bash
# Install tmux
sudo apt install tmux -y

# Start tmux
tmux

# Window 1 - Backend
cd /home/operation/src/odrl-multi-agent-llm/backend
. .venv/bin/activate
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Create new window: Ctrl+B then C

# Window 2 - Frontend
cd /home/operation/src/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 npm start

# Switch windows: Ctrl+B then 0/1
# Detach: Ctrl+B then D
# Reattach: tmux attach
```

## Firewall Configuration
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw status
```

## uv Commands Reference

```bash
# Sync dependencies (creates .venv automatically)
uv sync

# Install specific package
uv pip install package-name

# Install from requirements.txt
uv pip install -r requirements.txt

# Run command in uv environment
uv run uvicorn main:app --reload

# Update dependencies
uv sync --upgrade
```

## Troubleshooting

### .venv not created
```bash
cd backend
uv sync  # This creates .venv automatically
```

### Wrong Python version
```bash
# Check Python version
python3 --version

# Use specific Python version with uv
uv venv --python 3.11
uv sync
```

### Backend import errors
```bash
# Make sure langchain_core imports are used
grep -r "from langchain\." agents/ api/ | grep -v "langchain_"
# Should return nothing
```

### FITS Server not accessible
**Problem**: Internal FITS server `dgx.fit.fraunhofer.de` only works on FIT network

**Solution 1** - Use Groq (fast, free):
```bash
# In .env
ENABLE_GROQ=true
GROQ_API_KEY=your_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

**Solution 2** - Use external Ollama:
```bash
# Get API key from https://ollama.fit.fraunhofer.de
FITS_SERVER_URL=https://ollama.fit.fraunhofer.de/api
FITS_API_KEY=your_api_key_here
```

## Configuration

### .env File Structure
```bash
# Provider Toggles
ENABLE_FITS=true
ENABLE_GROQ=true
ENABLE_OLLAMA=false

# FITS (Internal - FIT network only)
FITS_SERVER_URL=http://dgx.fit.fraunhofer.de

# Groq (External - works anywhere)
GROQ_API_KEY=gsk_xxxxx
GROQ_BASE_URL=https://api.groq.com

# Default
DEFAULT_MODEL=ollama:llama3.3:70b
DEFAULT_TEMPERATURE=0.3
```

## Why .venv Might Not Exist

**uv creates .venv on demand:**
- First `uv sync` creates it automatically
- Uses Python version from system
- Stores in `backend/.venv/`

**If missing:**
```bash
cd backend
uv sync  # Creates .venv and installs dependencies
```

## Network Access Issue

Your Ubuntu server **cannot reach** `dgx.fit.fraunhofer.de` because:
1. It's an **internal-only** endpoint
2. Your server is not on FIT internal network
3. Requires VPN or internal network access

**Solutions:**
- Use Groq (recommended for external servers)
- Get external Ollama API key
- Move server to FIT internal network
```

Save: **Ctrl+X, Y, Enter**

---

### 2. **Why No .venv on Ubuntu?**

**Answer**: You need to create it with `uv sync`:

```bash
cd /home/operation/src/odrl-multi-agent-llm/backend

# This creates .venv automatically
uv sync

# Verify it exists
ls -la .venv/
```

---

### 3. **Why FITS Server Doesn't Work?**

```bash
# Test connection
ping dgx.fit.fraunhofer.de
# Result: 100% packet loss ❌
```

**Problem**: `dgx.fit.fraunhofer.de` is **internal-only**, but your Ubuntu server is **not on FIT internal network**.

**Solution**: Use Groq instead:

```bash
cd backend
nano .env
```

Change:
```bash
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

---

### 4. **Complete Setup Script**

```bash
# Backend
cd /home/operation/src/odrl-multi-agent-llm/backend
uv sync
. .venv/bin/activate

# Frontend  
cd ../frontend
npm install

# Run with tmux
tmux
# Window 1: Backend
cd /home/operation/src/odrl-multi-agent-llm/backend
. .venv/bin/activate
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Ctrl+B, C (new window)
# Window 2: Frontend
cd /home/operation/src/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 npm start
```

