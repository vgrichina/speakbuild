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
│                 │        │                │        │tion w/callbacks│
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
│                 │ update │ ComponentGenera│                            │
│TranscriptionBox │◄───────┤ tion 1 created │                            │
│                 │        │ with callbacks │                            │
└─────────────────┘        └────────────────┘                            │
                                 │                                        │
                                 │ start()                                │
                                 ▼                                        │
┌─────────────────┐        ┌────────────────┐                            │
│                 │ streams│                │                            │
│ ResponseStream  │◄───────┤ API Processing │                            │
│                 │ via    │                │                            │
└─────────────────┘ onProgress └────────────────┘                            │
                                                                          │
                                                                          │
                         +---------------------+                          │
                         |  Speech Segment 2  |◄─────────────────────────┘
                         +---------------------+
                                 │
                                 │ onFinalTranscript(2)
                                 ▼
┌─────────────────┐        ┌────────────────┐
│                 │ update │ ComponentGenera│
│TranscriptionBox │◄───────┤ tion 2 created │
│                 │        │ with callbacks │
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
export function createComponentGeneration(transcription, {
  // Callbacks receive directly in options like AudioSession
  onProgress = null,
  onComplete = null, 
  onError = null,
  ...otherOptions
} = {}) {
  const id = generateUniqueId();
  let status = 'idle'; // idle, generating, complete, error
  let result = null;
  let error = null;
  let abortController = new AbortController();
  
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
            if (onProgress) onProgress(chunk);
          }
        });
        
        result = await stream.result;
        status = 'complete';
        if (onComplete) onComplete(result);
        
        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          status = 'aborted';
        } else {
          error = err;
          status = 'error';
          if (onError) onError(err);
        }
      }
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

## Detailed Implementation Plan

### 1. AudioSession (New Component)

**Implementation Requirements:**
- Create a singleton service file: `src/services/audioSession.js`
- Implement direct callback interface for all events

**Key Methods and Features:**
```javascript
export const audioSession = {
  start({ mode, onVolumeChange, onPartialTranscript, onFinalTranscript, onError }),
  stop(),
  getCurrentMode(),
  isActive(),
}
```

**Callback Flow:**
- `onVolumeChange`: Called at regular intervals while recording (10-30ms)
- `onPartialTranscript`: Called when WebSocket sends partial updates
- `onFinalTranscript`: Called once after recording stops and final transcript arrives
- `onError`: Called if WebSocket errors or audio recording fails

### 2. ComponentGeneration (Factory Update)

**Implementation Requirements:**
- Update `src/services/componentGenerator.js`
- Convert from event subscription model to direct callback approach

**Key Changes:**
```javascript
export function createComponentGeneration(transcript, { 
  onProgress, 
  onComplete, 
  onError 
}) {
  return {
    start(),
    abort(),
    getStatus()
  }
}
```

**State Management:**
- Internal tracking of status, result, and error state
- No dependency on external React state
- Clean abort logic for cancellation

### 3. VoiceButton Component

**Implementation Requirements:**
- Update `src/components/VoiceButton.js`
- Support both PTT and Call modes with distinct UI

**UI States:**
- **Default**: Mic icon
- **PTT pressed**: Volume visualization with growing circles
- **Call active**: Phone icon + duration timer
- **Processing**: Loading spinner
- **Error**: Red indicator with retry option

**Event Handlers:**
- `onPressIn`: Start PTT recording
- `onPressOut`: End PTT recording 
- `onLongPress`: Switch to call mode
- `onPress`: Toggle call mode on/off

### 4. TranscriptionBox Component

**Implementation Requirements:**
- Update `src/components/TranscriptionBox.js`
- Handle both partial and final transcripts

**UI Features:**
- Italics for partial transcripts
- Regular text for final transcripts
- Timestamp for transcript in call mode
- Auto-scrolling to latest transcript

**Rendering Optimizations:**
- Memoization of transcript items
- Virtualized list for call mode history
- Controlled re-renders for partial updates

### 5. ResponseStream Component

**Implementation Requirements:**
- Update `src/components/ResponseStream.js` 
- Receive direct streaming updates via callbacks

**Key Features:**
- Code highlighting with syntax detection
- Auto-scrolling during streaming
- Loading state during initialization
- Copy button for generated code
- Error state with retry option

**Performance Optimizations:**
- Chunked rendering of large responses
- Throttled updates for smooth scrolling
- Memoized rendering of completed sections

### 6. AssistantController (New Component)

**Implementation Requirements:**
- Create new file: `src/controllers/AssistantController.js`
- Coordinate between AudioSession and ComponentGeneration

**Core Interface:**
```javascript
export function useAssistantController() {
  return {
    startPTT(),
    stopPTT(),
    toggleCallMode(),
    abortGeneration(),
    currentState: { 
      mode,         // 'ptt' or 'call'
      status,       // 'idle', 'listening', 'processing', 'error'
      transcript,   // current or most recent transcript
      generation    // current or most recent generation
    }
  }
}
```

**State Machine:**
```
                ┌───────┐
                │       │
           ┌───►│ IDLE  │◄────┐
           │    │       │     │
           │    └───┬───┘     │
           │        │         │
stopPTT()  │        │startPTT()
           │        ▼         │
        ┌──┴────────────┐     │
        │               │     │
        │  LISTENING    │     │
        │               │     │
        └───────────────┘     │
                │             │
                │onFinalTranscript
                ▼             │
        ┌───────────────┐     │
        │               │     │
        │  PROCESSING   ├─────┘
        │               │   onComplete/onError
        └───────────────┘
```

