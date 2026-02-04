# Anygle - Anonymous Video Chat Platform

Anygle is a modern, scalable anonymous chat platform with real-time video, voice, and text chat. Built with React, Vite, Laravel, and WebSockets.

## 🎯 Features

- **Anonymous Chat**: No sign-up required, instant connections
- **Video/Voice/Text**: Multiple communication modes
- **Age Categories**: Teen (13-17) and Adult (18+) zones
- **Moderated/Unmoderated Queues**: User choice for content filtering
- **Real-time Matching**: Sub-second match times
- **WebRTC Video**: Peer-to-peer video with blur/mask options
- **Public Dashboard**: Live platform statistics
- **Strong Moderation**: Pattern-based content filtering

## 🧱 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Socket.io** for real-time communication

### Backend (Laravel Option)
- **Laravel 11** (PHP 8.3+)
- **MySQL** for persistent storage
- **Redis** for queues and caching
- **Soketi** for WebSocket broadcasting
- **Sanctum** for API authentication

### Backend (Bun Option - Ultra Fast)
- **Bun** runtime
- **uWebSockets.js** for WebSocket handling
- **Redis** for state management
- **msgpack** for binary serialization

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/anygle.git
cd anygle

# Run deployment script
chmod +x deploy.sh
./deploy.sh development

# Or for production with SSL:
# ./deploy.sh production
```

### Option 2: Manual Setup

#### Frontend
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
```

#### Backend (Laravel)
```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate

# Start server
php artisan serve
```

#### Backend (Bun - Alternative)
```bash
cd backend

# Install Bun dependencies
bun install

# Start in dev mode
bun run dev

# Or production with clustering
bun run cluster
```

## 📁 Project Structure

```
anygle/
├── src/                     # Frontend React app
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API and utilities
│   ├── types/              # TypeScript types
│   └── ...
├── backend/                 # Laravel/Bun backend
│   ├── app/                # Laravel application
│   ├── database/           # Migrations & seeders
│   ├── routes/             # API routes
│   ├── src/                # Bun server source
│   └── ...
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Docker orchestration
└── deploy.sh               # Deployment script
```

## 🔧 Configuration

### Environment Variables

Create `.env` files for both frontend and backend:

#### Frontend (.env)
```
VITE_API_URL=https://anygle.com/api
VITE_WS_HOST=anygle.com
VITE_WS_PORT=443
VITE_WS_KEY=anygle-key
```

#### Backend (.env)
```
APP_NAME=Anygle
APP_ENV=production
APP_KEY=your-app-key
APP_DEBUG=false
APP_URL=https://anygle.com

DB_CONNECTION=mysql
DB_HOST=mysql
DB_DATABASE=anygle
DB_USERNAME=anygle
DB_PASSWORD=your-password

REDIS_HOST=redis
REDIS_PORT=6379

BROADCAST_DRIVER=pusher
PUSHER_APP_ID=anygle
PUSHER_APP_KEY=anygle-key
PUSHER_APP_SECRET=anygle-secret
PUSHER_HOST=soketi
PUSHER_PORT=6001
```

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80, 443 | Web server & load balancer |
| anygle-app | 9000 | Laravel PHP-FPM |
| mysql | 3306 | MySQL database |
| redis | 6379 | Redis cache & queues |
| soketi | 6001 | WebSocket server |
| queue-worker | - | Laravel queue worker |
| scheduler | - | Laravel cron scheduler |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register anonymous user
- `POST /api/auth/heartbeat` - Keep session alive
- `POST /api/auth/logout` - End session

### Chat
- `POST /api/chat/match` - Start matching
- `GET /api/chat/check` - Check match status
- `GET /api/chat/{id}/messages` - Get messages
- `POST /api/chat/{id}/message` - Send message
- `POST /api/chat/{id}/skip` - Skip partner
- `POST /api/chat/{id}/report` - Report user

### Dashboard
- `GET /api/dashboard/public` - Public stats

## 🔒 Security

### Rate Limiting
- 60 requests per minute per IP
- WebSocket message size limit: 16KB
- Connection limits per IP

### Content Moderation
- Pattern-based filtering
- Zero tolerance for illegal content
- Automatic escalation for violations
- Teen protection for under-18 zone

### HTTPS
- SSL certificates required for production
- WebSocket secure (WSS) connections

## 📊 Monitoring

### Health Checks
```bash
# Laravel health
curl https://anygle.com/health

# Bun server health
curl http://localhost:3000/health

# Stats
curl https://anygle.com/api/dashboard/public
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f anygle-app
```

## 🚀 Scaling

### Horizontal Scaling
```bash
# Scale queue workers
docker-compose up -d --scale queue-worker=5

# Use Nginx upstream for multiple PHP-FPM instances
```

### Bun Cluster Mode
```bash
# Use all CPU cores
cd backend
bun run cluster
```

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend Laravel tests
cd backend
php artisan test

# Backend Bun tests
bun test
```

## 📦 Deployment Checklist

- [ ] Set strong APP_KEY in .env
- [ ] Configure MySQL and Redis credentials
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Configure backups
- [ ] Set up monitoring (optional)
- [ ] Test WebSocket connections
- [ ] Verify rate limiting
- [ ] Test moderation system

## 🛠️ Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check if Soketi is running: `docker-compose ps soketi`
- Verify firewall allows port 6001
- Check browser console for errors

#### Database Connection Failed
- Verify MySQL container is running
- Check credentials in .env
- Ensure network connectivity between containers

#### Video/Camera Not Working
- Ensure HTTPS is enabled (required for camera)
- Check browser permissions
- Verify WebRTC STUN servers

#### High Memory Usage
- Scale down queue workers
- Reduce Redis memory limit
- Enable PHP OPcache

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🙏 Credits

Built with ❤️ using:
- React & Vite
- Laravel & PHP
- Bun & uWebSockets
- Tailwind CSS
- Framer Motion

---

**Anygle** - Connect instantly, chat anonymously.
