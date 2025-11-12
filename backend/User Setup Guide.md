# 🚀 ODRL Policy Generator - User Setup Guide

## 📋 Table of Contents
1. [Quick Start (5 minutes)](#quick-start)
2. [Installation Options](#installation-options)
3. [LLM Configuration](#llm-configuration)
4. [First-Time Usage](#first-time-usage)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start (Choose Your Path)

### Path A: **I have nothing installed** (Easiest - FREE)
**Time: 5 minutes**
```bash
# 1. Clone repository
git clone https://github.com/your-repo/odrl-generator.git
cd odrl-generator

# 2. Install dependencies
pip install -r requirements.txt

# 3. Get FREE Groq API key (30 seconds)
# Visit: https://console.groq.com/keys
# Copy your key

# 4. Configure
cd backend
cp .env.example .env
nano .env  # Add your Groq key

# 5. Run
uvicorn main:app --reload

# 6. Open browser
# http://localhost:8000  -> Backend API
# Open frontend/index.html in browser -> GUI
```

### Path B: **I have local Ollama**
**Time: 3 minutes**
```bash
# Prerequisites: Ollama installed and running
# Download models: ollama pull llama3.1:8b

# 1. Clone and install
git clone https://github.com/your-repo/odrl-generator.git
cd odrl-generator
pip install -r requirements.txt

# 2. Configure for local
cd backend
cp .env.example .env
# Edit .env:
# ENABLE_OLLAMA=true
# DEFAULT_MODEL=ollama:llama3.1:8b

# 3. Run
uvicorn main:app --reload
```

### Path C: **I have university/research server access**
**Time: 2 minutes**
```bash
# Prerequisites: Access to FITS/Ollama server

# 1. Clone and install
git clone https://github.com/your-repo/odrl-generator.git
cd odrl-generator
pip install -r requirements.txt

# 2. Configure for remote server
cd backend
cp .env.example .env
# Edit .env:
# ENABLE_FITS=true
# FITS_SERVER_URL=http://your-server:11434
# FITS_API_KEY=your_key
# DEFAULT_MODEL=ollama:llama3.1:70b

# 3. Run
uvicorn main:app --reload
```

---

## 📦 Installation Options

### Option 1: **FREE Cloud (Recommended for Demos)**

**What you need:**
- Just a Groq API key (FREE, no credit card)

**Steps:**
1. Visit https://console.groq.com/keys
2. Sign up (Google/GitHub)
3. Create API key
4. Copy key starting with `gsk_...`

**Configuration:**
```bash
# backend/.env
ENABLE_GROQ=true
GROQ_API_KEY=gsk_your_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

**Pros:**
- ✅ Completely FREE
- ✅ Very fast (optimized hardware)
- ✅ No installation needed
- ✅ Works on any computer

**Cons:**
- ⚠️ Requires internet
- ⚠️ Rate limited (30 requests/minute)

---

### Option 2: **Local Ollama (Recommended for Privacy)**

**What you need:**
- 8GB+ RAM (16GB recommended)
- 10GB disk space for models

**Steps:**
1. Install Ollama: https://ollama.com/download
   - **Windows:** Download installer
   - **Mac:** `brew install ollama`
   - **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`

2. Download models:
```bash
# Small model (8GB RAM)
ollama pull llama3.1:8b

# Large model (16GB+ RAM)
ollama pull llama3.1:70b

# Verify it's running
ollama list
```

3. Configure:
```bash
# backend/.env
ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=ollama:llama3.1:8b
```

**Pros:**
- ✅ Completely private/offline
- ✅ No API keys needed
- ✅ Unlimited usage

**Cons:**
- ⚠️ Requires powerful hardware
- ⚠️ Slower than cloud

---

### Option 3: **University/Research Server**

**What you need:**
- Access credentials to FITS/Ollama server
- VPN if required

**Steps:**
1. Get server details from IT/admin:
   - Server URL (e.g., `http://dgx-server.university.edu:11434`)
   - API key (if required)
   - Available models

2. Configure:
```bash
# backend/.env
ENABLE_FITS=true
FITS_SERVER_URL=http://your-server:11434
FITS_API_KEY=your_key_if_required
DEFAULT_MODEL=ollama:llama3.1:70b
```

**Pros:**
- ✅ Access to powerful models (70B, 405B)
- ✅ Fast processing
- ✅ Institutional support

**Cons:**
- ⚠️ Requires institutional access
- ⚠️ May have usage policies

---

### Option 4: **Commercial Cloud (OpenAI, Claude)**

**What you need:**
- API key from provider
- Payment method (paid services)

**Steps:**

**For OpenAI:**
1. Visit https://platform.openai.com/signup
2. Add payment method
3. Create API key
4. Configure:
```bash
# backend/.env
ENABLE_OPENAI=true
OPENAI_API_KEY=sk-proj-your_key_here
DEFAULT_MODEL=openai:gpt-4
```

**For Anthropic Claude:**
1. Visit https://console.anthropic.com/
2. Add payment method
3. Create API key
4. Configure:
```bash
# backend/.env
ENABLE_ANTHROPIC=true
ANTHROPIC_API_KEY=sk-ant-your_key_here
DEFAULT_MODEL=anthropic:claude-3-sonnet-20240229
```

**Pros:**
- ✅ Highest quality models
- ✅ Very reliable
- ✅ No hardware needed

**Cons:**
- ⚠️ Costs money ($)
- ⚠️ Usage tracking

---

## 🔧 Complete Configuration Guide

### Minimal `.env` (Groq - FREE)
```bash
ENABLE_GROQ=true
GROQ_API_KEY=gsk_xxxxxxxxxxxx
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

### Complete `.env` (All Options)
```bash
# ============================================
# PROVIDER TOGGLES
# ============================================
ENABLE_OLLAMA=false          # Local Ollama
ENABLE_FITS=false            # University server
ENABLE_GROQ=true             # Groq (FREE)
ENABLE_OPENAI=false          # OpenAI (paid)
ENABLE_ANTHROPIC=false       # Claude (paid)

# ============================================
# LOCAL OLLAMA
# ============================================
OLLAMA_BASE_URL=http://localhost:11434

# ============================================
# REMOTE SERVER (FITS)
# ============================================
FITS_SERVER_URL=http://your-server:11434
FITS_API_KEY=your_key_here

# ============================================
# GROQ (FREE)
# ============================================
GROQ_API_KEY=gsk_xxxxxxxxxxxx

# ============================================
# OPENAI (PAID)
# ============================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx

# ============================================
# ANTHROPIC (PAID)
# ============================================
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# ============================================
# DEFAULT MODEL
# ============================================
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

---

## 🎮 First-Time Usage

### Step 1: Start Backend
```bash
cd backend
uvicorn main:app --reload

# You should see:
# 🚀 Starting ODRL Policy Generator API
# 📍 API: http://localhost:8000
# ✅ Backend Connected
```

### Step 2: Open GUI
```bash
# Option A: Direct file (simple)
# Open frontend/index.html in your browser

# Option B: Local web server (recommended)
cd frontend
python -m http.server 3000
# Open: http://localhost:3000

# Option C: Use the React build
npm install
npm start
# Opens automatically at http://localhost:3000
```

### Step 3: Verify Connection
1. Look for green "Backend Connected" indicator
2. Check available providers in dropdown
3. See your models listed

### Step 4: Try Example
1. Click an example policy (e.g., "Document Policy")
2. Click "Start Processing"
3. Watch agents work through pipeline
4. Download generated ODRL policy

---

## 🎯 Usage Patterns

### Pattern 1: **Quick Demo (1 minute)**
```
1. Load example → "Academic Dataset"
2. Enable "Auto-progress"
3. Click "Start Processing"
4. Wait ~30 seconds
5. Download ODRL JSON
```

### Pattern 2: **Custom Policy (3 minutes)**
```
1. Write your policy in natural language
2. Select model (recommend: Groq for speed)
3. Adjust temperature (0.3 = precise, 0.7 = creative)
4. Click "Start Processing"
5. Review each agent's output
6. Export full report
```

### Pattern 3: **Model Comparison (5 minutes)**
```
1. Write policy description
2. Process with Model A (e.g., Groq Llama 3.1)
3. Save results
4. Switch to Model B (e.g., GPT-4)
5. Process again
6. Compare outputs and timing
```

### Pattern 4: **Batch Processing (10 minutes)**
```
1. Prepare list of policies
2. For each policy:
   - Input text
   - Process
   - Download result
3. Collect all ODRL files
```

---

## 🛠️ Troubleshooting

### Problem: "Backend not connected"

**Cause:** Backend server not running

**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not, start it:
cd backend
uvicorn main:app --reload
```

---

### Problem: "No providers available"

**Cause:** No LLM providers configured in `.env`

**Solution:**
```bash
cd backend
cat .env  # Check configuration

# Enable at least one provider:
ENABLE_GROQ=true
GROQ_API_KEY=your_key_here
```

---

### Problem: "Parsing failed" or "Model error"

**Causes:**
1. Wrong API key
2. Model not available
3. Rate limit exceeded

**Solutions:**

**Check API key:**
```bash
# Test Groq key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Check Ollama:**
```bash
curl http://localhost:11434/api/tags
```

**Rate limit?**
- Wait 1 minute and retry
- Or switch to different provider

---

### Problem: "Ollama not found"

**Cause:** Ollama not installed or not running

**Solution:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start service
ollama serve

# Download model
ollama pull llama3.1:8b

# Verify
ollama list
```

---

### Problem: Slow performance

**Solutions:**

1. **Use faster model:**
   - Switch from `llama3.1:70b` to `llama3.1:8b`
   - Or use Groq (cloud is faster)

2. **Reduce context:**
   - Write shorter policy descriptions
   - Use simpler language

3. **Lower temperature:**
   - Set to 0.1-0.3 for faster generation

---

### Problem: Out of memory (Ollama)

**Solutions:**

1. **Use smaller model:**
```bash
# Instead of 70b (needs 40GB RAM)
ollama pull llama3.1:8b  # Needs only 8GB RAM
```

2. **Use cloud provider:**
```bash
# Switch to Groq (FREE, no RAM needed)
ENABLE_GROQ=true
```

---

## 📊 Requirements Summary

### Minimum Requirements

**For Groq (Cloud):**
- Computer with internet
- Any OS (Windows/Mac/Linux)
- 2GB RAM
- No GPU needed
- ✅ **Easiest option!**

**For Local Ollama:**
- 8GB RAM (16GB recommended)
- 10GB disk space
- Modern CPU
- Optional: GPU for speed

**For All Options:**
- Python 3.8+
- Web browser
- Terminal/command line

---

## 🎓 What Users Should Know

### Before Starting:
1. ✅ Basic terminal/command line usage
2. ✅ How to edit text files (`.env`)
3. ✅ Web browser basics
4. ✅ ODRL basics (helpful but not required)

### You DON'T need to know:
- ❌ Programming/coding
- ❌ Machine learning
- ❌ LLM internals
- ❌ Docker/Kubernetes
- ❌ Database management

---

## 🚀 Recommended Setup for Different Users

### 👨‍🎓 **Students/Researchers**
```bash
# Use FREE Groq
ENABLE_GROQ=true
GROQ_API_KEY=gsk_xxx
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```
**Why:** Free, fast, no installation

---

### 🏢 **Enterprise/Production**
```bash
# Use institutional server
ENABLE_FITS=true
FITS_SERVER_URL=http://internal-server:11434
DEFAULT_MODEL=ollama:llama3.1:70b
```
**Why:** Controlled, private, powerful

---

### 🔒 **Privacy-Focused Users**
```bash
# Use local Ollama
ENABLE_OLLAMA=true
DEFAULT_MODEL=ollama:llama3.1:8b
```
**Why:** Completely offline, no data leaves your computer

---

### 🎬 **Demo/Presentation**
```bash
# Enable multiple for flexibility
ENABLE_GROQ=true
ENABLE_OPENAI=true
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
```
**Why:** Show different models, switch on-the-fly

---


### Getting Help
1. Check error message in GUI
2. Check terminal output (backend logs)
3. Verify `.env` configuration
4. Test with example policies first
5. Try different model/provider

### Common Commands
```bash
# Check backend status
curl http://localhost:8000/health

# List available providers
curl http://localhost:8000/api/available-providers

# View backend logs
cd backend
uvicorn main:app --reload  # Watch console output
```

---

## ✅ Success Checklist

Before using the system, verify:

- [ ] Python 3.8+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured with at least one provider
- [ ] Backend starts without errors
- [ ] GUI shows "Backend Connected"
- [ ] At least one provider appears in dropdown
- [ ] Example policy processes successfully

**All checked?** You're ready to generate ODRL policies! 🎉

---

## 🎯 Next Steps

1. ✅ Complete setup using this guide
2. ✅ Try all 4 example policies
3. ✅ Write your first custom policy
4. ✅ Experiment with different models
5. ✅ Export and use generated ODRL policies
6. ✅ Read ODRL documentation for advanced usage

**Happy policy generating! 🚀**