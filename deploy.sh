#!/bin/bash
set -e

echo "🚀 Anygle Deployment Script"
echo "============================"

# Check if running as root (for production deployment)
if [ "$EUID" -ne 0 ] && [ "$1" == "production" ]; then
    echo "❌ Please run as root for production deployment"
    exit 1
fi

# Mode selection
MODE=${1:-development}
echo "📦 Mode: $MODE"

# Install dependencies if needed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p nginx/ssl
mkdir -p backend/storage/framework/cache/data
mkdir -p backend/storage/framework/sessions
mkdir -p backend/storage/framework/views
mkdir -p backend/storage/logs
mkdir -p backend/bootstrap/cache

# Copy environment files if they don't exist
if [ ! -f backend/.env ]; then
    echo "⚙️  Creating backend .env file..."
    cp backend/.env.example backend/.env
    
    # Generate app key
    if command -v php &> /dev/null; then
        cd backend && php artisan key:generate && cd ..
    fi
fi

# SSL Certificate generation (self-signed for development)
if [ "$MODE" == "development" ] && [ ! -f nginx/ssl/anygle.crt ]; then
    echo "🔐 Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/anygle.key \
        -out nginx/ssl/anygle.crt \
        -subj "/C=US/ST=State/L=City/O=Anygle/CN=localhost"
    echo "✅ Self-signed certificate generated"
elif [ "$MODE" == "production" ] && [ ! -f nginx/ssl/anygle.crt ]; then
    echo "⚠️  Please place your SSL certificates in nginx/ssl/"
    echo "   - nginx/ssl/anygle.crt (certificate)"
    echo "   - nginx/ssl/anygle.key (private key)"
fi

# Set proper permissions
echo "🔒 Setting permissions..."
chmod -R 755 backend/storage
chmod -R 755 backend/bootstrap/cache

if [ "$MODE" == "development" ]; then
    chmod 644 nginx/ssl/anygle.crt
    chmod 600 nginx/ssl/anygle.key
fi

# Build and start containers
echo "🐳 Building and starting containers..."
docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking services..."

if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Check MySQL
    if docker-compose exec -T mysql mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
        echo "✅ MySQL is ready"
    else
        echo "⚠️  MySQL is still starting..."
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis is ready"
    else
        echo "⚠️  Redis is still starting..."
    fi
    
    # Check PHP-FPM
    if docker-compose exec -T anygle-app php-fpm -t 2>/dev/null | grep -q "successful"; then
        echo "✅ PHP-FPM is ready"
    else
        echo "⚠️  PHP-FPM is still starting..."
    fi
    
    # Run migrations
    echo "🗄️  Running database migrations..."
    docker-compose exec -T anygle-app php artisan migrate --force || true
    
    # Seed database
    echo "🌱 Seeding database..."
    docker-compose exec -T anygle-app php artisan db:seed --force || true
    
    # Cache configuration
    echo "💾 Caching configuration..."
    docker-compose exec -T anygle-app php artisan config:cache || true
    docker-compose exec -T anygle-app php artisan route:cache || true
    docker-compose exec -T anygle-app php artisan view:cache || true
    
    echo ""
    echo "🎉 Anygle is ready!"
    echo ""
    echo "📍 URLs:"
    if [ "$MODE" == "development" ]; then
        echo "   - Frontend: http://localhost"
        echo "   - API: http://localhost/api"
        echo "   - Soketi (WebSocket): http://localhost:6001"
    else
        echo "   - Frontend: https://anygle.com"
        echo "   - API: https://anygle.com/api"
        echo "   - Soketi (WebSocket): https://anygle.com:6001"
    fi
    echo ""
    echo "📝 Useful commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Restart: docker-compose restart"
    echo "   - Stop: docker-compose down"
    echo "   - Shell: docker-compose exec anygle-app bash"
    echo ""
else
    echo "❌ Failed to start services"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
