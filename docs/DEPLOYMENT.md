# ODRL Deployment Guide - Ubuntu Server

## What You Need
- Ubuntu 22.04+ server
- Server IP (example: 10.223.196.212)
- Groq API key from console.groq.com

---

## SSH Connection

### Connect to Server
```bash
ssh username@YOUR_SERVER_IP
# Example: ssh operation@10.223.196.212
```

---

## Installation (One-Time Setup)

### 1. Install Tools
```bash
# Install UV (Python)
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clone Project
```bash
cd ~
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm
```

### 3. Setup Backend
```bash
cd backend
cp .env.example .env
nano .env
```

Edit in nano:
```
ENABLE_GROQ=true
GROQ_API_KEY=your_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
uv sync
```

### 4. Setup Frontend
```bash
cd ../frontend
cp .env.example .env
nano .env
```

Edit in nano (IMPORTANT - use YOUR server IP):
```
REACT_APP_API_URL=http://10.223.196.212:8000
DISABLE_ESLINT_PLUGIN=true
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
npm install
```

### 5. Open Firewall
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
```

---

## Running with Two Terminals

### Terminal 1: Backend

**SSH into server:**
```bash
ssh username@YOUR_SERVER_IP
```

**Start backend:**
```bash
cd ~/odrl-multi-agent-llm/backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

**Leave this terminal running!**

---

### Terminal 2: Frontend

**Open NEW terminal/PowerShell window**

**SSH into server again:**
```bash
ssh username@YOUR_SERVER_IP
```

**Start frontend:**
```bash
cd ~/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 PORT=3000 npm start
```

**Leave this terminal running!**

---

## Access Application

Open browser:
```
http://YOUR_SERVER_IP:3000
```

Example: http://10.223.196.212:3000

---

## Stopping Services

In each terminal, press: `Ctrl+C`

---

## If Firewall Blocks Ports

### Use SSH Tunnel (from your computer)

**Windows PowerShell / Mac Terminal:**
```bash
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 username@YOUR_SERVER_IP
```

**Keep this terminal open**

Then access:
```
http://localhost:3000
```

---

## Update Application

### Stop both terminals (Ctrl+C in each)

### Update code:
```bash
cd ~/odrl-multi-agent-llm
git pull origin main
```

### Update backend:
```bash
cd backend
uv sync
```

### Update frontend:
```bash
cd frontend
npm install
```

### Restart both terminals (follow "Running with Two Terminals" section)

---

## Troubleshooting

### Backend Offline?

**Check backend terminal** - should show:
```
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Test backend:**
```bash
curl http://localhost:8000/health
```

### Frontend .env Wrong?

```bash
cd ~/odrl-multi-agent-llm/frontend
cat .env
```

Should show: `REACT_APP_API_URL=http://YOUR_SERVER_IP:8000`

If wrong:
```bash
nano .env
# Fix it
# Ctrl+O, Enter, Ctrl+X
# Restart Terminal 2
```

### Port Already in Use?

```bash
# Kill process on port 8000
sudo fuser -k 8000/tcp

# Kill process on port 3000
sudo fuser -k 3000/tcp
```

---

## Quick Reference

**Two Terminal Setup:**
- Terminal 1: Backend on port 8000
- Terminal 2: Frontend on port 3000

**Both must be running**

**Stop:** Ctrl+C in each terminal

**Access:** http://YOUR_SERVER_IP:3000