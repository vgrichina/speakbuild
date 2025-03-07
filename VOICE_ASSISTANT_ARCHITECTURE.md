# Voice Assistant Architecture Redesign

## Current Architecture Analysis

The current implementation has several services that are already well-designed:

1. **Settings Management**:
   - `settings.js` provides direct synchronous access to settings via MMKV
   - API keys are accessed with `getApiKeys()` 
   - No React state dependency

2. **Storage Services**:
   - `widgetStorage.js` handles component code storage
   - `conversationStorage.js` manages conversation history

3. **Issues in Current Architecture**:
   - React state management for core recording and transcription flow
   - Race conditions between WebSocket cleanup and transcription processing
   - Numerous re-renders due to React's state update triggering
   - Component remounting issues ("Component FIRST MOUNT" appears repeatedly)

## New Architecture: Process-Based Approach

Rather than a general subscription system, we'll treat audio sessions and component generation as discrete processes with clear lifecycles and targeted event callbacks.

```
+-----------------------------------+          +----------------------------------+
|                                   |          |                                  |
|       AudioSession (Singleton)    |          |  ComponentGeneration (Multiple)  |
|                                   |          |                                  |
+-----------------------------------+          +----------------------------------+
| - Can be in PTT or Call mode      |          | - One per transcription          |
| - Manages mic and WebSocket       |          | - Streaming generation process   |
| - Emits: volume, partialTranscript,|         | - Emits: progress, result, error |
|   finalTranscript, error          |          | - Controls: start(), abort()     |
| - Controls: start(), stop()       |          |                                  |
+-----------------------------------+          +----------------------------------+
```

## Event Flow

### AudioSession Events:
- **onVolumeChange(volume)**: 
  * Target: VoiceButton
  * Purpose: Update volume visualization

- **onPartialTranscript(text)**:
  * Target: TranscriptionBox
  * Purpose: Show real-time text as user speaks

- **onFinalTranscript(transcript)**:
  * Target: TranscriptionBox, Parent Controller
  * Purpose: Display final transcript, trigger component generation

- **onError(error)**:
  * Target: VoiceButton, ErrorBoundary 
  * Purpose: Show error state, display error message

### ComponentGeneration Events:
- **onProgress(partialResult)**:
  * Target: ResponseStream
  * Purpose: Show streaming generation result

- **onComplete(result)**:
  * Target: ResponseStream, ConversationList
  * Purpose: Display final component, add to history

- **onError(error)**:
  * Target: ResponseStream, ErrorBoundary
  * Purpose: Show error state, display error message

## Push-to-Talk Flow with Partial Transcription

```
┌─────────┐         ┌────────────┐        ┌──────────────┐        ┌─────────────┐
│         │         │            │        │              │        │             │
│  User   │ press   │VoiceButton │ start  │ AudioSession │ record │ WebSocket   │
│         ├────────►│            ├───────►│              ├───────►│             │
└─────────┘         └────────────┘        └──────────────┘        └─────────────┘
                          ▲                      │ ▲                     │
                          │                      │ │                     │
                          │                      │ │                     │
                          │    onVolumeChange    │ │                     │
                          │◄─────────────────────┘ │                     │
                                                   │                     │
                                                   │                     │
┌─────────────────┐                               │                     │
│                 │ update                        │                     │
│TranscriptionBox │◄──────────────────────────────┘                     │
│                 │ onPartialTranscript                                 │
└─────────────────┘                                                     │
                                                                        │
                                                                        │
┌─────────┐         ┌─────────────┐       ┌──────────────┐        ┌────┴──────────┐
│         │ release │             │ stop  │              │ finish │                │
│  User   ├────────►│ VoiceButton ├──────►│ AudioSession │◄───────┤   WebSocket    │
│         │         │             │       │              │        │                │
└─────────┘         └─────────────┘       └──────────────┘        └────────────────┘
                                                   │
                                                   │ onFinalTranscript
                                                   ▼
┌─────────────────┐        ┌────────────────┐        ┌───────────────┐
│                 │ update │                │ create │               │
│TranscriptionBox │◄───────┤ Parent Control ├───────►│ComponentGenera│
│                 │        │                │        │tion           │
└─────────────────┘        └────────────────┘        └───────────────┘
```

## Call Mode Flow

