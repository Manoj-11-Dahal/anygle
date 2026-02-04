import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Activity, Video, MessageSquare, Mic, Shield, Eye, 
  Globe, Clock, TrendingUp, AlertTriangle, CheckCircle, BarChart3,
  Zap, ChevronRight, RefreshCw
} from 'lucide-react';
import type { DashboardStats } from '@/types';

interface PublicDashboardProps {
  onBack: () => void;
  onStartChat: () => void;
}

export default function PublicDashboard({ onBack, onStartChat }: PublicDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 124832,
    activeUsers: 8947,
    totalMatches: 456789,
    avgSessionTime: 4.2,
    reportsToday: 23,
    moderationActions: 156,
    queueBreakdown: { moderated: 3421, unmoderated: 5526 },
    modeBreakdown: { video: 5234, voice: 1876, text: 1837 },
    topInterests: [
      { name: 'Gaming', count: 2341 },
      { name: 'Music', count: 1987 },
      { name: 'Movies', count: 1654 },
      { name: 'Dating', count: 1432 },
      { name: 'Tech', count: 1234 },
    ],
    recentConnections: [
      { time: 'Just now', type: 'Video Match', region: 'US' },
      { time: '2s ago', type: 'Voice Match', region: 'UK' },
      { time: '3s ago', type: 'Text Match', region: 'CA' },
      { time: '5s ago', type: 'Video Match', region: 'DE' },
      { time: '7s ago', type: 'Video Match', region: 'FR' },
    ],
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 20) - 10,
        totalMatches: prev.totalMatches + Math.floor(Math.random() * 5),
        queueBreakdown: {
          moderated: Math.max(3000, prev.queueBreakdown.moderated + Math.floor(Math.random() * 50) - 25),
          unmoderated: Math.max(5000, prev.queueBreakdown.unmoderated + Math.floor(Math.random() * 100) - 50),
        },
      }));
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 100),
        totalMatches: prev.totalMatches + Math.floor(Math.random() * 20),
      }));
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subtext, 
    color,
    trend
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    subtext?: string;
    color: string;
    trend?: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        {trend && (
          <span className="text-xs sm:text-sm text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 sm:mt-4">
        <div className="text-2xl sm:text-3xl font-bold text-white">{value.toLocaleString()}</div>
        <div className="text-xs sm:text-sm text-zinc-400 mt-1">{label}</div>
        {subtext && <div className="text-[10px] sm:text-xs text-zinc-500 mt-1">{subtext}</div>}
      </div>
    </motion.div>
  );

  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Platform Dashboard</h1>
              <p className="text-xs sm:text-sm text-zinc-500">Real-time activity monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Updated {lastUpdate.toLocaleTimeString()}
            </div>
            <button
              onClick={onStartChat}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Start Chatting</span>
              <span className="sm:hidden">Chat</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Users}
            label="People Online"
            value={stats.activeUsers}
            subtext="Right now"
            color="bg-gradient-to-br from-emerald-500 to-teal-500"
            trend="+5.2%"
          />
          <StatCard
            icon={Activity}
            label="Total Matches Today"
            value={stats.totalMatches.toString().slice(-6)}
            subtext="Across all modes"
            color="bg-gradient-to-br from-violet-500 to-fuchsia-500"
            trend="+12%"
          />
          <StatCard
            icon={Clock}
            label="Avg Session"
            value={`${stats.avgSessionTime}m`}
            subtext="Per connection"
            color="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <StatCard
            icon={Globe}
            label="Total Users"
            value={stats.totalUsers}
            subtext="All time"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
            trend="+8.4%"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Queue Breakdown */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                Queue Status
              </h3>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Moderated
                  </span>
                  <span className="font-medium">{stats.queueBreakdown.moderated.toLocaleString()}</span>
                </div>
                <ProgressBar 
                  value={stats.queueBreakdown.moderated} 
                  max={stats.queueBreakdown.moderated + stats.queueBreakdown.unmoderated} 
                  color="bg-emerald-500" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Unmoderated
                  </span>
                  <span className="font-medium">{stats.queueBreakdown.unmoderated.toLocaleString()}</span>
                </div>
                <ProgressBar 
                  value={stats.queueBreakdown.unmoderated} 
                  max={stats.queueBreakdown.moderated + stats.queueBreakdown.unmoderated} 
                  color="bg-amber-500" 
                />
              </div>
            </div>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-zinc-800 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center">
                <Video className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 mx-auto mb-1" />
                <div className="text-lg sm:text-xl font-bold">{(stats.modeBreakdown.video / 1000).toFixed(1)}k</div>
                <div className="text-[10px] sm:text-xs text-zinc-500">Video</div>
              </div>
              <div className="text-center">
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto mb-1" />
                <div className="text-lg sm:text-xl font-bold">{(stats.modeBreakdown.voice / 1000).toFixed(1)}k</div>
                <div className="text-[10px] sm:text-xs text-zinc-500">Voice</div>
              </div>
              <div className="text-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-lg sm:text-xl font-bold">{(stats.modeBreakdown.text / 1000).toFixed(1)}k</div>
                <div className="text-[10px] sm:text-xs text-zinc-500">Text</div>
              </div>
            </div>
          </div>

          {/* Top Interests */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              Trending Topics
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              {stats.topInterests.map((interest, i) => (
                <div key={interest.name}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-zinc-300">{i + 1}. {interest.name}</span>
                    <span className="text-zinc-500">{interest.count.toLocaleString()}</span>
                  </div>
                  <ProgressBar 
                    value={interest.count} 
                    max={stats.topInterests[0].count} 
                    color="bg-gradient-to-r from-emerald-500 to-teal-500" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Safety Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              Safety Overview
            </h3>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-zinc-400">Reports Today</div>
                    <div className="text-lg sm:text-xl font-bold">{stats.reportsToday}</div>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Low</span>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-zinc-400">Actions Taken</div>
                    <div className="text-lg sm:text-xl font-bold">{stats.moderationActions}</div>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Active</span>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-zinc-800">
              <div className="text-xs sm:text-sm text-zinc-500 text-center">
                Safety team active 24/7
              </div>
            </div>
          </div>
        </div>

        {/* Live Connections Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse" />
            Live Connections
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {stats.recentConnections.map((conn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-800/50 rounded-xl p-3 sm:p-4 text-center hover:bg-zinc-800 transition-colors"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-700 mx-auto mb-2 flex items-center justify-center">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-white">{conn.region}</div>
                <div className="text-[10px] sm:text-xs text-zinc-500">{conn.type}</div>
                <div className="text-[10px] sm:text-xs text-emerald-400 mt-1">{conn.time}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to join?</h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">
            {stats.activeUsers.toLocaleString()} people are online right now
          </p>
          <button
            onClick={onStartChat}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-base sm:text-lg rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Start Chatting Now
          </button>
        </div>
      </div>
    </div>
  );
}
