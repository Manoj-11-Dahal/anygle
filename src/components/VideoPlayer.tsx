import { useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Shield, AlertCircle, RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  label: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  blurEnabled?: boolean;
  onToggleVideo?: () => void;
  onToggleAudio?: () => void;
  onToggleBlur?: () => void;
  onRetry?: () => void;
  showControls?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export default function VideoPlayer({
  stream,
  isLocal = false,
  label,
  isVideoOn,
  isAudioOn,
  blurEnabled = false,
  onToggleVideo,
  onToggleAudio,
  onToggleBlur,
  onRetry,
  showControls = false,
  isLoading = false,
  error = null,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getGradient = () => {
    if (isLocal) {
      return 'from-violet-500/20 to-fuchsia-500/20';
    }
    return 'from-zinc-800 to-zinc-900';
  };

  return (
    <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br ${getGradient()} border border-zinc-700/50 h-full`}>
      {/* Video or Black Screen */}
      <div className="aspect-video sm:aspect-auto sm:h-full relative">
        {stream && isVideoOn && !error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className={`w-full h-full object-cover ${blurEnabled ? 'blur-md' : ''}`}
            />
            {blurEnabled && (
              <div className="absolute inset-0 bg-violet-500/10 backdrop-blur-sm" />
            )}
          </>
        ) : (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center min-h-[120px] sm:min-h-0 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-3 sm:border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <span className="text-zinc-500 text-xs sm:text-sm">Connecting...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-red-400" />
                </div>
                <span className="text-red-400 text-xs sm:text-sm max-w-[200px]">{error}</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-2 sm:mb-3 ${!isVideoOn ? 'opacity-50' : ''}`}>
                  {!isVideoOn ? (
                    <VideoOff className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-zinc-600" />
                  ) : (
                    <Video className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-zinc-600" />
                  )}
                </div>
                <span className="text-zinc-600 text-xs sm:text-sm">
                  {!isVideoOn ? 'Camera is off' : 'Waiting for video...'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Label Badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold ${
            isLocal 
              ? 'bg-violet-500/90 text-white' 
              : 'bg-zinc-800/90 text-zinc-300 border border-zinc-700'
          }`}>
            {isLocal ? 'You' : label}
          </span>
        </div>

        {/* Audio/Video Status */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex gap-1.5 sm:gap-2">
          {!isAudioOn && (
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-red-500/90 flex items-center justify-center">
              <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
            </div>
          )}
          {!isVideoOn && (
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-red-500/90 flex items-center justify-center">
              <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
            </div>
          )}
          {blurEnabled && !isLocal && (
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-violet-500/90 flex items-center justify-center">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleVideo}
              className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                isVideoOn 
                  ? 'bg-zinc-800/90 text-white hover:bg-zinc-700' 
                  : 'bg-red-500/90 text-white hover:bg-red-600'
              }`}
            >
              {isVideoOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            
            <button
              onClick={onToggleAudio}
              className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                isAudioOn 
                  ? 'bg-zinc-800/90 text-white hover:bg-zinc-700' 
                  : 'bg-red-500/90 text-white hover:bg-red-600'
              }`}
            >
              {isAudioOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {onToggleBlur && (
              <button
                onClick={onToggleBlur}
                className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  blurEnabled 
                    ? 'bg-violet-500/90 text-white hover:bg-violet-600' 
                    : 'bg-zinc-800/90 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