```
┌─────────┐         ┌────────────┐        ┌──────────────┐        ┌─────────────┐
│         │ start   │            │ start  │              │ record │             │
│  User   ├────────►│ Call UI    ├───────►│ AudioSession ├───────►│ WebSocket   │
│         │ call    │            │ mode   │              │        │             │
└─────────┘         └────────────┘        └──────────────┘        └─────────────┘
                                                 │                        │
                                                 │                        │
                         +---------------------+ │                        │
                         |  Speech Segment 1  |◄┘                        │
                         +---------------------+                          │
                                 │                                        │
                                 │ onFinalTranscript(1)                   │
                                 ▼                                        │
┌─────────────────┐        ┌────────────────┐                            │
│                 │ update │                │                            │
│TranscriptionBox │◄───────┤ Generation 1   │                            │
│                 │        │                │                            │
└─────────────────┘        └────────────────┘                            │
                                 │                                        │
                                 │ start()                                │
                                 ▼                                        │
┌─────────────────┐        ┌────────────────┐                            │
│                 │ update │                │                            │
│ ResponseStream  │◄───────┤ API Streaming  │                            │
│                 │        │                │                            │
└─────────────────┘        └────────────────┘                            │
                                                                          │
                                                                          │
                         +---------------------+                          │
                         |  Speech Segment 2  |◄─────────────────────────┘
                         +---------------------+
                                 │
                                 │ onFinalTranscript(2)
                                 ▼
┌─────────────────┐        ┌────────────────┐
│                 │ update │                │
│TranscriptionBox │◄───────┤ Generation 2   │
│                 │        │                │
└─────────────────┘        └────────────────┘
```

## Implementation Plan

### 1. Create AudioSession Singleton

```javascript
// audioSession.js
class AudioSession {
  constructor() {
    this.active = false;
    this.mode = null;
    this.callbacks = {
      volumeChange: null,
      partialTranscript: null,
      finalTranscript: null,
      error: null
    };
  }

  // Start audio session with all callback types
  start({
    mode = 'ptt', // 'ptt' or 'call'
    onVolumeChange,
    onPartialTranscript,
    onFinalTranscript,
    onError
  }) {
    if (this.active) {
      this.stop(); // Stop existing session
    }
    
    this.active = true;
    this.mode = mode;
    this.callbacks = {
      volumeChange: onVolumeChange,
      partialTranscript: onPartialTranscript,
      finalTranscript: onFinalTranscript,
      error: onError
    };
    
    // Start recording, setup WebSocket etc.
    // ...
    
    return {
      stop: () => this.stop(),
      isActive: () => this.active,
      getMode: () => this.mode
    };
  }

  stop() {
    if (!this.active) return;
    
    // Cleanup WebSocket, mic, etc.
    // ...
    
    this.active = false;
  }

  // Handle WebSocket messages including partial transcripts
  handleWebSocketMessage(message) {
    // For volume/audio level updates
    if (message.type === 'volume') {
      if (this.callbacks.volumeChange) {
        this.callbacks.volumeChange(message.level);
      }
    }
    
    // For transcript updates during recording
    if (message.type === 'partial') {
      if (this.callbacks.partialTranscript) {
        this.callbacks.partialTranscript(message.text);
      }
    }
    
    // For final transcript after recording stops
    if (message.type === 'final') {
      if (this.callbacks.finalTranscript) {
        this.callbacks.finalTranscript(message.text);
      }
    }
  }
}

// Export singleton
export const audioSession = new AudioSession();
```

### 2. Create ComponentGeneration Factory

