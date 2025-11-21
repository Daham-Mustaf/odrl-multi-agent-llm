# ODRL Multi-Agent LLM - Deployment Guide

## Quick Deployment (Ubuntu with UV)

### Prerequisites
- Ubuntu 22.04+
- Git
- Internet connection

### Installation
```bash
# 1. Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# 2. Clone repository
git clone https://github.com/Daham-Mustaf/odrl-multi-agent-llm.git
cd odrl-multi-agent-llm/backend

# 3. Configure environment
cp .env.example .env
nano .env  # Add your API keys

# 4. Install dependencies
uv sync

# 5. Run backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Access
- **API**: http://YOUR_SERVER_IP:8000/docs
- **Health**: http://YOUR_SERVER_IP:8000/health

### Production Setup

#### Auto-start on Boot
```bash
sudo nano /etc/systemd/system/odrl-backend.service
```

**Service file:**
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
```

### Updates
```bash
cd ~/odrl-multi-agent-llm
git pull origin main
cd backend
uv sync
sudo systemctl restart odrl-backend
```

### Firewall
```bash
sudo ufw allow 8000/tcp
sudo ufw enable
```

## Docker Deployment (Alternative)
```bash
# Build and run
docker-compose up -d

# Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000/docs
```

## Environment Variables

Required in `.env`:
```bash
ENABLE_GROQ=true
GROQ_API_KEY=your_key_here
DEFAULT_MODEL=groq:llama-3.3-70b-versatile
```

## Troubleshooting

**Backend won't start:**
```bash
# Check logs
sudo journalctl -u odrl-backend -f

# Test manually
cd ~/odrl-multi-agent-llm/backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

**Connection refused:**
```bash
# Check firewall
sudo ufw status

# Check service
sudo systemctl status odrl-backend
```

## System Requirements

- **Python**: 3.11+ (managed by UV)
- **RAM**: 2GB minimum, 4GB recommended
- **Disk**: 2GB for dependencies
- **Network**: Port 8000 open

## Support

For issues, see [GitHub Issues](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/issues)