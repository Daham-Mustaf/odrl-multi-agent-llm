#!/bin/bash
set -e

echo "🚀 ODRL Production Deployment"
echo "=============================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Don't run as root"
   exit 1
fi

# Check environment variables
if [ -z "$GROQ_API_KEY" ]; then
    echo "❌ GROQ_API_KEY not set"
    echo "   Run: export GROQ_API_KEY='your_key'"
    exit 1
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Stop old containers
echo "⏹️  Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# Start new containers
echo "▶️  Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "⏳ Waiting for services..."
sleep 10

# Check health
echo "🏥 Health check..."
curl -f http://localhost:8000/health || echo "❌ Backend unhealthy"
curl -f http://localhost/ || echo "❌ Frontend unhealthy"

echo "✅ Deployment complete!"
docker-compose -f docker-compose.prod.yml ps