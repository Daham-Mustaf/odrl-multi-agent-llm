```markdown
# ODRL Multi-Agent LLM - Ubuntu Deployment Guide

## Prerequisites
- Ubuntu 22.04 or later
- Git installed
- Port 8000 and 3000 available


### 1. Install UV (Python Package Manager)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone Repository
```bash
cd ~
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm
```

### 4. Setup Backend
```bash
cd backend
cp .env.example .env
nano .env
```

**Configure `.env`:**
```bash
ENABLE_GROQ=true
GROQ_API_KEY=your_groq_api_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
DEFAULT_TEMPERATURE=0.3
```

**Install dependencies:**
```bash
uv sync
```

### 5. Setup Frontend
```bash
cd ../frontend
cat > .env << 'EOF'
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
DISABLE_ESLINT_PLUGIN=true
EOF

npm install
```

### 6. Run Services with tmux

**Start tmux:**
```bash
tmux new -s odrl
```

**Window 0 - Backend:**
```bash
cd ~/odrl-multi-agent-llm/backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

**Create new window (Ctrl+B, then C)**

**Window 1 - Frontend:**
```bash
cd ~/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 PORT=3000 npm start
```

**Detach: Ctrl+B, then D**

## Access Application
- **Frontend:** http://YOUR_SERVER_IP:3000
- **Backend API:** http://YOUR_SERVER_IP:8000/docs

## tmux Commands
```bash
# Reattach to session
tmux attach -s odrl

# Switch windows
Ctrl+B, then 0  # Backend
Ctrl+B, then 1  # Frontend

# Detach
Ctrl+B, then D

# Kill session
tmux kill-session -s odrl
```

## Auto-Start on Boot

### Backend Service
```bash
sudo nano /etc/systemd/system/odrl-backend.service
```

```ini
[Unit]
Description=ODRL Backend API
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/odrl-multi-agent-llm/backend
Environment="PATH=/home/YOUR_USERNAME/.local/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/YOUR_USERNAME/.local/bin/uv run uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable odrl-backend
sudo systemctl start odrl-backend
sudo systemctl status odrl-backend
```

## Update Deployment
```bash
cd ~/odrl-multi-agent-llm
git pull origin main
cd backend && uv sync
cd ../frontend && npm install
tmux kill-session -t odrl
# Then restart services (Step 6)
```

## Firewall Configuration
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
sudo ufw status
```

## Troubleshooting

**Check backend:**
```bash
curl http://localhost:8000/health
```

**Check frontend:**
```bash
curl http://localhost:3000
```

**View logs:**
```bash
tmux attach -s odrl
# Or for systemd:
sudo journalctl -u odrl-backend -f
```

**Restart services:**
```bash
tmux kill-session -t odrl
# Then start again (Step 6)
```

## System Requirements
- **RAM:** 2GB minimum, 4GB recommended
- **Disk:** 2GB for dependencies
- **CPU:** 2 cores recommended
- **Network:** Ports 8000 and 3000 open

## Support
For issues: https://github.com/Daham-Mustaf/odrl-multi-agent-llm/issues
```