```javascript
// componentGeneration.js
import { conversationStorage } from './conversationStorage';
import { processWithClaudeStream } from './processStream';
import { getApiKeys } from './settings';

// Component generation factory
export function createComponentGeneration(transcription, options = {}) {
  const id = generateUniqueId();
  let status = 'idle'; // idle, generating, complete, error
  let result = null;
  let error = null;
  let abortController = new AbortController();
  
  // Callback stores
  const progressCallbacks = new Set();
  const completeCallbacks = new Set();
  const errorCallbacks = new Set();
  
  // Generation process controller
  return {
    id,
    
    // Start generation
    async start() {
      if (status !== 'idle') return;
      
      try {
        status = 'generating';
        
        // Get API keys directly - no React state dependency
        const apiKeys = getApiKeys();
        
        // Process with streaming API
        const stream = await processWithClaudeStream({
          transcription, 
          apiKey: apiKeys.openrouter,
          signal: abortController.signal,
          onProgress: (chunk) => {
            progressCallbacks.forEach(cb => cb(chunk));
          }
        });
        
        result = await stream.result;
        status = 'complete';
        completeCallbacks.forEach(cb => cb(result));
        
        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          status = 'aborted';
        } else {
          error = err;
          status = 'error';
          errorCallbacks.forEach(cb => cb(err));
        }
      }
    },
    
    // Register callbacks
    onProgress(callback) {
      progressCallbacks.add(callback);
      return () => progressCallbacks.delete(callback);
    },
    
    onComplete(callback) {
      completeCallbacks.add(callback);
      if (status === 'complete' && result) {
        callback(result);
      }
      return () => completeCallbacks.delete(callback);
    },
    
    onError(callback) {
      errorCallbacks.add(callback);
      if (status === 'error' && error) {
        callback(error);
      }
      return () => errorCallbacks.delete(callback);
    },
    
    // Cancel generation
    abort() {
      abortController.abort();
    },
    
    // Get current status
    getStatus() {
      return {
        status,
        result: status === 'complete' ? result : null,
        error: status === 'error' ? error : null
      };
    }
  };
}

// Helper for component history management
export const ComponentHistory = {
  addToHistory(component) {
    const activeId = conversationStorage.getActiveId();
    if (!activeId) return;
    
    const history = conversationStorage.getHistory(activeId);
    const newHistory = [...history, component];
    
    conversationStorage.saveHistory(activeId, newHistory);
    return newHistory;
  },
  
  getHistory() {
    const activeId = conversationStorage.getActiveId();
    if (!activeId) return [];
    
    return conversationStorage.getHistory(activeId);
  }
};
```

### 3. Implement Input Mode Support

```javascript
// voiceButton.js
export function VoiceButton({ 
  onPressIn, 
  onPressOut, 
  onPress, 
  status, 
  volume, 
  callActive 
}) {
  // Determine mode-specific button appearance
  const getButtonContent = () => {
    if (callActive) {
      // Show call status and duration
      return (
        <>
          <Phone size={28} color="white" />
          <Text style={styles.callDuration}>{callDuration}</Text>
        </>
      );
    } else if (status === 'LISTENING') {
      // Show volume visualization
      return (
        <VolumeVisualization level={volume} />
      );
    } else if (status === 'PROCESSING') {
      // Show processing indicator
      return (
        <ActivityIndicator color="white" size="large" />
      );
    } else {
      // Show default mic icon
      return <Mic size={32} color="white" />;
    }
  };
  
  return (
    <Pressable
      onPressIn={onPressIn} // Start PTT
      onPressOut={onPressOut} // End PTT
      onPress={onPress} // Toggle call mode
      style={[
        styles.button,
        callActive && styles.callActiveButton,
        status === 'LISTENING' && styles.listeningButton,
        status === 'PROCESSING' && styles.processingButton
      ]}
    >
      {getButtonContent()}
    </Pressable>
  );
}
```

## Migration Strategy

1. Implement AudioSession singleton
2. Create ComponentGeneration factory
3. Update VoiceButton to support both PTT and Call modes
4. Implement TranscriptionBox that handles partial and final transcripts
5. Create main controller that coordinates AudioSession and ComponentGeneration
6. Test thoroughly in both modes

## Benefits

- **Clear Process Boundaries**: Each audio session and generation has defined lifecycle
- **Explicit Event Flow**: Components only receive events they need
- **Mode-Specific Handling**: PTT and Call modes handled appropriately
- **Independent Processes**: Multiple component generations can run in parallel
- **Resource Management**: Audio hardware accessed through single entry point
- **Performance**: Significant reduction in React renders by avoiding global state updates
- **Reliability**: Elimination of race conditions with callback-based architecture

## Accessibility and UX Considerations

- Support both PTT and Call modes with clear visual indicators
- Keyboard mode for quiet environments
- Seamless mode switching with natural gestures
- Clear visual feedback for all states

By implementing this architecture, we'll solve the core issues while maintaining what already works well in the codebase.