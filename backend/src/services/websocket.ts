import { App, WebSocket, HttpRequest, HttpResponse } from 'uwebsockets.js';
import { v4 as uuidv4 } from 'uuid';
import msgpack from 'msgpack-lite';
import { 
  ClientMessage, 
  ServerMessage, 
  UserSession, 
  SocketMetadata,
  Message,
  Report,
} from '../types/index.js';
import { 
  setUserSession, 
  getUserSession, 
  deleteUserSession,
  setSocketMapping,
  getUserIdBySocket,
  deleteSocketMapping,
  addMessageToRoom,
  getRoom,
  deleteRoom,
  decrementActiveChats,
  isIpBanned,
  isUserBanned,
  getGlobalStats,
} from './redis.js';
import { matchingService } from './matching.js';
import { moderationService } from './moderation.js';
import { config } from '../config/index.js';

// Connection store
const connections = new Map<string, WebSocket<SocketMetadata>>();
const userSockets = new Map<string, string>(); // userId -> socketId

export class WebSocketService {
  private app: ReturnType<typeof App>;
  private port: number;
  
  constructor(port: number) {
    this.port = port;
    this.app = App({});
    this.setupRoutes();
    this.setupMatchingListeners();
  }
  
  private setupRoutes(): void {
    // WebSocket route
    this.app.ws('/*', {
      // Connection settings
      compression: 0, // Disable compression for speed
      maxPayloadLength: 16 * 1024, // 16KB max message
      idleTimeout: 60, // 60 second idle timeout
      
      // Upgrade handler
      upgrade: async (res: HttpResponse, req: HttpRequest, context) => {
        const ip = this.getClientIp(res, req);
        const userAgent = req.getHeader('user-agent') || 'unknown';
        
        // Check IP ban
        if (await isIpBanned(ip)) {
          res.writeStatus('403 Forbidden').end('Banned');
          return;
        }
        
        res.upgrade(
          {
            userId: '', // Will be set on join
            ip,
            connectedAt: Date.now(),
            lastPing: Date.now(),
            userAgent,
          },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'),
          context
        );
      },
      
      // Connection opened
      open: (ws: WebSocket<SocketMetadata>) => {
        const socketId = uuidv4();
        ws.getUserData().userId = socketId; // Temporary until join
        connections.set(socketId, ws);
        
        // Send connected message
        this.sendToSocket(ws, {
          type: 'connected',
          data: { userId: socketId },
        });
        
        console.log(`🔌 WebSocket connected: ${socketId.slice(0, 8)}... (IP: ${ws.getUserData().ip})`);
      },
      
      // Message received
      message: async (ws: WebSocket<SocketMetadata>, message: ArrayBuffer, isBinary: boolean) => {
        try {
          const data = msgpack.decode(new Uint8Array(message));
          await this.handleMessage(ws, data as ClientMessage);
        } catch (error) {
          console.error('Message decode error:', error);
          this.sendToSocket(ws, {
            type: 'error',
            data: { code: 'DECODE_ERROR', message: 'Invalid message format' },
          });
        }
      },
      
      // Connection closed
      close: async (ws: WebSocket<SocketMetadata>, code: number, message: ArrayBuffer) => {
        const socketId = this.getSocketId(ws);
        if (socketId) {
          await this.handleDisconnect(socketId);
        }
      },
    });
    
    // Health check endpoint
    this.app.get('/health', (res) => {
      res.writeHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        connections: connections.size,
        uptime: process.uptime(),
      }));
    });
    
    // Stats endpoint
    this.app.get('/stats', async (res) => {
      const stats = await getGlobalStats();
      res.writeHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(stats));
    });
  }
  
  private setupMatchingListeners(): void {
    matchingService.on('matched', ({ user1, user2 }) => {
      const ws1 = connections.get(user1.socketId);
      const ws2 = connections.get(user2.socketId);
      
      if (ws1) {
        this.sendToSocket(ws1, { type: 'matched', data: user1.data });
      }
      if (ws2) {
        this.sendToSocket(ws2, { type: 'matched', data: user2.data });
      }
      
      // Update user sessions with room info
      this.updateUserRoom(user1.userId, user2.userId, user1.data.roomId);
      this.updateUserRoom(user2.userId, user1.userId, user2.data.roomId);
    });
    
    matchingService.on('userSkipped', ({ userId, partnerId, roomId }) => {
      const partnerSocketId = userSockets.get(partnerId);
      if (partnerSocketId) {
        const ws = connections.get(partnerSocketId);
        if (ws) {
          this.sendToSocket(ws, { type: 'partner_skipped' });
        }
      }
      
      // Clean up room
      this.cleanupRoom(roomId);
    });
  }
  
  private async handleMessage(ws: WebSocket<SocketMetadata>, message: ClientMessage): Promise<void> {
    const socketId = this.getSocketId(ws);
    if (!socketId) return;
    
    const userId = ws.getUserData().userId;
    const session = await getUserSession(userId);
    
    switch (message.type) {
      case 'join':
        await this.handleJoin(ws, socketId, message.data);
        break;
        
      case 'message':
        await this.handleChatMessage(socketId, message.data.content, session);
        break;
        
      case 'typing':
        await this.handleTyping(socketId, message.data.isTyping, session);
        break;
        
      case 'skip':
        await this.handleSkip(socketId, session);
        break;
        
      case 'video_toggle':
        await this.handleVideoToggle(socketId, message.data.enabled, session);
        break;
        
      case 'audio_toggle':
        await this.handleAudioToggle(socketId, message.data.enabled, session);
        break;
        
      case 'report':
        await this.handleReport(socketId, message.data, session);
        break;
        
      case 'ice_candidate':
      case 'offer':
      case 'answer':
        await this.handleWebRTC(socketId, message.type, message.data, session);
        break;
        
      case 'ping':
        this.sendToSocket(ws, { 
          type: 'pong', 
          data: { timestamp: Date.now() } 
        });
        ws.getUserData().lastPing = Date.now();
        break;
        
      default:
        this.sendToSocket(ws, {
          type: 'error',
          data: { code: 'UNKNOWN_TYPE', message: 'Unknown message type' },
        });
    }
  }
  
  private async handleJoin(
    ws: WebSocket<SocketMetadata>, 
    socketId: string, 
    data: ClientMessage['data']
  ): Promise<void> {
    const userId = ws.getUserData().userId;
    
    // Check user ban
    if (await isUserBanned(userId)) {
      this.sendToSocket(ws, {
        type: 'error',
        data: { code: 'BANNED', message: 'You are banned' },
      });
      ws.close();
      return;
    }
    
    // Create session
    const session: UserSession = {
      id: userId,
      socketId,
      ageCategory: data.ageCategory,
      mode: data.mode,
      queueType: data.queueType,
      interests: data.interests || [],
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      isVideoEnabled: true,
      isAudioEnabled: true,
      isSearching: true,
    };
    
    // Save session
    await setUserSession(session);
    await setSocketMapping(socketId, userId);
    userSockets.set(userId, socketId);
    
    // Join queue
    await matchingService.joinQueue(session);
    
    // Send initial queue status
    const status = await matchingService.getQueueStatus(session);
    this.sendToSocket(ws, {
      type: 'searching',
      data: status,
    });
    
    // Start queue status updates
    this.startQueueUpdates(socketId, userId);
    
    console.log(`👤 User joined: ${userId.slice(0, 8)}... (${data.ageCategory}, ${data.mode}, ${data.queueType})`);
  }
  
  private async handleChatMessage(
    socketId: string, 
    content: string, 
    session: UserSession | null
  ): Promise<void> {
    if (!session || !session.partnerId) return;
    
    // Moderate message
    const moderation = await moderationService.moderateMessage(content, session.id, session);
    
    const message: Message = {
      id: uuidv4(),
      senderId: session.id,
      content,
      timestamp: Date.now(),
      type: 'text',
      moderated: !moderation.allowed,
      severity: moderation.severity,
    };
    
    if (!moderation.allowed && moderation.action === 'block') {
      this.sendToSocket(connections.get(socketId)!, {
        type: 'moderation_warning',
        data: { message: moderation.reason!, severity: moderation.severity! },
      });
      return;
    }
    
    if (moderation.action === 'warn') {
      this.sendToSocket(connections.get(socketId)!, {
        type: 'moderation_warning',
        data: { message: moderation.reason!, severity: moderation.severity! },
      });
    }
    
    // Save to room
    if (session.partnerId) {
      const room = await getRoom(session.id + session.partnerId); // Simplified room lookup
      if (room) {
        await addMessageToRoom(room.id, message);
      }
    }
    
    // Send to both users
    this.sendToUser(session.id, { type: 'message', data: message });
    this.sendToUser(session.partnerId, { type: 'message', data: message });
  }
  
  private async handleTyping(socketId: string, isTyping: boolean, session: UserSession | null): Promise<void> {
    if (!session || !session.partnerId) return;
    this.sendToUser(session.partnerId, {
      type: 'partner_typing',
      data: { isTyping },
    });
  }
  
  private async handleSkip(socketId: string, session: UserSession | null): Promise<void> {
    if (!session) return;
    
    // Leave current queue/room
    if (session.isSearching) {
      await matchingService.leaveQueue(session);
    }
    
    if (session.partnerId && session.roomId) {
      await matchingService.skipChat(session.id, session.partnerId, session.roomId);
      
      // Update session
      session.partnerId = undefined;
      session.roomId = undefined;
      session.isSearching = true;
      await setUserSession(session);
    }
    
    // Reset moderation warnings for new chat
    moderationService.resetUserWarnings(session.id);
    
    // Rejoin queue
    await matchingService.joinQueue(session);
    
    // Send searching status
    const ws = connections.get(socketId);
    if (ws) {
      const status = await matchingService.getQueueStatus(session);
      this.sendToSocket(ws, {
        type: 'searching',
        data: status,
      });
    }
  }
  
  private async handleVideoToggle(socketId: string, enabled: boolean, session: UserSession | null): Promise<void> {
    if (!session || !session.partnerId) return;
    
    session.isVideoEnabled = enabled;
    await setUserSession(session);
    
    this.sendToUser(session.partnerId, {
      type: 'partner_video_toggle',
      data: { enabled },
    });
  }
  
  private async handleAudioToggle(socketId: string, enabled: boolean, session: UserSession | null): Promise<void> {
    if (!session || !session.partnerId) return;
    
    session.isAudioEnabled = enabled;
    await setUserSession(session);
    
    this.sendToUser(session.partnerId, {
      type: 'partner_audio_toggle',
      data: { enabled },
    });
  }
  
  private async handleReport(socketId: string, data: { reason: string; messageId?: string }, session: UserSession | null): Promise<void> {
    if (!session || !session.partnerId || !session.roomId) return;
    
    const report: Report = {
      reporterId: session.id,
      reason: data.reason,
      timestamp: Date.now(),
      messageId: data.messageId,
    };
    
    console.log(`🚨 Report: ${session.id.slice(0, 8)}... reported ${session.partnerId.slice(0, 8)}... - ${data.reason}`);
    
    // TODO: Store report in database
    // TODO: Auto-disconnect if multiple reports
    
    // Auto-skip after report
    await this.handleSkip(socketId, session);
  }
  
  private async handleWebRTC(
    socketId: string, 
    type: 'ice_candidate' | 'offer' | 'answer', 
    data: unknown, 
    session: UserSession | null
  ): Promise<void> {
    if (!session || !session.partnerId) return;
    
    this.sendToUser(session.partnerId, {
      type,
      data: data as RTCIceCandidateInit | RTCSessionDescriptionInit,
    });
  }
  
  private async handleDisconnect(socketId: string): Promise<void> {
    const userId = await getUserIdBySocket(socketId);
    if (!userId) return;
    
    const session = await getUserSession(userId);
    if (session) {
      // Leave queue if searching
      if (session.isSearching) {
        await matchingService.leaveQueue(session);
      }
      
      // Notify partner if in chat
      if (session.partnerId) {
        this.sendToUser(session.partnerId, { type: 'partner_disconnected' });
        
        // Cleanup room
        if (session.roomId) {
          await this.cleanupRoom(session.roomId);
        }
      }
      
      // Delete session
      await deleteUserSession(userId);
    }
    
    // Cleanup mappings
    await deleteSocketMapping(socketId);
    connections.delete(socketId);
    if (userId) {
      userSockets.delete(userId);
    }
    
    console.log(`🔌 WebSocket disconnected: ${socketId.slice(0, 8)}...`);
  }
  
  private async cleanupRoom(roomId: string): Promise<void> {
    await deleteRoom(roomId);
    await decrementActiveChats();
  }
  
  private async updateUserRoom(userId: string, partnerId: string, roomId: string): Promise<void> {
    const session = await getUserSession(userId);
    if (session) {
      session.partnerId = partnerId;
      session.roomId = roomId;
      session.isSearching = false;
      await setUserSession(session);
    }
  }
  
  private startQueueUpdates(socketId: string, userId: string): void {
    const interval = setInterval(async () => {
      const ws = connections.get(socketId);
      if (!ws) {
        clearInterval(interval);
        return;
      }
      
      const session = await getUserSession(userId);
      if (!session || !session.isSearching) {
        clearInterval(interval);
        return;
      }
      
      const status = await matchingService.getQueueStatus(session);
      this.sendToSocket(ws, {
        type: 'searching',
        data: status,
      });
    }, 1000);
  }
  
  private sendToSocket(ws: WebSocket<SocketMetadata>, message: ServerMessage): void {
    try {
      const encoded = msgpack.encode(message);
      ws.send(encoded, true); // Binary
    } catch (error) {
      console.error('Send error:', error);
    }
  }
  
  private sendToUser(userId: string, message: ServerMessage): void {
    const socketId = userSockets.get(userId);
    if (socketId) {
      const ws = connections.get(socketId);
      if (ws) {
        this.sendToSocket(ws, message);
      }
    }
  }
  
  private getSocketId(ws: WebSocket<SocketMetadata>): string | undefined {
    // Find socket ID by reference
    for (const [id, socket] of connections) {
      if (socket === ws) return id;
    }
    return undefined;
  }
  
  private getClientIp(res: HttpResponse, req: HttpRequest): string {
    // Try X-Forwarded-For first (for proxies)
    const forwarded = req.getHeader('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    // Get from uWS
    const ip = res.getRemoteAddressAsText();
    return ip || 'unknown';
  }
  
  listen(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, (token) => {
        if (token) {
          console.log(`🚀 WebSocket server listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }
  
  stop(): void {
    this.app.close();
    matchingService.stop();
  }
}