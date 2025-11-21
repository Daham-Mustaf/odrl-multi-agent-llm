# Ubuntu Deployment Guide

## 📋 What You Need

- Ubuntu 22.04+
- Server IP address (example: `10.223.196.212`)
- Your Groq API key

## Installation (One Terminal)

### Step 1: Install Tools
```bash
# Install UV (Python manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
uv --version
node --version
```

### Step 2: Get Code
```bash
cd ~
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm
```

### Step 3: Setup Backend
```bash
cd backend
cp .env.example .env
nano .env
```

**Edit these lines (press Ctrl+O to save, Ctrl+X to exit):**
```bash
ENABLE_GROQ=true
GROQ_API_KEY=paste_your_groq_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

**Install backend:**
```bash
uv sync
```

### Step 4: Setup Frontend
```bash
cd ~/odrl-multi-agent-llm/frontend
cp .env.example .env
nano .env
```

**Edit this line (replace with YOUR server IP):**
```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
DISABLE_ESLINT_PLUGIN=true
```
ex:
```bash
REACT_APP_API_URL=http://10.223.196.212:8000
```

**Install frontend:**
```bash
npm install
```

### Step 5: Open Firewall
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

---

## Running (Use tmux)

### Start tmux Session
```bash
tmux new -s odrl
```

**You are now in tmux Window 0**

### Window 0: Start Backend
```bash
cd ~/odrl-multi-agent-llm/backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

**Wait for:**
```
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

Backend is running!

**Create second window:**
- Press `Ctrl+B`
- Then press `C` (letter C)

### Window 1: Start Frontend

**You are now in a NEW window**
```bash
cd ~/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 PORT=3000 npm start
```

**Wait for:**
```
webpack compiled successfully
```

Frontend is running!

### Exit tmux (Keep Services Running)

- Press `Ctrl+B`
- Then press `D`

**Both services continue running in background!**

---

## Access Your Application

Open browser on ANY computer:

- **Application:** `http://YOUR_SERVER_IP:3000`
- **API Docs:** `http://YOUR_SERVER_IP:8000/docs`

Example: `http://10.223.196.212:3000`

---

## Managing Services

### View Running Services
```bash
tmux attach -s odrl
```

**You're back in tmux!**

- Press `Ctrl+B` then `0` → See backend
- Press `Ctrl+B` then `1` → See frontend
- Press `Ctrl+B` then `D` → Exit (keeps running)

### Stop Services
```bash
tmux kill-session -t odrl
```

### Restart Services
```bash
# Stop
tmux kill-session -t odrl

# Start again (repeat "Running" section above)
tmux new -s odrl
# ... follow Window 0 and Window 1 steps
```

---

##  Update Application
```bash
# Stop services
tmux kill-session -t odrl

# Update code
cd ~/odrl-multi-agent-llm
git pull origin main

# Update backend
cd backend
uv sync

# Update frontend
cd ../frontend
npm install

# Start services again (see "Running" section)
```

---

## Auto-Start on Boot (Optional)

### Create Service File
```bash
sudo nano /etc/systemd/system/odrl-backend.service
```

**Paste this (replace YOUR_USERNAME with your username):**
```ini
[Unit]
Description=ODRL Backend
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/odrl-multi-agent-llm/backend
Environment="PATH=/home/YOUR_USERNAME/.local/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/YOUR_USERNAME/.local/bin/uv run uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable odrl-backend
sudo systemctl start odrl-backend
```

### Check Service Status
```bash
sudo systemctl status odrl-backend
```

---

## Quick Test
```bash
# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000
```

Both should respond!

---

## Troubleshooting

### Backend not working?
```bash
# View backend logs
tmux attach -s odrl
# Press Ctrl+B, then 0
# Look for errors
```

### Frontend not working?
```bash
# View frontend logs
tmux attach -s odrl
# Press Ctrl+B, then 1
# Look for errors
```

### Port already in use?
```bash
# Find what's using port 8000
sudo lsof -i :8000

# Kill it (replace PID with actual number)
sudo kill -9 PID
```

### Start fresh?
```bash
# Remove everything
rm -rf ~/odrl-multi-agent-llm

# Start from Step 2 (Get Code)
```

---

## Summary

**Number of terminals needed:** 1 (tmux creates virtual windows)

**Directories:**
- Installation: `~/odrl-multi-agent-llm`
- Backend: `~/odrl-multi-agent-llm/backend`
- Frontend: `~/odrl-multi-agent-llm/frontend`

**Ports:**
- Backend: 8000
- Frontend: 3000

**Key Commands:**
- Start: `tmux new -s odrl`
- View: `tmux attach -s odrl`
- Stop: `tmux kill-session -t odrl`
- Switch windows in tmux: `Ctrl+B` then `0` or `1`

---

## 🆘 Need Help?

Report issues: https://github.com/Daham-Mustaf/odrl-multi-agent-llm/issues