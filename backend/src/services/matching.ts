import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { QueueEntry, UserSession, ChatRoom, MatchedData } from '../types/index.js';
import {
  addToQueue,
  removeFromQueue,
  findMatch,
  getQueuePosition,
  createRoom,
  incrementActiveChats,
  incrementTotalMatches,
  setUserSession,
} from './redis.js';

interface MatchResult {
  success: boolean;
  roomId?: string;
  partnerId?: string;
  isInitiator?: boolean;
}

export class MatchingService extends EventEmitter {
  private static instance: MatchingService;
  private matchingInterval: NodeJS.Timeout | null = null;
  private readonly MATCH_INTERVAL = 100; // Check for matches every 100ms
  
  private constructor() {
    super();
    this.startMatchingLoop();
  }
  
  static getInstance(): MatchingService {
    if (!MatchingService.instance) {
      MatchingService.instance = new MatchingService();
    }
    return MatchingService.instance;
  }
  
  private startMatchingLoop(): void {
    this.matchingInterval = setInterval(() => {
      this.processMatches();
    }, this.MATCH_INTERVAL);
  }
  
  async joinQueue(session: UserSession): Promise<void> {
    const entry: QueueEntry = {
      userId: session.id,
      socketId: session.socketId,
      ageCategory: session.ageCategory,
      mode: session.mode,
      queueType: session.queueType,
      interests: session.interests,
      joinedAt: Date.now(),
      priority: this.calculatePriority(session),
    };
    
    await addToQueue(entry);
    this.emit('userJoined', { userId: session.id, entry });
  }
  
  async leaveQueue(session: UserSession): Promise<void> {
    await removeFromQueue(
      session.ageCategory,
      session.mode,
      session.queueType,
      session.id
    );
    this.emit('userLeft', { userId: session.id });
  }
  
  async getQueueStatus(session: UserSession): Promise<{ position: number; estimatedTime: number }> {
    const position = await getQueuePosition(
      session.ageCategory,
      session.mode,
      session.queueType,
      session.id
    );
    
    // Estimate time based on position and average match rate
    const estimatedTime = position > 0 ? Math.max(1, position * 2) : 0; // ~2 seconds per person
    
    return { position, estimatedTime };
  }
  
  private async processMatches(): Promise<void> {
    // Process each queue category
    const categories = [
      { age: 'teen', mode: 'text', queue: 'moderated' },
      { age: 'teen', mode: 'video', queue: 'moderated' },
      { age: 'adult', mode: 'text', queue: 'moderated' },
      { age: 'adult', mode: 'text', queue: 'unmoderated' },
      { age: 'adult', mode: 'video', queue: 'moderated' },
      { age: 'adult', mode: 'video', queue: 'unmoderated' },
      { age: 'adult', mode: 'voice', queue: 'moderated' },
      { age: 'adult', mode: 'voice', queue: 'unmoderated' },
    ];
    
    for (const cat of categories) {
      await this.processCategory(cat.age as 'teen' | 'adult', cat.mode as 'text' | 'video' | 'voice', cat.queue as 'moderated' | 'unmoderated');
    }
  }
  
  private async processCategory(
    ageCategory: 'teen' | 'adult',
    mode: 'text' | 'video' | 'voice',
    queueType: 'moderated' | 'unmoderated'
  ): Promise<void> {
    // Try to find pairs in this category
    const user1 = await this.findAndRemoveFromQueue(ageCategory, mode, queueType);
    if (!user1) return;
    
    const user2 = await findMatch(ageCategory, mode, queueType, user1.interests, user1.userId);
    if (!user2) {
      // Put user1 back in queue
      await addToQueue(user1);
      return;
    }
    
    // Remove user2 from queue
    await removeFromQueue(ageCategory, mode, queueType, user2.userId);
    
    // Create match
    await this.createMatch(user1, user2);
  }
  
  private async findAndRemoveFromQueue(
    ageCategory: string,
    mode: string,
    queueType: string
  ): Promise<QueueEntry | null> {
    // Get oldest entry (lowest score) - import dynamically to avoid circular dependency
    const redisModule = await import('./redis.js');
    const redis = redisModule.getRedisClient();
    const key = `queue:${ageCategory}:${mode}:${queueType}`;
    
    const entries = await redis.zrange(key, 0, 0);
    if (entries.length === 0) return null;
    
    const entry: QueueEntry = JSON.parse(entries[0]);
    await redis.zrem(key, entries[0]);
    
    return entry;
  }
  
  private async createMatch(user1: QueueEntry, user2: QueueEntry): Promise<void> {
    const roomId = uuidv4();
    const now = Date.now();
    
    // Determine initiator (user with fewer shared interests goes first, or random)
    const sharedInterests1 = user1.interests.filter(i => user2.interests.includes(i));
    const sharedInterests2 = user2.interests.filter(i => user1.interests.includes(i));
    
    const isUser1Initiator = sharedInterests1.length <= sharedInterests2.length;
    
    // Create room
    const room: ChatRoom = {
      id: roomId,
      user1Id: user1.userId,
      user2Id: user2.userId,
      createdAt: now,
      mode: user1.mode,
      messages: [],
      isActive: true,
      reports: [],
    };
    
    await createRoom(room);
    await incrementActiveChats();
    await incrementTotalMatches();
    
    // Prepare match data
    const matchData1: MatchedData = {
      roomId,
      partnerId: user2.userId,
      mode: user1.mode,
      isInitiator: isUser1Initiator,
      partnerInfo: {
        interests: user2.interests,
        sharedInterests: sharedInterests1,
      },
    };
    
    const matchData2: MatchedData = {
      roomId,
      partnerId: user1.userId,
      mode: user2.mode,
      isInitiator: !isUser1Initiator,
      partnerInfo: {
        interests: user1.interests,
        sharedInterests: sharedInterests2,
      },
    };
    
    // Emit match events
    this.emit('matched', {
      user1: { userId: user1.userId, socketId: user1.socketId, data: matchData1 },
      user2: { userId: user2.userId, socketId: user2.socketId, data: matchData2 },
    });
    
    console.log(`✅ Match created: ${user1.userId.slice(0, 8)}... <-> ${user2.userId.slice(0, 8)}... (Room: ${roomId.slice(0, 8)}...)`);
  }
  
  private calculatePriority(session: UserSession): number {
    let priority = 0;
    
    // Boost priority for users waiting longer (handled by timestamp in score)
    // Boost for having more interests (more likely to match)
    priority += session.interests.length * 10;
    
    // Boost for moderated queue (safer, preferred)
    if (session.queueType === 'moderated') {
      priority += 5;
    }
    
    // Boost for text mode (faster connections)
    if (session.mode === 'text') {
      priority += 3;
    }
    
    return priority;
  }
  
  async skipChat(userId: string, partnerId: string, roomId: string): Promise<void> {
    this.emit('userSkipped', { userId, partnerId, roomId });
  }
  
  stop(): void {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
  }
}

export const matchingService = MatchingService.getInstance();