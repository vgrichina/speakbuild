import { createLocalAudioTrack, setLogExtension, setLogLevel } from 'livekit-client';
import { registerGlobals } from '@livekit/react-native-webrtc';
import { AudioSession } from '@livekit/react-native';

// Register WebRTC globals
registerGlobals();

// Setup LiveKit logging
setLogLevel('trace');
setLogExtension((level, msg, context) => {
  console.log(`LiveKit [${level}]:`, msg, context);
});

export const UltravoxStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking'
};

export class UltravoxClient {
  constructor() {
    this._status = UltravoxStatus.DISCONNECTED;
    this._isMicMuted = false;
    this._localAudioTrack = null;
    this._onTranscript = null;
    this._onStatusChange = null;
    this._onTrackCreated = null;
  }

  onTrackCreated(callback) {
    this._onTrackCreated = callback;
  }

  get status() { return this._status; }
  get isMicMuted() { return this._isMicMuted; }

  onTranscript(callback) {
    this._onTranscript = callback;
  }

  onStatusChange(callback) {
    this._onStatusChange = callback;
  }

  async joinCall(url, token) {
    if (this._status !== UltravoxStatus.DISCONNECTED) {
      throw new Error('Cannot join a new call while already in a call');
    }

    // Start audio session before connecting
    await AudioSession.startAudioSession();
    
    this._setStatus(UltravoxStatus.CONNECTING);

    // Create local audio track
    this._localAudioTrack = await createLocalAudioTrack();
    this._onTrackCreated?.(this._localAudioTrack);

    this._setStatus(UltravoxStatus.IDLE);
    return this._localAudioTrack;
  }

  async disconnect() {
    // Stop audio session
    await AudioSession.stopAudioSession();
    this._setStatus(UltravoxStatus.DISCONNECTED);
    
    if (this._localAudioTrack) {
      this._localAudioTrack.stop();
      this._localAudioTrack = null;
    }
  }

  toggleMicMute() {
    if (!this._localAudioTrack) return;
    
    this._isMicMuted = !this._isMicMuted;
    this._localAudioTrack.enabled = !this._isMicMuted;
  }

  _setStatus(status) {
    if (this._status === status) return;
    this._status = status;
    this._onStatusChange?.(status);
  }


  _handleDataMessage(msg) {
    switch (msg.type) {
      case 'state':
        this._setStatus(msg.state);
        break;
      case 'transcript':
        this._onTranscript?.({
          text: msg.text,
          isFinal: msg.final,
          role: msg.role,
          medium: msg.medium
        });
        break;
      default:
        console.log('Unknown message type:', msg.type);
    }
  }
}
