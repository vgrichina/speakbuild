import { Room, RoomEvent, createLocalAudioTrack, setLogExtension } from 'livekit-client';
import { registerGlobals } from '@livekit/react-native-webrtc';
import { AudioSession } from '@livekit/react-native';

// Register WebRTC globals
registerGlobals();

// Setup LiveKit logging
setLogExtension((level, msg, context) => {
  console.log('LiveKit:', msg, context);
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
    this._room = null;
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

  async joinCall(joinUrl) {
    if (this._status !== UltravoxStatus.DISCONNECTED) {
      throw new Error('Cannot join a new call while already in a call');
    }

    // Start audio session before connecting
    await AudioSession.startAudioSession();

    // Add required URL parameters
    const url = new URL(joinUrl);
    url.searchParams.set('clientVersion', 'react-native_1.0.0');
    url.searchParams.set('apiVersion', '1');
    joinUrl = url.toString();

    this._setStatus(UltravoxStatus.CONNECTING);
    console.log('Connecting WebSocket to:', joinUrl);
    
    this.socket = new WebSocket(joinUrl);
    this.socket.onmessage = this._handleSocketMessage.bind(this);
    this.socket.onclose = this._handleSocketClose.bind(this);
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.disconnect();
    };
  }

  async disconnect() {
    // Stop audio session
    await AudioSession.stopAudioSession();
    this._setStatus(UltravoxStatus.DISCONNECTED);
    if (this._localAudioTrack) {
      this._localAudioTrack.stop();
      this._localAudioTrack = null;
    }
    if (this._room) {
      await this._room.disconnect();
      this._room = null;
    }
  }

  toggleMicMute() {
    if (!this._room?.localParticipant) return;
    
    this._isMicMuted = !this._isMicMuted;
    this._room.localParticipant.setMicrophoneEnabled(!this._isMicMuted);
  }

  _setStatus(status) {
    if (this._status === status) return;
    this._status = status;
    this._onStatusChange?.(status);
  }

  async _handleSocketMessage(event) {
    const msg = JSON.parse(event.data);
    console.log('WebSocket message:', msg);

    // Create LiveKit room after getting connection details
    this._room = new Room({ webAudioMix: false });
    
    this._room.on(RoomEvent.TrackSubscribed, (track) => {
      console.log('Track subscribed:', track.kind);
    });
    
    this._room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        this._handleDataMessage(msg);
      } catch (error) {
        console.error('Error handling data message:', error);
      }
    });

    const [track, _] = await Promise.all([
      createLocalAudioTrack(),
      this._room.connect(msg.roomUrl, msg.token)
    ]);

    this._localAudioTrack = track;
    this._onTrackCreated?.(track);
    await this._room.localParticipant.publishTrack(track);
    
    this._setStatus(UltravoxStatus.IDLE);
  }

  async _handleSocketClose(event) {
    console.log('WebSocket closed:', event);
    await this.disconnect();
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
