import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, SkipForward, Flag, Menu, X, MessageSquare, Shield, Eye, Users, Zap, Clock } from 'lucide-react';
import type { User, Message, OnlineStats } from '@/types';
import { useMedia } from '@/hooks/useMedia';
import { 
  chatAPI, 
  signalingAPI, 
  subscribeToUserChannel,
  startHeartbeat,
  stopHeartbeat 
} from '@/lib/api';
import VideoPlayer from './VideoPlayer';

interface ChatRoomProps {
  user: User;
  onExit: () => void;
  onlineStats: OnlineStats;
}

interface ChatState {
  status: 'idle' | 'searching' | 'connected' | 'ended';
  matchCount: number;
  skipTimer: number;
  canSkip: boolean;
  chatId?: string;
  partnerId?: string;
}

export default function ChatRoom({ user, onExit, onlineStats }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(user.blurEnabled);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({
    status: 'idle',
    matchCount: 0,
    skipTimer: 30,
    canSkip: false,
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const { 
    stream, 
    isVideoOn, 
    isAudioOn, 
    error: mediaError, 
    isLoading: mediaLoading,
    initializeMedia, 
    retryMedia,
    toggleVideo, 
    toggleAudio, 
    stopMedia 
  } = useMedia();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Initialize and start matching
  useEffect(() => {
    startHeartbeat();
    
    if (user.mode === 'video' || user.mode === 'voice') {
      initializeMedia(user.mode === 'video', true);
    }
    
    startMatching();
    
    return () => {
      cleanup();
      stopHeartbeat();
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Skip timer
  useEffect(() => {
    if (chatState.status === 'connected' && !chatState.canSkip) {
      skipTimerRef.current = setInterval(() => {
        setChatState(prev => {
          if (prev.skipTimer <= 1) {
            return { ...prev, skipTimer: 0, canSkip: true };
          }
          return { ...prev, skipTimer: prev.skipTimer - 1 };
        });
      }, 1000);
    }

    return () => {
      if (skipTimerRef.current) {
        clearInterval(skipTimerRef.current);
      }
    };
  }, [chatState.status, chatState.canSkip]);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopMedia();
    setRemoteStream(null);
  }, [stopMedia]);

  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const startMatching = useCallback(async () => {
    try {
      setChatState(prev => ({ ...prev, status: 'searching', skipTimer: 30, canSkip: false }));
      setMessages([]);
      setConnectionError(null);

      // Subscribe to user channel for real-time events
      const currentUser = JSON.parse(localStorage.getItem('anygle_user') || '{}');
      if (currentUser?.id) {
        unsubscribeRef.current = subscribeToUserChannel(currentUser.id, {
          onMatchFound: handleMatchFound,
          onNewMessage: handleNewMessage,
          onWebRtcSignal: handleWebRtcSignal,
        });
      }

      // Start matching via API
      const response = await chatAPI.startMatching({
        mode: user.mode,
        queue_type: user.queueType,
        interests: user.interests,
      });

      if (response.data.status === 'matched') {
        handleMatchFound(response.data.chat);
      }
      // Reset retry count on success
      retryCountRef.current = 0;
      // If status is 'searching', we wait for match.found event
    } catch (error: any) {
      console.error('Matching error:', error);
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Connection failed';
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Exponential backoff, max 30s
        setConnectionError(`${errorMessage}. Retrying in ${Math.round(backoffDelay/1000)}s... (${retryCountRef.current}/${maxRetries})`);
        
        // Retry after delay
        setTimeout(() => {
          startMatching();
        }, backoffDelay);
      } else {
        setConnectionError(`${errorMessage}. Max retries reached. Click Retry to try again.`);
      }
    }
  }, [user]);

  const handleMatchFound = useCallback(async (chatData: any) => {
    setChatState(prev => ({
      ...prev,
      status: 'connected',
      chatId: chatData.chat_id,
      partnerId: chatData.partner?.id,
      matchCount: prev.matchCount + 1,
    }));

    // Load existing messages
    try {
      const messagesResponse = await chatAPI.getMessages(chatData.chat_id);
      if (messagesResponse.data.messages) {
        setMessages(messagesResponse.data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.content,
          timestamp: new Date(msg.timestamp),
          isLocal: msg.sender === 'You',
        })));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }

    // Initialize WebRTC for video/voice
    if (user.mode === 'video' || user.mode === 'voice') {
      initializeWebRTC(chatData.chat_id, chatData.partner?.id);
    }
  }, [user.mode]);

  const handleNewMessage = useCallback((data: any) => {
    const newMessage: Message = {
      id: data.id?.toString() || Date.now().toString(),
      text: data.content,
      timestamp: new Date(data.timestamp || Date.now()),
      isLocal: false,
    };
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(false);
  }, []);

  const handleWebRtcSignal = useCallback(async (data: any) => {
    const signal = data.signal;
    
    if (!peerConnectionRef.current) return;

    try {
      if (signal.type === 'offer') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        if (chatState.chatId) {
          await signalingAPI.sendAnswer(chatState.chatId, answer);
        }
      } else if (signal.type === 'answer') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === 'ice-candidate') {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (error) {
      console.error('WebRTC error:', error);
    }
  }, [chatState.chatId]);

  const initializeWebRTC = useCallback(async (chatId: string, _partnerId?: string) => {
    if (!stream) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    peerConnectionRef.current = pc;

    // Add local stream
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await signalingAPI.sendIceCandidate(chatId, event.candidate);
        } catch (error) {
          console.error('Failed to send ICE candidate:', error);
        }
      }
    };

    // Create and send offer if initiator
    // In real implementation, server would tell us who is initiator
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    try {
      await signalingAPI.sendOffer(chatId, offer);
    } catch (error) {
      console.error('Failed to send offer:', error);
    }
  }, [stream]);

  const addMessage = useCallback((text: string, isLocal: boolean) => {
    const newMessage: Message = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      text,
      timestamp: new Date(),
      isLocal,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !chatState.chatId || chatState.status !== 'connected') return;

    const content = inputText.trim();
    addMessage(content, true);
    setInputText('');
    inputRef.current?.focus();

    try {
      await chatAPI.sendMessage(chatState.chatId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [inputText, chatState.chatId, chatState.status, addMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSkip = useCallback(async () => {
    if (chatState.chatId) {
      try {
        await chatAPI.skipChat(chatState.chatId);
      } catch (error) {
        console.error('Skip error:', error);
      }
    }

    cleanup();
    setChatState(prev => ({ ...prev, status: 'idle', skipTimer: 30, canSkip: false }));
    startMatching();
  }, [chatState.chatId, cleanup, startMatching]);

  const handleReport = useCallback(async () => {
    if (!chatState.chatId) return;

    try {
      await chatAPI.report(chatState.chatId, 'inappropriate_content');
      alert('Report submitted. Thank you for helping keep Anygle safe.');
      handleSkip();
    } catch (error) {
      console.error('Report error:', error);
    }
  }, [chatState.chatId, handleSkip]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const isVideoMode = user.mode !== 'text';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-white text-sm sm:text-base">Anygle</h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`flex items-center gap-1 ${
                    user.queueType === 'moderated' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {user.queueType === 'moderated' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {user.queueType}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 capitalize">{user.mode}</span>
                </div>
              </div>
            </div>
            
            {/* Online Stats T/p= */}
            <div className="hidden md:flex items-center gap-2 bg-zinc-800/50 rounded-lg px-2 sm:px-3 py-1 border border-zinc-700/50">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-zinc-500">T/p=</span>
              <span className="text-xs font-semibold text-emerald-400">{onlineStats.totalOnline.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Chat Toggle */}
            {isVideoMode && (
              <button
                onClick={() => setShowMobileChat(!showMobileChat)}
                className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all flex items-center justify-center"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Skip Timer */}
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 ${
              chatState.canSkip 
                ? 'bg-violet-500 text-white' 
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">
                {chatState.canSkip ? 'Skip' : formatTime(chatState.skipTimer)}
              </span>
            </div>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all flex items-center justify-center"
            >
              {showMenu ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {connectionError && (
        <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-red-400">
            <span>{connectionError}</span>
            <button 
              onClick={() => {
                setConnectionError(null);
                startMatching();
              }}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-medium transition-colors"
            >
              Retry Now
            </button>
          </div>
        </div>
      )}

      {/* Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-2 sm:right-4 top-14 sm:top-20 z-50 w-56 sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-zinc-500 mb-2 sm:mb-3">Session Stats</div>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                <div>
                  <div className="text-white text-sm sm:text-base font-medium">{chatState.matchCount} strangers</div>
                  <div className="text-[10px] sm:text-xs text-zinc-500">chatted with</div>
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-800 p-3 sm:p-4">
              <button
                onClick={() => {
                  handleSkip();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
              >
                <SkipForward className="w-4 h-4" />
                New Chat
              </button>
              <button
                onClick={onExit}
                className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1 text-sm"
              >
                <X className="w-4 h-4" />
                End Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 flex max-w-7xl mx-auto w-full p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden ${isVideoMode ? 'flex-col lg:flex-row' : ''}`}>
        {/* Video Section */}
        {isVideoMode && (
          <div className={`flex flex-col gap-2 sm:gap-4 ${showMobileChat ? 'hidden lg:flex' : 'flex'} flex-1 lg:max-w-2xl xl:max-w-3xl`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 flex-1">
              <div className="order-2 sm:order-1">
                <VideoPlayer
                  stream={stream}
                  isLocal={true}
                  label="You"
                  isVideoOn={isVideoOn}
                  isAudioOn={isAudioOn}
                  showControls={true}
                  onToggleVideo={toggleVideo}
                  onToggleAudio={toggleAudio}
                  error={mediaError}
                  onRetry={() => retryMedia(user.mode === 'video', true)}
                  isLoading={mediaLoading}
                />
              </div>
              <div className="order-1 sm:order-2">
                <VideoPlayer
                  stream={remoteStream}
                  label="Stranger"
                  isVideoOn={!!remoteStream && chatState.status === 'connected'}
                  isAudioOn={!!remoteStream && chatState.status === 'connected'}
                  blurEnabled={blurEnabled && user.queueType === 'moderated'}
                  isLoading={chatState.status === 'searching'}
                  showControls={false}
                  error={chatState.status === 'connected' && !remoteStream ? 'Waiting for peer connection...' : null}
                />
              </div>
            </div>

            {user.queueType === 'moderated' && (
              <button
                onClick={() => setBlurEnabled(!blurEnabled)}
                className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm ${
                  blurEnabled 
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                {blurEnabled ? 'Safety Blur On' : 'Safety Blur Off'}
              </button>
            )}
          </div>
        )}

        {/* Chat Section */}
        <div className={`flex flex-col ${!isVideoMode ? 'flex-1' : `lg:w-80 xl:w-96 ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}`}>
          {/* Messages */}
          <div className="flex-1 bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-zinc-800 p-3 sm:p-4 overflow-y-auto min-h-0">
            {chatState.status === 'searching' ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg">Finding a stranger...</p>
                <p className="text-xs sm:text-sm mt-1 sm:mt-2">This usually takes less than a second</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Say hello to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[80%] ${
                      msg.isLocal 
                        ? 'bg-violet-500 text-white' 
                        : 'bg-zinc-800 text-zinc-200'
                    } rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3`}>
                      <p className="text-xs sm:text-sm">{msg.text}</p>
                      <span className={`text-[10px] sm:text-xs mt-1 block ${
                        msg.isLocal ? 'text-violet-200' : 'text-zinc-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-zinc-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="mt-2 sm:mt-4 flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={chatState.status === 'connected' ? "Type a message..." : "Waiting..."}
                disabled={chatState.status !== 'connected'}
                className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 outline-none disabled:opacity-50 min-w-0"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || chatState.status !== 'connected'}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-violet-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <button
              onClick={handleReport}
              disabled={chatState.status !== 'connected'}
              className="px-2.5 sm:px-4 py-2 sm:py-3 bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl text-zinc-400 hover:text-red-400 hover:border-red-500/50 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleSkip}
              disabled={!chatState.canSkip && chatState.status !== 'idle'}
              className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold rounded-xl sm:rounded-2xl hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{chatState.canSkip ? 'Next' : formatTime(chatState.skipTimer)}</span>
              <span className="sm:hidden">{chatState.canSkip ? 'Skip' : formatTime(chatState.skipTimer)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Back Button */}
      {isVideoMode && showMobileChat && (
        <button
          onClick={() => setShowMobileChat(false)}
          className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-800 text-white rounded-full text-sm shadow-lg"
        >
          ← Back to Video
        </button>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-xl py-2 sm:py-3">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0 text-[10px] sm:text-xs text-zinc-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <span>ID: {user.id?.slice(0, 6)}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline capitalize">{user.mode}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="hover:text-zinc-300 transition-colors">Terms</button>
            <button className="hover:text-zinc-300 transition-colors">Privacy</button>
            <button className="hover:text-zinc-300 transition-colors">Report</button>
          </div>
        </div>
      </footer>
    </div>
  );
}