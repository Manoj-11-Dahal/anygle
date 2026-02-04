import { useState, useCallback, useRef, useEffect } from 'react';
import type { Match } from '@/types';

interface WebRTCState {
  remoteStream: MediaStream | null;
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  isRemoteVideoOn: boolean;
  isRemoteAudioOn: boolean;
}

export function useWebRTC(localStream: MediaStream | null) {
  const [state, setState] = useState<WebRTCState>({
    remoteStream: null,
    connectionState: 'new',
    isRemoteVideoOn: true,
    isRemoteAudioOn: true,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setState(prev => ({ ...prev, remoteStream: stream }));
    };

    pc.onconnectionstatechange = () => {
      setState(prev => ({
        ...prev,
        connectionState: pc.connectionState as WebRTCState['connectionState'],
      }));
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setState(prev => ({ ...prev, connectionState: 'disconnected' }));
      }
    };

    return pc;
  }, []);

  const connectToPeer = useCallback(async (_match: Match) => {
    if (!localStream) return;

    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // In a real app, this would exchange SDP offers/answers via signaling server
    // For demo, we simulate connection
    setState(prev => ({ ...prev, connectionState: 'connecting' }));
    
    setTimeout(() => {
      setState(prev => ({ ...prev, connectionState: 'connected' }));
    }, 1000);
  }, [localStream, createPeerConnection]);

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setState({
      remoteStream: null,
      connectionState: 'new',
      isRemoteVideoOn: true,
      isRemoteAudioOn: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    remoteStream: state.remoteStream,
    connectionState: state.connectionState,
    isRemoteVideoOn: state.isRemoteVideoOn,
    isRemoteAudioOn: state.isRemoteAudioOn,
    connectToPeer,
    disconnect,
  };
}
