import { WebSocketService } from './services/websocket.js';
import { connectRedis } from './services/redis.js';
import { config } from './config/index.js';

async function main() {
  console.log('🚀 Starting Anygle Backend...');
  console.log(`📍 Environment: ${config.env}`);
  
  // Connect to Redis
  try {
    await connectRedis();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(1);
  }
  
  // Start WebSocket server
  const wsService = new WebSocketService(config.wsPort);
  await wsService.listen();
  
  console.log(`✅ Anygle Backend ready!`);
  console.log(`   WebSocket: ws://localhost:${config.wsPort}`);
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    wsService.stop();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(console.error);