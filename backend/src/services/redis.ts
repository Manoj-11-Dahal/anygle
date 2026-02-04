import Redis from 'ioredis';
import { REDIS_KEYS, UserSession, ChatRoom, QueueEntry, Message } from '../types/index.js';
import { config } from '../config/index.js';

// Redis client singleton
let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return redisClient;
}

export function getRedisPub(): Redis {
  if (!redisPub) {
    redisPub = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  }
  return redisPub;
}

export function getRedisSub(): Redis {
  if (!redisSub) {
    redisSub = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  }
  return redisSub;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
  console.log('✅ Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisPub) {
    await redisPub.quit();
    redisPub = null;
  }
  if (redisSub) {
    await redisSub.quit();
    redisSub = null;
  }
}

// User Session Operations
export async function setUserSession(session: UserSession): Promise<void> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.USER_SESSION(session.id);
  await redis.setex(key, 3600, JSON.stringify(session)); // 1 hour TTL
}

export async function getUserSession(userId: string): Promise<UserSession | null> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.USER_SESSION(userId);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteUserSession(userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.USER_SESSION(userId));
}

export async function updateUserSession(userId: string, updates: Partial<UserSession>): Promise<void> {
  const session = await getUserSession(userId);
  if (session) {
    await setUserSession({ ...session, ...updates, lastActivity: Date.now() });
  }
}

// Socket Mapping Operations
export async function setSocketMapping(socketId: string, userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(REDIS_KEYS.USER_SOCKET(socketId), 3600, userId);
}

export async function getUserIdBySocket(socketId: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(REDIS_KEYS.USER_SOCKET(socketId));
}

export async function deleteSocketMapping(socketId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.USER_SOCKET(socketId));
}

// Queue Operations
export async function addToQueue(entry: QueueEntry): Promise<void> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.QUEUE(entry.ageCategory, entry.mode, entry.queueType);
  const score = entry.priority * 10000000000000 + (Date.now() - entry.joinedAt);
  await redis.zadd(key, score, JSON.stringify(entry));
}

export async function removeFromQueue(
  ageCategory: string,
  mode: string,
  queueType: string,
  userId: string
): Promise<void> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.QUEUE(ageCategory, mode, queueType);
  const entries = await redis.zrange(key, 0, -1);
  
  for (const entryStr of entries) {
    const entry: QueueEntry = JSON.parse(entryStr);
    if (entry.userId === userId) {
      await redis.zrem(key, entryStr);
      break;
    }
  }
}

export async function findMatch(
  ageCategory: string,
  mode: string,
  queueType: string,
  interests: string[],
  excludeUserId: string
): Promise<QueueEntry | null> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.QUEUE(ageCategory, mode, queueType);
  const entries = await redis.zrange(key, 0, 50); // Check first 50 in queue
  
  // Sort by interest overlap (most shared interests first)
  const scored = entries
    .map(str => JSON.parse(str) as QueueEntry)
    .filter(e => e.userId !== excludeUserId)
    .map(e => ({
      entry: e,
      sharedInterests: e.interests.filter(i => interests.includes(i)).length,
      waitTime: Date.now() - e.joinedAt,
    }))
    .sort((a, b) => {
      // Prioritize shared interests, then wait time
      if (b.sharedInterests !== a.sharedInterests) {
        return b.sharedInterests - a.sharedInterests;
      }
      return b.waitTime - a.waitTime;
    });
  
  return scored.length > 0 ? scored[0].entry : null;
}

export async function getQueuePosition(
  ageCategory: string,
  mode: string,
  queueType: string,
  userId: string
): Promise<number> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.QUEUE(ageCategory, mode, queueType);
  const entries = await redis.zrange(key, 0, -1);
  
  for (let i = 0; i < entries.length; i++) {
    const entry: QueueEntry = JSON.parse(entries[i]);
    if (entry.userId === userId) {
      return i + 1;
    }
  }
  return -1;
}

export async function getQueueLength(
  ageCategory: string,
  mode: string,
  queueType: string
): Promise<number> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.QUEUE(ageCategory, mode, queueType);
  return redis.zcard(key);
}

// Chat Room Operations
export async function createRoom(room: ChatRoom): Promise<void> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.ROOM(room.id);
  await redis.setex(key, 1800, JSON.stringify(room)); // 30 min TTL
}

export async function getRoom(roomId: string): Promise<ChatRoom | null> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.ROOM(roomId);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.ROOM(roomId));
}

export async function addMessageToRoom(roomId: string, message: Message): Promise<void> {
  const room = await getRoom(roomId);
  if (room) {
    room.messages.push(message);
    await createRoom(room);
  }
}

// Stats Operations
export async function incrementOnlineUsers(): Promise<number> {
  const redis = getRedisClient();
  return redis.hincrby(REDIS_KEYS.STATS, 'online', 1);
}

export async function decrementOnlineUsers(): Promise<number> {
  const redis = getRedisClient();
  return redis.hincrby(REDIS_KEYS.STATS, 'online', -1);
}

export async function incrementActiveChats(): Promise<number> {
  const redis = getRedisClient();
  return redis.hincrby(REDIS_KEYS.STATS, 'activeChats', 1);
}

export async function decrementActiveChats(): Promise<number> {
  const redis = getRedisClient();
  return redis.hincrby(REDIS_KEYS.STATS, 'activeChats', -1);
}

export async function incrementTotalMatches(): Promise<number> {
  const redis = getRedisClient();
  return redis.hincrby(REDIS_KEYS.STATS, 'totalMatches', 1);
}

export async function getGlobalStats(): Promise<{
  online: number;
  inQueue: number;
  activeChats: number;
  totalMatches: number;
}> {
  const redis = getRedisClient();
  const stats = await redis.hgetall(REDIS_KEYS.STATS);
  
  // Count all queue lengths
  const queueKeys = await redis.keys('queue:*');
  let inQueue = 0;
  for (const key of queueKeys) {
    inQueue += await redis.zcard(key);
  }
  
  return {
    online: parseInt(stats.online || '0', 10),
    inQueue,
    activeChats: parseInt(stats.activeChats || '0', 10),
    totalMatches: parseInt(stats.totalMatches || '0', 10),
  };
}

// Ban Operations
export async function banIp(ip: string, reason: string, duration: number): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(`${REDIS_KEYS.BANNED_IPS}:${ip}`, duration, reason);
}

export async function isIpBanned(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  const exists = await redis.exists(`${REDIS_KEYS.BANNED_IPS}:${ip}`);
  return exists === 1;
}

export async function banUser(userId: string, reason: string, duration: number): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(`${REDIS_KEYS.BANNED_USERS}:${userId}`, duration, reason);
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const exists = await redis.exists(`${REDIS_KEYS.BANNED_USERS}:${userId}`);
  return exists === 1;
}

// Health check
export async function pingRedis(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}