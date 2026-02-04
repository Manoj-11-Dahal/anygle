#!/bin/bash
set -e

echo "🚀 Anygle Bun WebSocket Server Deployment"
echo "=========================================="

# Check dependencies
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis CLI not found. Make sure Redis is installed."
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
bun install

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo "🔄 Starting Redis..."
    redis-server --daemonize yes --maxmemory 512mb --maxmemory-policy allkeys-lru
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
bun run build

# Start server (single instance for dev, use cluster.ts for production)
if [ "$1" == "cluster" ]; then
    echo "🚀 Starting in cluster mode..."
    bun run cluster
elif [ "$1" == "dev" ]; then
    echo "🚀 Starting in development mode..."
    bun run dev
else
    echo "🚀 Starting server..."
    bun run start
fi
