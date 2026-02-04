import { useState, useCallback, useRef, useEffect } from 'react';
import type { User, Match, ChatState, OnlineStats } from '@/types';

export function useMatching(user: User | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [chatState, setChatState] = useState<ChatState>({
    status: 'idle',
    matchCount: 0,
    skipTimer: 30,
    canSkip: false,
  });
  const [onlineStats, setOnlineStats] = useState<OnlineStats>({
    totalOnline: 0,
    inQueue: 0,
    activeChats: 0,
  });
  
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate fluctuating online stats
  useEffect(() => {
    const updateStats = () => {
      const baseOnline = Math.floor(Math.random() * 8000) + 3000;
      const inQueue = Math.floor(Math.random() * 500) + 100;
      const activeChats = Math.floor(Math.random() * 3000) + 800;
      
      setOnlineStats({
        totalOnline: baseOnline,
        inQueue,
        activeChats,
      });
    };

    updateStats();
    statsIntervalRef.current = setInterval(updateStats, 3000 + Math.random() * 4000);

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const startSearch = useCallback(() => {
    if (!user) return;
    
    clearTimers();
    setChatState(prev => ({ ...prev, status: 'searching', skipTimer: 30, canSkip: false }));
    setMatch(null);

    // Simulate search delay (500ms - 2s)
    const searchDelay = Math.random() * 1500 + 500;
    
    searchTimeoutRef.current = setTimeout(() => {
      // Simulate finding a match
      const isAIMatch = Math.random() < 0.3;
      const newMatch: Match = {
        id: `match_${Date.now()}`,
        userId: isAIMatch ? 'ai_companion' : `stranger_${Math.random().toString(36).slice(2, 9)}`,
        mode: user.mode,
        queueType: user.queueType,
        isVideoOn: true,
        isAudioOn: true,
        blurEnabled: user.queueType === 'moderated',
      };
      
      setMatch(newMatch);
      setChatState(prev => ({
        ...prev,
        status: 'connected',
        matchCount: prev.matchCount + 1,
      }));

      // Start skip timer
      skipTimerRef.current = setInterval(() => {
        setChatState(prev => {
          if (prev.skipTimer <= 1) {
            return { ...prev, skipTimer: 0, canSkip: true };
          }
          return { ...prev, skipTimer: prev.skipTimer - 1 };
        });
      }, 1000);
    }, searchDelay);
  }, [user, clearTimers]);

  const skipMatch = useCallback(() => {
    clearTimers();
    setChatState(prev => ({ ...prev, status: 'idle', skipTimer: 30, canSkip: false }));
    setMatch(null);
    
    // Auto-restart search
    setTimeout(() => {
      startSearch();
    }, 100);
  }, [startSearch, clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    setChatState({
      status: 'idle',
      matchCount: 0,
      skipTimer: 30,
      canSkip: false,
    });
    setMatch(null);
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [clearTimers]);

  return {
    match,
    chatState,
    onlineStats,
    startSearch,
    skipMatch,
    disconnect,
  };
}
