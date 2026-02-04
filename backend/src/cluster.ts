import cluster from 'cluster';
import os from 'os';
import { WebSocketService } from './services/websocket.js';
import { connectRedis } from './services/redis.js';
import { config } from './config/index.js';

const numCPUs = os.cpus().length;

async function startWorker(port: number): Promise<void> {
  await connectRedis();
  const wsService = new WebSocketService(port);
  await wsService.listen();
}

if (cluster.isPrimary) {
  console.log(`🚀 Master ${process.pid} is running`);
  console.log(`📊 Starting ${numCPUs} workers...`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const port = config.wsPort + i;
    cluster.fork({ WORKER_PORT: port.toString() });
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Restarting...`);
    const port = config.wsPort + (worker.id - 1);
    cluster.fork({ WORKER_PORT: port.toString() });
  });
  
  console.log(`✅ Cluster mode enabled. Workers listening on ports ${config.wsPort}-${config.wsPort + numCPUs - 1}`);
} else {
  const port = parseInt(process.env.WORKER_PORT || config.wsPort.toString(), 10);
  startWorker(port).catch((error) => {
    console.error(`Worker ${process.pid} failed to start:`, error);
    process.exit(1);
  });
  
  console.log(`👷 Worker ${process.pid} started on port ${port}`);
}