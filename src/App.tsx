import { useState, useEffect, useCallback } from 'react';
import LandingPage from '@/components/LandingPage';
import ChatRoom from '@/components/ChatRoom';
import PublicDashboard from '@/components/PublicDashboard';
import { authAPI, startHeartbeat, stopHeartbeat, startStatsPolling } from '@/lib/api';
import type { User } from '@/types';

type AppView = 'landing' | 'dashboard' | 'chat';

interface OnlineStats {
  totalOnline: number;
  inQueue: number;
  activeChats: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineStats, setOnlineStats] = useState<OnlineStats>({
    totalOnline: 0,
    inQueue: 0,
    activeChats: 0,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      const savedUser = authAPI.getUser();
      if (savedUser && authAPI.isAuthenticated()) {
        setUser(savedUser);
        startHeartbeat();
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Start stats polling
  useEffect(() => {
    const interval = startStatsPolling((stats) => {
      setOnlineStats({
        totalOnline: stats.total_online || 0,
        inQueue: stats.in_queue || 0,
        activeChats: stats.active_chats || 0,
      });
    });

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, []);

  const handleStart = useCallback(async (userData: User) => {
    try {
      // Register user with backend
      const response = await authAPI.register({
        age_category: userData.ageCategory === 'teens' ? 'teen' : 'adult',
        age: userData.ageCategory === 'teens' ? 16 : 18, // Default age based on category
        interests: userData.interests,
      });

      setUser({
        ...userData,
        id: response.user.anonymous_id,
      });
      
      startHeartbeat();
      setView('chat');
    } catch (error) {
      console.error('Registration failed:', error);
      // Still allow chat in offline mode
      setUser(userData);
      setView('chat');
    }
  }, []);

  const handleExit = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    stopHeartbeat();
    setUser(null);
    setView('landing');
  }, []);

  const handleShowDashboard = useCallback(() => {
    setView('dashboard');
  }, []);

  const handleBackFromDashboard = useCallback(() => {
    setView('landing');
  }, []);

  const handleStartFromDashboard = useCallback(() => {
    setView('landing');
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white antialiased overflow-hidden">
      {view === 'landing' && (
        <LandingPage 
          onStart={handleStart} 
          onlineStats={onlineStats}
          onShowDashboard={handleShowDashboard}
        />
      )}
      
      {view === 'dashboard' && (
        <PublicDashboard
          onBack={handleBackFromDashboard}
          onStartChat={handleStartFromDashboard}
        />
      )}
      
      {view === 'chat' && user && (
        <ChatRoom 
          user={user} 
          onExit={handleExit} 
          onlineStats={onlineStats}
        />
      )}
    </main>
  );
}

export default App;