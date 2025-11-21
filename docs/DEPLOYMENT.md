# Ubuntu Deployment Guide - ODRL Multi-Agent System

## Prerequisites
- Ubuntu 22.04+ server
- Server accessible IP (e.g., 10.223.196.212)
- Groq API key

## Step 1: Install Dependencies
cd ~
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

## Step 2: Clone Repository
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm

## Step 3: Configure Backend
cd backend
cp .env.example .env
nano .env
# Set: ENABLE_GROQ=true
# Set: GROQ_API_KEY=your_key
# Set: DEFAULT_MODEL=groq:llama-3.3-70b-versatile
uv sync

## Step 4: Configure Frontend
cd ../frontend
cp .env.example .env
nano .env
# Set: REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
# Set: DISABLE_ESLINT_PLUGIN=true
npm install

## Step 5: Open Firewall
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp

## Step 6: Start Services (tmux)
tmux new -s odrl
# Window 0 - Backend:
cd ~/odrl-multi-agent-llm/backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
# Press Ctrl+B, then C for new window
# Window 1 - Frontend:
cd ~/odrl-multi-agent-llm/frontend
HOST=0.0.0.0 PORT=3000 npm start
# Press Ctrl+B, then D to detach

## Access Application
http://YOUR_SERVER_IP:3000

## Manage Services
tmux attach -s odrl        # View services
tmux kill-session -s odrl  # Stop services