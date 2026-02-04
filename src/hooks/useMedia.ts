import { useState, useCallback, useRef, useEffect } from 'react';

interface MediaState {
  stream: MediaStream | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  error: string | null;
  isLoading: boolean;
  permission: 'prompt' | 'granted' | 'denied' | 'unknown';
}

export function useMedia() {
  const [state, setState] = useState<MediaState>({
    stream: null,
    isVideoOn: true,
    isAudioOn: true,
    error: null,
    isLoading: false,
    permission: 'prompt',
  });
  
  const streamRef = useRef<MediaStream | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const [cameraResult, micResult] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
          navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
        ]);
        
        if (cameraResult?.state === 'denied' || micResult?.state === 'denied') {
          setState(prev => ({ ...prev, permission: 'denied' }));
          return 'denied';
        } else if (cameraResult?.state === 'granted' && micResult?.state === 'granted') {
          setState(prev => ({ ...prev, permission: 'granted' }));
          return 'granted';
        }
      }
      return 'prompt';
    } catch {
      return 'unknown';
    }
  }, []);

  const initializeMedia = useCallback(async (video = true, audio = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check HTTPS requirement (camera requires secure context)
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera requires HTTPS. Please use a secure connection or localhost.');
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Check for media devices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera/microphone access. Please use Chrome, Firefox, Edge, or Safari.');
      }

      // Check permissions first
      const perm = await checkPermission();
      if (perm === 'denied') {
        throw new Error('Camera/Microphone permission denied. Please allow access in your browser settings and refresh the page.');
      }

      const constraints: MediaStreamConstraints = {
        video: video ? { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      setState({
        stream,
        isVideoOn: video,
        isAudioOn: audio,
        error: null,
        isLoading: false,
        permission: 'granted',
      });
      
      return stream;
    } catch (err) {
      console.error('Media initialization error:', err);
      let errorMessage = 'Failed to access camera/microphone';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permission denied. Please allow camera/microphone access in your browser settings and refresh.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera/microphone found. Please connect a device and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is in use by another application. Please close other apps and try again.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not support required resolution. Trying fallback...';
          // Try with lower resolution
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
              audio: audio,
            });
            streamRef.current = fallbackStream;
            setState({
              stream: fallbackStream,
              isVideoOn: video,
              isAudioOn: audio,
              error: null,
              isLoading: false,
              permission: 'granted',
            });
            return fallbackStream;
          } catch (fallbackErr) {
            errorMessage = 'Camera access failed. Please check your device settings.';
          }
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Camera access blocked for security reasons. Please ensure you\'re on HTTPS or localhost.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        stream: null,
        videoEnabled: false,
        audioEnabled: false,
        error: errorMessage,
        isLoading: false,
        permission: 'denied',
      }));
      
      return null;
    }
  }, [checkPermission]);

  const retryMedia = useCallback(async (video = true, audio = true) => {
    setState(prev => ({ ...prev, error: null, isLoading: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    return initializeMedia(video, audio);
  }, [initializeMedia]);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoOn: videoTrack.enabled }));
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isAudioOn: audioTrack.enabled }));
      }
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setState({
      stream: null,
      isVideoOn: false,
      isAudioOn: false,
      error: null,
      isLoading: false,
      permission: 'unknown',
    });
  }, []);

  useEffect(() => {
    checkPermission();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [checkPermission]);

  return {
    ...state,
    initializeMedia,
    retryMedia,
    toggleVideo,
    toggleAudio,
    stopMedia,
  };
}
