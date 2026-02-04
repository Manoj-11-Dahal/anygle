export type ChatMode = 'text' | 'video' | 'voice';

export type QueueType = 'moderated' | 'unmoderated';

export type AgeCategory = 'teens' | 'adults';

export type UserStatus = 'online' | 'matching' | 'chatting' | 'idle';

export interface User {
  id: string;
  ageCategory: AgeCategory;
  mode: ChatMode;
  queueType: QueueType;
  interests: string[];
  isVideoOn: boolean;
  isAudioOn: boolean;
  blurEnabled: boolean;
  status?: UserStatus;
  joinedAt?: Date;
  region?: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isLocal: boolean;
  type?: 'text' | 'system' | 'warning';
}

export interface Match {
  id: string;
  userId: string;
  mode: ChatMode;
  queueType: QueueType;
  isVideoOn: boolean;
  isAudioOn: boolean;
  blurEnabled: boolean;
  isAI?: boolean;
  aiName?: string;
  aiPersonality?: string;
}

export interface ChatState {
  status: 'idle' | 'searching' | 'connecting' | 'connected' | 'reconnecting';
  matchCount: number;
  skipTimer: number;
  canSkip: boolean;
  sessionDuration?: number;
}

export interface OnlineStats {
  totalOnline: number;
  inQueue: number;
  activeChats: number;
  totalMatchesToday?: number;
  avgWaitTime?: number;
  peakHour?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  avgSessionTime: number;
  reportsToday: number;
  moderationActions: number;
  queueBreakdown: {
    moderated: number;
    unmoderated: number;
  };
  modeBreakdown: {
    video: number;
    voice: number;
    text: number;
  };
  topInterests: { name: string; count: number }[];
  recentConnections: { time: string; type: string; region: string }[];
}

export const INTERESTS = [
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'movies', label: 'Movies', icon: '🎬' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'books', label: 'Books', icon: '📚' },
  { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'anime', label: 'Anime', icon: '🇯🇵' },
  { id: 'memes', label: 'Memes', icon: '😂' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'fashion', label: 'Fashion', icon: '👗' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'politics', label: 'Politics', icon: '🗳️' },
  { id: 'dating', label: 'Dating', icon: '💕' },
  { id: 'study', label: 'Study Help', icon: '📖' },
  { id: 'coding', label: 'Coding', icon: '💻' },
];

export const SAFETY_RULES = [
  'No personal info (names, addresses, socials)',
  'No harassment or hate speech',
  'No sexual content involving minors',
  'No threats or illegal activity',
  'Use report button for violations',
];
