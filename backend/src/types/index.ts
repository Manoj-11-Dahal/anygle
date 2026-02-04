// User session state (ephemeral, in-memory)
export interface UserSession {
  id: string;
  socketId: string;
  ageCategory: 'teen' | 'adult';
  mode: 'text' | 'video' | 'voice';
  queueType: 'moderated' | 'unmoderated';
  interests: string[];
  connectedAt: number;
  lastActivity: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  partnerId?: string;
  roomId?: string;
  isSearching: boolean;
}

// Chat room state (temporary, 30min TTL)
export interface ChatRoom {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
  mode: 'text' | 'video' | 'voice';
  messages: Message[];
  isActive: boolean;
  reports: Report[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'image';
  moderated: boolean;
  severity?: 'low' | 'medium' | 'high';
}

export interface Report {
  reporterId: string;
  reason: string;
  timestamp: number;
  messageId?: string;
}

// Queue entry for matching
export interface QueueEntry {
  userId: string;
  socketId: string;
  ageCategory: 'teen' | 'adult';
  mode: 'text' | 'video' | 'voice';
  queueType: 'moderated' | 'unmoderated';
  interests: string[];
  joinedAt: number;
  priority: number; // Higher = matched first
}

// WebSocket message types
export type ClientMessage =
  | { type: 'join'; data: JoinData }
  | { type: 'message'; data: MessageData }
  | { type: 'skip'; data: SkipData }
  | { type: 'typing'; data: TypingData }
  | { type: 'video_toggle'; data: VideoToggleData }
  | { type: 'audio_toggle'; data: AudioToggleData }
  | { type: 'report'; data: ReportData }
  | { type: 'ice_candidate'; data: RTCIceCandidateInit }
  | { type: 'offer'; data: RTCSessionDescriptionInit }
  | { type: 'answer'; data: RTCSessionDescriptionInit }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'connected'; data: { userId: string } }
  | { type: 'matched'; data: MatchedData }
  | { type: 'message'; data: Message }
  | { type: 'partner_typing'; data: { isTyping: boolean } }
  | { type: 'partner_video_toggle'; data: { enabled: boolean } }
  | { type: 'partner_audio_toggle'; data: { enabled: boolean } }
  | { type: 'partner_skipped' }
  | { type: 'partner_disconnected' }
  | { type: 'searching'; data: { position: number; estimatedTime: number } }
  | { type: 'moderation_warning'; data: { message: string; severity: 'low' | 'medium' | 'high' } }
  | { type: 'error'; data: { code: string; message: string } }
  | { type: 'ice_candidate'; data: RTCIceCandidateInit }
  | { type: 'offer'; data: RTCSessionDescriptionInit }
  | { type: 'answer'; data: RTCSessionDescriptionInit }
  | { type: 'pong'; data: { timestamp: number } }
  | { type: 'stats'; data: StatsData };

export interface JoinData {
  ageCategory: 'teen' | 'adult';
  mode: 'text' | 'video' | 'voice';
  queueType: 'moderated' | 'unmoderated';
  interests: string[];
}

export interface MessageData {
  content: string;
}

export interface SkipData {
  reason?: string;
}

export interface TypingData {
  isTyping: boolean;
}

export interface VideoToggleData {
  enabled: boolean;
}

export interface AudioToggleData {
  enabled: boolean;
}

export interface ReportData {
  reason: string;
  messageId?: string;
}

export interface MatchedData {
  roomId: string;
  partnerId: string;
  mode: 'text' | 'video' | 'voice';
  isInitiator: boolean;
  partnerInfo: {
    interests: string[];
    sharedInterests: string[];
  };
}

export interface StatsData {
  totalOnline: number;
  inQueue: number;
  activeChats: number;
  avgMatchTime: number;
}

// Moderation result
export interface ModerationResult {
  allowed: boolean;
  severity?: 'low' | 'medium' | 'high';
  action: 'allow' | 'warn' | 'block' | 'ban';
  reason?: string;
  flaggedWords?: string[];
}

// Redis keys
export const REDIS_KEYS = {
  USER_SESSION: (userId: string) => `user:${userId}`,
  USER_SOCKET: (socketId: string) => `socket:${socketId}`,
  QUEUE: (category: string, mode: string, queueType: string) => 
    `queue:${category}:${mode}:${queueType}`,
  ROOM: (roomId: string) => `room:${roomId}`,
  STATS: 'stats:global',
  BANNED_IPS: 'banned:ips',
  BANNED_USERS: 'banned:users',
} as const;

// WebSocket connection metadata
export interface SocketMetadata {
  userId: string;
  ip: string;
  connectedAt: number;
  lastPing: number;
  userAgent: string;
}

// Rate limiting buckets
export interface RateLimitBuckets {
  messages: number;
  skips: number;
  connections: number;
}