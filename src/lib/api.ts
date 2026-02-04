import axios, { AxiosInstance } from 'axios';

// API Configuration - Access env vars safely
const getEnvVar = (name: string, defaultValue: string = ''): string => {
  try {
    return (import.meta as any).env?.[name] || defaultValue;
  } catch {
    return defaultValue;
  }
};

const API_BASE_URL = getEnvVar('VITE_API_URL', 'https://anygle.com');

// Enable mock mode for testing when server is unavailable
const USE_MOCK = getEnvVar('VITE_USE_MOCK', 'false') === 'true';

// Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Mock responses for testing
const mockResponses: Record<string, any> = {
  '/auth/register': {
    user: {
      id: 1,
      anonymous_id: 'anon_' + Math.random().toString(36).substring(7),
      age_category: 'adult',
      interests: [],
      status: 'online',
    },
    token: 'mock_token_' + Date.now(),
  },
  '/chat/match': {
    status: 'matched',
    chat: {
      chat_id: 'chat_' + Date.now(),
      partner: {
        id: 'partner_' + Math.random().toString(36).substring(7),
        interests: [],
      },
      mode: 'text',
      queue_type: 'moderated',
    },
  },
  '/dashboard/public': {
    total_online: 10247,
    in_queue: 342,
    active_chats: 2847,
    queue_breakdown: { moderated: 2341, unmoderated: 5526 },
    mode_breakdown: { video: 5234, voice: 1876, text: 1837 },
  },
};

// Request interceptor - add auth token and mock handling
api.interceptors.request.use(async (config) => {
  // Mock mode for testing
  if (USE_MOCK && config.url && mockResponses[config.url]) {
    // Return mock response
    throw {
      response: {
        data: mockResponses[config.url],
        status: 200,
      },
      __isMock: true,
    };
  }

  const token = localStorage.getItem('anygle_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    // Handle mock responses
    if (error.__isMock && error.response) {
      return Promise.resolve(error.response);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error - server unreachable:', error.message);
      return Promise.reject({
        response: {
          data: { message: 'Server unavailable. Please try again later.' },
          status: 503,
        },
      });
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('anygle_token');
      localStorage.removeItem('anygle_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Echo instance for real-time (lazy loaded)
let echoInstance: any = null;

export function initEcho(): any {
  if (echoInstance) return echoInstance;
  
  // Dynamically import to avoid SSR issues
  import('laravel-echo').then((EchoModule) => {
    import('pusher-js').then((PusherModule) => {
      const Pusher = PusherModule.default;
      const Echo = EchoModule.default;
      
      (window as any).Pusher = Pusher;
      
      const WS_HOST = (import.meta as any).env?.VITE_WS_HOST || 'anygle.com';
      const WS_PORT = (import.meta as any).env?.VITE_WS_PORT || 443;
      const WS_KEY = (import.meta as any).env?.VITE_WS_KEY || 'anygle-key';
      
      echoInstance = new Echo({
        broadcaster: 'pusher',
        key: WS_KEY,
        wsHost: WS_HOST,
        wsPort: parseInt(WS_PORT),
        wssPort: parseInt(WS_PORT),
        forceTLS: true,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        cluster: 'mt1',
      });
    });
  });

  return echoInstance;
}

// Auth API
export const authAPI = {
  register: async (data: {
    age_category: 'teen' | 'adult';
    age: number;
    interests?: string[];
  }) => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('anygle_token', response.data.token);
      localStorage.setItem('anygle_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('anygle_token');
    localStorage.removeItem('anygle_user');
  },

  heartbeat: async () => {
    return api.post('/auth/heartbeat');
  },

  getUser: () => {
    const user = localStorage.getItem('anygle_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('anygle_token');
  },
};

// Chat API
export const chatAPI = {
  startMatching: async (data: {
    mode: 'video' | 'voice' | 'text';
    queue_type: 'moderated' | 'unmoderated';
    interests?: string[];
  }) => {
    return api.post('/chat/match', data);
  },

  checkMatch: async () => {
    return api.get('/chat/check');
  },

  cancelMatching: async () => {
    return api.post('/chat/cancel');
  },

  getMessages: async (chatId: string) => {
    return api.get(`/chat/${chatId}/messages`);
  },

  sendMessage: async (chatId: string, content: string) => {
    return api.post(`/chat/${chatId}/message`, { content });
  },

  skipChat: async (chatId: string) => {
    return api.post(`/chat/${chatId}/skip`);
  },

  report: async (chatId: string, reason: string, details?: string) => {
    return api.post(`/chat/${chatId}/report`, { reason, details });
  },
};

// Signaling API (WebRTC)
export const signalingAPI = {
  sendOffer: async (chatId: string, offer: RTCSessionDescriptionInit) => {
    return api.post(`/chat/${chatId}/offer`, { offer });
  },

  sendAnswer: async (chatId: string, answer: RTCSessionDescriptionInit) => {
    return api.post(`/chat/${chatId}/answer`, { answer });
  },

  sendIceCandidate: async (chatId: string, candidate: RTCIceCandidateInit) => {
    return api.post(`/chat/${chatId}/ice`, { candidate });
  },
};

// Dashboard API
export const dashboardAPI = {
  getPublicStats: async () => {
    return api.get('/dashboard/public');
  },
};

// Event listeners for real-time
export function subscribeToUserChannel(userId: string, callbacks: {
  onMatchFound?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onWebRtcSignal?: (data: any) => void;
}): () => void {
  const echo = initEcho();

  if (!echo) {
    console.warn('Echo not initialized');
    return () => {};
  }

  echo.private(`user.${userId}`)
    .listen('.match.found', (data: any) => {
      callbacks.onMatchFound?.(data);
    })
    .listen('.message.new', (data: any) => {
      callbacks.onNewMessage?.(data);
    })
    .listen('.webrtc.signal', (data: any) => {
      callbacks.onWebRtcSignal?.(data);
    });

  return () => {
    echo.leave(`user.${userId}`);
  };
}

// Heartbeat interval
let heartbeatInterval: NodeJS.Timeout | null = null;

export function startHeartbeat() {
  if (heartbeatInterval) return;
  
  heartbeatInterval = setInterval(() => {
    authAPI.heartbeat().catch(() => {
      // Ignore heartbeat errors
    });
  }, 30000); // Every 30 seconds
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Public stats polling
export function startStatsPolling(callback: (stats: any) => void): NodeJS.Timeout {
  const poll = async () => {
    try {
      const response = await dashboardAPI.getPublicStats();
      callback(response.data);
    } catch (error) {
      console.error('Stats polling error:', error);
    }
  };

  poll(); // Initial poll
  return setInterval(poll, 5000); // Every 5 seconds
}