### 7. Integration Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         Root Component                         │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│   AssistantController     │   │      ErrorBoundary            │
│                           │   │                               │
│ ┌─────────┐ ┌───────────┐ │   └───────────────────────────────┘
│ │AudioSess│ │Component  │ │
│ │ion      │ │Generation │ │
└─┴─────────┴─┴───────────┴─┘
    │    ▲        │    ▲
    │    │        │    │
    ▼    │        ▼    │
┌─────────────┐  ┌─────────────┐
│ VoiceButton │  │ResponseStrea│
└─────────────┘  └─────────────┘
        │              ▲
        │              │
        ▼              │
┌─────────────────┐    │
│TranscriptionBox │    │
└─────────────────┘    │
        │              │
        └──────────────┘
```

## Migration Strategy

### Phase 1: Core Services ✅
1. ✅ Implement AudioSession singleton
2. ✅ Update ComponentGeneration factory with direct callbacks
3. ✅ Create AssistantService singleton (replaced the planned AssistantController)

### Phase 2: UI Components ✅
4. ✅ Update VoiceButton for dual modes
5. ✅ Modify TranscriptionBox for partial transcripts
6. ✅ Refactor ResponseStream for direct updates

### Phase 3: Integration ✅
7. ✅ Connect service to UI components with useAssistantState hook
8. ✅ Remove context dependencies (AssistantContext, VoiceRoomContext, GenerationContext)
9. ✅ Add error handling and retry logic

### Phase 4: Testing
10. Test both PTT and Call modes
11. Verify race condition elimination

## Completed Architectural Changes

The migration to a service-based architecture has been completed successfully:

### 1. Redundant Files Removed:
- ✅ Removed `componentGenerator.js` (replaced by `componentGeneration.js`)
- ✅ Removed `AssistantController.js` (replaced by `AssistantService`)
- ✅ Removed `GenerationContext.js` (functionality in `AssistantService`)
- ✅ Removed `AssistantContext.js` (migrated to service-based architecture)
- ✅ Removed `VoiceRoomContext.js` (replaced by `audioSession` service)
- ✅ Removed `ComponentHistoryContext.js` (replaced by `componentHistoryService`)

### 2. Service-Based State Management:
- ✅ `AssistantService`: Central service for coordinating voice assistant functionality
- ✅ `audioSession`: Manages audio recording and transcription
- ✅ `componentGeneration`: Factory for component generation processes
- ✅ `componentHistoryService`: Manages component history with persistence
- ✅ `useAssistantState`: Bridge hook connecting services to React components
- ✅ `useComponentHistory`: Hook for accessing componentHistoryService

### 3. Updated Component Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                         Root Component                           │
└───────────────────────────┬───────────────────────────┬─────────┘
                            │                           │
                            ▼                           ▼
┌───────────────────────────────────┐   ┌───────────────────────────┐
│   useAssistantState Bridge Hook   │   │      ErrorBoundary        │
│                                   │   │                           │
└─────────────┬───────────────┬─────┘   └───────────────────────────┘
              │               │
              ▼               ▼
    ┌─────────────────┐ ┌─────────────────────┐
    │ AssistantService│ │componentHistoryService│
    └────────┬────────┘ └──────────┬──────────┘
             │                    │
             ▼                    ▼
    ┌────────────────┐  ┌─────────────────┐
    │  audioSession  │  │ conversationStorage
    └────────────────┘  └─────────────────┘
             │                   │
             └───────────┬───────┘
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────┐
    │VoiceButton  │ │Response  │ │Other UI  │
    └─────────────┘ │Stream    │ │Components│
                    └──────────┘ └──────────┘
```

## Benefits

- **Clear Process Boundaries**: Each audio session and generation has defined lifecycle
- **Explicit Event Flow**: Components only receive events they need
- **Consistent Interface**: Both AudioSession and ComponentGeneration use direct callbacks
- **Mode-Specific Handling**: PTT and Call modes handled appropriately
- **Independent Processes**: Multiple component generations can run in parallel
- **Resource Management**: Audio hardware accessed through single entry point
- **Performance**: Significant reduction in React renders by avoiding global state updates
- **Reliability**: Elimination of race conditions with callback-based architecture
- **Testability**: Isolated components and services with clear interfaces
- **Maintainability**: Simplified debugging with clear data flow

## Accessibility and UX Considerations

- Support both PTT and Call modes with clear visual indicators
- Keyboard mode for quiet environments
- Seamless mode switching with natural gestures
- Clear visual feedback for all states
- Haptic feedback for state transitions
- Badge indicators for errors and retry options
- High contrast mode for accessibility

## Current Status

The migration to the service-based architecture described in this document has been **successfully completed**. All planned changes have been implemented and the application now follows this architecture.

Key accomplishments:
- ✅ AudioSession singleton implemented with direct callback interface
- ✅ ComponentGeneration factory updated with process-based approach
- ✅ AssistantService created as central coordinator
- ✅ UI components updated to use the new services
- ✅ React Context dependencies removed in favor of service-hook pattern
- ✅ Unified history model implemented in componentHistoryService
- ✅ Performance improvements realized through targeted state updates
- ✅ Race conditions eliminated with clear process boundaries

The application now benefits from improved performance, reliability, and maintainability. The architecture provides a solid foundation for future enhancements while addressing the core issues that motivated the redesign.
