import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Video, MessageSquare, Mic, Eye, ChevronRight, Check, Sparkles, Users, BarChart3 } from 'lucide-react';
import type { User, AgeCategory, ChatMode, QueueType, OnlineStats } from '@/types';
import { INTERESTS } from '@/types';

interface LandingPageProps {
  onStart: (user: User) => void;
  onlineStats: OnlineStats;
  onShowDashboard: () => void;
}

export default function LandingPage({ onStart, onlineStats, onShowDashboard }: LandingPageProps) {
  const [step, setStep] = useState(0);
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('adults');
  const [mode, setMode] = useState<ChatMode>('video');
  const [queueType, setQueueType] = useState<QueueType>('moderated');
  const [interests, setInterests] = useState<string[]>([]);
  const [, setHoveredMode] = useState<ChatMode | null>(null);

  const toggleInterest = (id: string) => {
    setInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const handleStart = () => {
    const user: User = {
      id: `user_${Date.now()}`,
      ageCategory,
      mode,
      queueType,
      interests,
      isVideoOn: true,
      isAudioOn: true,
      blurEnabled: queueType === 'moderated',
    };
    onStart(user);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center px-4 w-full max-w-lg"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 shadow-2xl"
            >
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-3 sm:mb-4 tracking-tight"
            >
              Anygle
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg md:text-xl text-zinc-400 mb-3 sm:mb-4 max-w-xs sm:max-w-md px-2"
            >
              The video chat platform you actually want to use
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-xs sm:text-sm text-zinc-500 mb-8 sm:mb-12 px-4"
            >
              No accounts. No downloads. Instant connections.
            </motion.p>

            {/* Online Stats - T/p format */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8"
            >
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 sm:px-4 py-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm text-zinc-400">T/p=</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400">{onlineStats.totalOnline.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 sm:px-4 py-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
                <span className="text-xs sm:text-sm text-zinc-400">Queue:</span>
                <span className="text-sm sm:text-base font-bold text-violet-400">{onlineStats.inQueue.toLocaleString()}</span>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(1)}
              className="group relative px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-violet-500/25 transition-all overflow-hidden w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                Start Chatting
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              onClick={onShowDashboard}
              className="mt-4 text-zinc-500 hover:text-zinc-300 text-sm transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View Public Dashboard
            </motion.button>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="age"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md px-4"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Who are you?</h2>
            <p className="text-sm sm:text-base text-zinc-400 mb-6 sm:mb-8">Choose your zone</p>

            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => { setAgeCategory('teens'); setStep(2); }}
                className={`w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
                  ageCategory === 'teens'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Teen Zone</h3>
                    <p className="text-xs sm:text-sm text-zinc-400">Ages 13-17 • Strictly moderated</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setAgeCategory('adults'); setStep(2); }}
                className={`w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
                  ageCategory === 'adults'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Adult Zone</h3>
                    <p className="text-xs sm:text-sm text-zinc-400">Ages 18+ • Moderated & Unmoderated</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep(0)}
              className="mt-4 sm:mt-6 text-sm text-zinc-500 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="mode"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md px-4"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">How do you want to connect?</h2>
            <p className="text-sm sm:text-base text-zinc-400 mb-6 sm:mb-8">Choose your chat mode</p>

            <div className="space-y-3 sm:space-y-4">
              {[
                { id: 'video', icon: Video, label: 'Video Chat', desc: 'Face-to-face conversations', color: 'from-violet-500 to-fuchsia-500' },
                { id: 'voice', icon: Mic, label: 'Voice Only', desc: 'Audio conversations only', color: 'from-emerald-400 to-teal-500' },
                { id: 'text', icon: MessageSquare, label: 'Text Chat', desc: 'Anonymous messaging', color: 'from-blue-400 to-cyan-500' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as ChatMode)}
                  onMouseEnter={() => setHoveredMode(m.id as ChatMode)}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                    mode === m.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center flex-shrink-0`}>
                      <m.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-white">{m.label}</h3>
                      <p className="text-xs sm:text-sm text-zinc-400">{m.desc}</p>
                    </div>
                    {mode === m.id && <Check className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            {mode === 'video' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 sm:mt-6 p-3 sm:p-4 bg-zinc-800/50 rounded-lg sm:rounded-xl border border-zinc-700"
              >
                <p className="text-xs sm:text-sm text-zinc-300 mb-3">Queue Type:</p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setQueueType('moderated')}
                    className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      queueType === 'moderated'
                        ? 'bg-violet-500 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Moderated</span>
                      <span className="xs:hidden">Mod</span>
                    </div>
                    <span className="text-[10px] sm:text-xs opacity-70 block mt-0.5">Blur on</span>
                  </button>
                  <button
                    onClick={() => setQueueType('unmoderated')}
                    className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      queueType === 'unmoderated'
                        ? 'bg-violet-500 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Unmoderated</span>
                      <span className="xs:hidden">Unmod</span>
                    </div>
                    <span className="text-[10px] sm:text-xs opacity-70 block mt-0.5">No blur</span>
                  </button>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between mt-4 sm:mt-6">
              <button
                onClick={() => setStep(1)}
                className="text-xs sm:text-sm text-zinc-500 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Continue →
              </button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md px-4"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">What are you into?</h2>
            <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">
              Select up to 5 interests
            </p>

            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 max-h-48 sm:max-h-64 overflow-y-auto p-2 -mx-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    interests.includes(interest.id)
                      ? 'bg-violet-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <span className="mr-1">{interest.icon}</span>
                  <span className="hidden sm:inline">{interest.label}</span>
                  <span className="sm:hidden">{interest.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="text-xs sm:text-sm text-zinc-500 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-violet-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-violet-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md px-4"
          >
            <div className="text-center mb-6 sm:mb-8">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-violet-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Keep it safe</h2>
              <p className="text-sm sm:text-base text-zinc-400">Community guidelines</p>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {[
                'No personal information (names, addresses, social media)',
                'No harassment, hate speech, or threats',
                'No sexual content involving minors',
                'No illegal activity or solicitation',
                'Use the report button for violations',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2 sm:gap-3 text-zinc-300">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm">{rule}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-violet-500/25 transition-all"
            >
              I Agree - Start Chatting
            </button>

            <button
              onClick={() => setStep(3)}
              className="w-full mt-3 sm:mt-4 text-xs sm:text-sm text-zinc-500 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
}
