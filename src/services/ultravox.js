import { Room } from '@livekit/react-native';
import { RoomEvent } from 'livekit-client';
import { createLocalAudioTrack } from '@livekit/react-native-webrtc';

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
      throw new Error('Already in a call');
    }

    this._setStatus(UltravoxStatus.CONNECTING);
    
    try {
      console.log('Creating LiveKit room...');
      try {
        this._room = new Room();
        console.log('Room created:', this._room);
      } catch (error) {
        console.error('Error creating Room:', error);
        console.error('Stack trace:', error.stack);
        throw error;
      }
      
      console.log('Setting up room event handlers...');
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

      console.log('Connecting to LiveKit server:', joinUrl);
      try {
        const [track] = await Promise.all([
          createLocalAudioTrack(),
          this._room.connect(joinUrl)
        ]);
        console.log('Connected and track created:', track);

        this._localAudioTrack = track;
        this._onTrackCreated?.(track);
        await this._room.localParticipant.publishTrack(track);
        
        this._setStatus(UltravoxStatus.IDLE);
      } catch (error) {
        console.error('Error connecting to LiveKit:', error);
        console.error('Stack trace:', error.stack);
        throw error;
      }
    } catch (error) {
      console.error('Error joining call:', error);
      console.error('Stack trace:', error.stack);
      await this.disconnect();
      throw error;
    }
  }

  async disconnect() {
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
