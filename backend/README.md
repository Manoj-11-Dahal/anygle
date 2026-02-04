# Anygle Backend

Ultra-fast, scalable WebSocket server for anonymous chat matching.

## 🎯 Goals

- **Ultra-fast matching**: <100ms average match time
- **Stateless chats**: No persistent storage, ephemeral sessions
- **Easy to scale**: Horizontal scaling with Redis
- **Strong moderation**: Real-time content filtering

## 🧱 Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun (Node.js compatible) |
| Framework | Fastify + uWebSockets.js |
| Realtime | WebSockets (binary msgpack) |
| Queue/State | Redis |
| Load Balancer | Nginx |
| Deployment | Docker + Docker Compose |

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Redis](https://redis.io) (v7.0+)
- Docker (optional)

### Local Development

```bash
# Install dependencies
bun install

# Copy environment
cp .env.example .env

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run development server
bun run dev
```

### Docker Deployment

```bash
# Build and start
docker-compose up -d

# Scale to 8 workers
docker-compose up -d --scale anygle=8

# View logs
docker-compose logs -f anygle
```

## 📡 WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.binaryType = 'arraybuffer';
```

### Message Format (msgpack)

**Client → Server:**
```typescript
// Join queue
{ type: 'join', data: {
  ageCategory: 'teen' | 'adult',
  mode: 'text' | 'video' | 'voice',
  queueType: 'moderated' | 'unmoderated',
  interests: string[]
}}

// Send message
{ type: 'message', data: { content: string }}

// Skip partner
{ type: 'skip', data: { reason?: string }}

// Typing indicator
{ type: 'typing', data: { isTyping: boolean }}

// Video/audio toggle
{ type: 'video_toggle', data: { enabled: boolean }}
{ type: 'audio_toggle', data: { enabled: boolean }}

// WebRTC signaling
{ type: 'offer' | 'answer' | 'ice_candidate', data: RTCSessionDescriptionInit | RTCIceCandidateInit }

// Keepalive
{ type: 'ping' }
```

**Server → Client:**
```typescript
// Connected
{ type: 'connected', data: { userId: string }}

// Matched with partner
{ type: 'matched', data: {
  roomId: string,
  partnerId: string,
  mode: 'text' | 'video' | 'voice',
  isInitiator: boolean,
  partnerInfo: { interests: string[], sharedInterests: string[] }
}}

// Searching status
{ type: 'searching', data: { position: number, estimatedTime: number }}

// Message from partner
{ type: 'message', data: Message }

// Partner events
{ type: 'partner_typing' | 'partner_video_toggle' | 'partner_audio_toggle' | 'partner_skipped' | 'partner_disconnected' }

// Moderation warning
{ type: 'moderation_warning', data: { message: string, severity: 'low' | 'medium' | 'high' }}

// Stats update
{ type: 'stats', data: { totalOnline: number, inQueue: number, activeChats: number, avgMatchTime: number }}

// Error
{ type: 'error', data: { code: string, message: string }}

// Keepalive response
{ type: 'pong', data: { timestamp: number }}
```

## 🔧 Architecture

### Stateless Design

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Nginx     │────▶│  Worker 1   │
└─────────────┘     │  (LB)       │     └─────────────┘
                    │             │     ┌─────────────┐
┌─────────────┐     │             │────▶│  Worker 2   │
│   Client    │────▶│             │     └─────────────┘
└─────────────┘     └─────────────┘           │
                         │                    │
                         ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    Redis    │◀────│  Worker 3   │
                    │  (State)    │     └─────────────┘
                    └─────────────┘
```

### Matching Algorithm

1. Users join queue with priority score
2. Matching loop runs every 100ms
3. Interest-based matching with wait time fallback
4. WebRTC signaling for video/voice

### Redis Data Structure

```
user:{userId}           → UserSession (JSON, TTL: 1h)
socket:{socketId}       → userId (string, TTL: 1h)
queue:{cat}:{mode}:{type} → SortedSet<QueueEntry> (score: priority + time)
room:{roomId}           → ChatRoom (JSON, TTL: 30min)
stats:global            → Hash {online, activeChats, totalMatches}
banned:ips:{ip}         → reason (TTL: permanent)
banned:users:{userId}   → reason (TTL: permanent)
```

## 🛡️ Moderation System

### Pattern-Based Filtering

- **Zero Tolerance**: Instant ban (minors, CSAM)
- **High Severity**: Block message (violence, doxing)
- **Medium Severity**: Warn → Block after 3 warnings
- **Low Severity**: Allow with warning

### Teen Protection

- Personal info detection
- Grooming pattern recognition
- Social media link blocking

### Escalation Flow

```
Warning 1 → Warning 2 → Warning 3 → Block → Ban
   ↓
Message sent with warning
```

## 📊 Monitoring

### Health Endpoints

```bash
# Server health
curl http://localhost:3000/health

# Global stats
curl http://localhost:3000/stats
```

### Metrics

- Total online users
- Users in queue
- Active chats
- Match rate
- Average match time
- Moderation actions

## 🔒 Security

### Rate Limiting

- 100 requests/minute per IP
- 5 concurrent connections per IP
- WebSocket message size limit: 16KB

### Bans

```bash
# Ban IP (via Redis CLI)
redis-cli SETEX banned:ips:192.168.1.1 86400 "Spam"

# Ban user
redis-cli SETEX banned:users:uuid 86400 "Harassment"
```

## 🚀 Performance

### Benchmarks (Bun + uWebSockets.js)

| Metric | Value |
|--------|-------|
| Connections/server | 10,000+ |
| Messages/sec | 100,000+ |
| Avg match time | <100ms |
| Memory/connection | ~5KB |

### Scaling

```bash
# Vertical: More CPU/RAM
# Horizontal: More workers

# Start with 4 workers
bun run cluster

# Or Docker
 docker-compose up -d --scale anygle=8
```

## 📝 License

MIT