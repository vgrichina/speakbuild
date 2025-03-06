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

## New Architecture

```
+------------------------+       +------------------------+
|                        |       |                        |
|  React Components      |<----->|  Service Hooks         |
|                        |       |                        |
+------------------------+       +------------------------+
          ^                                 ^
          |                                 |
          v                                 v
+------------------------+       +------------------------+
|                        |       |                        |
|  Business Logic        |<----->|  Core Services         |
|  (Controller Layer)    |       |  (Data & State)        |
|                        |       |                        |
+------------------------+       +------------------------+
                                          ^
                                          |
                                          v
                                 +------------------------+
                                 |                        |
                                 |  Storage Layer         |
                                 |  (MMKV)               |
                                 |                        |
                                 +------------------------+
```

## Core Services (Plain JavaScript)

### 1. VoiceService

```
+------------------+
| VoiceService     |
+------------------+
| - state          |
| - subscribers    |
|                  |
| + subscribe()    |
| + unsubscribe()  |
| + startRecording()|
| + stopRecording()|
| + cancelRecording()|
| + processAudio() |
+------------------+
        ^
        |
        v
+------------------+
| WebSocket        |
| & Audio Handling |
+------------------+
```

### 2. ComponentService

```
+------------------+
| ComponentService |
+------------------+
| - state          |
| - subscribers    |
|                  |
| + subscribe()    |
| + unsubscribe()  |
| + generate()     |
| + getHistory()   |
| + addToHistory() |
| + setIndex()     |
+------------------+
        ^
        |
        v
+------------------+
| conversationStorage|
| widgetStorage    |
+------------------+
```

### Subscription System

```
+------------------+    subscribe()    +------------------+
| Service          |------------------>| React Component  |
|                  |<------------------|                  |
+------------------+   notification    +------------------+

// Implementation
function subscribe(callback) {
  this.subscribers.add(callback);
  return () => this.subscribers.delete(callback);
}

function setState(updates) {
  Object.assign(this.state, updates);
  this.notifySubscribers();
}
```

## Voice Recording Flow

```
User presses button
       |
       v
+------------------+
| VoiceButton      |
| onPressIn()      |
+------------------+
       |
       v
+------------------+
| VoiceService     |
| startRecording() |
+------------------+
       |
       v
Create WebSocket connection
       |
       v
Set status = LISTENING
Notify subscribers
       |
       v
Process audio & partial transcripts
       |
       v
User releases button
       |
       v
+------------------+
| VoiceButton      |
| onPressOut()     |
+------------------+
       |
       v
+------------------+
| VoiceService     |
| stopRecording()  |
+------------------+
       |
       v
WebSocket receives final message
       |
       v
Process transcript & analysis
Set status = THINKING
Notify subscribers
       |
       v
+------------------+
| VoiceService     |
| -> onTranscription() |
+------------------+
       |
       v
+------------------+
| ComponentService |
| generate()       |
+------------------+
       |
       v
Component generation completes
       |
       v
Set status = IDLE
Add to history
Notify subscribers
```

## Implementation Plan

### 1. Create Base Service Framework

```javascript
// baseService.js
export class BaseService {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.subscribers = new Set();
  }

  // Subscribe to state changes and return unsubscribe function
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Update state and notify subscribers
  setState(updates) {
    // Create a new state object with the updates
    Object.assign(this.state, updates);
    this.notifySubscribers();
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach(subscriber => subscriber(this.state));
  }
}
```

### 2. Implement VoiceService

```javascript
// voiceService.js
import { BaseService } from './baseService';
import { getApiKeys } from './settings';

export class VoiceServiceClass extends BaseService {
  constructor() {
    super({
      status: 'IDLE',  // IDLE, LISTENING, THINKING, ERROR
      isRecording: false,
      volume: 0,
      partialResults: '',
      transcribedText: '',
      error: null
    });
    
    this.ws = null;
    this.audioBuffer = [];
    this.cleanup = this.cleanup.bind(this);
    // ...other initialization
  }
  
  // Start recording
  startRecording(options = {}) {
    // Get API keys directly - no React state dependency
    const apiKeys = getApiKeys();
    
    // Implementation
    // ...
    
    // Update state
    this.setState({
      status: 'LISTENING',
      isRecording: true
    });
  }
  
  // Handle transcription
  handleTranscription(analysis) {
    // Update state
    this.setState({
      transcribedText: analysis.transcription,
      status: 'THINKING'
    });
    
    // Call component generation
    ComponentService.generateComponent(analysis)
      .then(() => {
        this.setState({ status: 'IDLE' });
      })
      .catch(error => {
        this.setState({
          status: 'ERROR',
          error: error.message
        });
      });
  }
  
  // ...other methods
}

// Export singleton instance
export const VoiceService = new VoiceServiceClass();
```

### 3. Implement ComponentService

```javascript
// componentService.js
import { BaseService } from './baseService';
import { conversationStorage } from './conversationStorage';
import { widgetStorage } from './widgetStorage';
import { processWithClaudeStream } from './processStream';
import { getApiKeys } from './settings';

export class ComponentServiceClass extends BaseService {
  constructor() {
    super({
      currentIndex: -1,
      history: [],
      activeConversationId: null,
      isGenerating: false
    });
    
    // Initialize conversations
    this.initConversation();
  }
  
  // Initialize or load active conversation
  async initConversation() {
    // Get active conversation ID
    let activeId = conversationStorage.getActiveId();
    
    // If no active conversation, create one
    if (!activeId) {
      const newConversation = conversationStorage.create();
      activeId = newConversation.id;
    }
    
    // Load conversation history
    const conversationHistory = conversationStorage.getHistory(activeId);
    
    // Update state
    this.setState({
      history: conversationHistory,
      currentIndex: conversationHistory.length - 1,
      activeConversationId: activeId
    });
  }
  
  // Generate component
  async generateComponent(analysis) {
    this.setState({ isGenerating: true });
    
    try {
      // Get API keys directly
      const apiKeys = getApiKeys();
      
      // Generate component
      const result = await processWithClaudeStream({
        analysis,
        apiKey: apiKeys.openrouter,
        // ...other options
      });
      
      // Add to history
      this.addToHistory(result);
      
      return result;
    } catch (error) {
      console.error('Component generation error:', error);
      throw error;
    } finally {
      this.setState({ isGenerating: false });
    }
  }
  
  // Add component to history
  addToHistory(entry) {
    const newHistory = [
      ...this.state.history,
      entry
    ];
    
    this.setState({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
    
    // Save to persistent storage
    if (this.state.activeConversationId) {
      conversationStorage.saveHistory(
        this.state.activeConversationId,
        newHistory
      );
    }
  }
  
  // ...other methods
}

// Export singleton instance
export const ComponentService = new ComponentServiceClass();
```

### 4. Create React Hooks

```javascript
// useVoiceService.js
import { useEffect, useReducer } from 'react';
import { VoiceService } from '../services/voiceService';

// Simple hook to force re-render
function useForceUpdate() {
  return useReducer(x => x + 1, 0)[1];
}

export function useVoiceService() {
  const forceUpdate = useForceUpdate();
  
  useEffect(() => {
    // Subscribe to voice service
    return VoiceService.subscribe(forceUpdate);
  }, [forceUpdate]);
  
  // Return current state and methods
  return {
    ...VoiceService.state,
    startRecording: VoiceService.startRecording.bind(VoiceService),
    stopRecording: VoiceService.stopRecording.bind(VoiceService),
    // ...other methods
  };
}

// useComponentService.js
import { useEffect, useReducer } from 'react';
import { ComponentService } from '../services/componentService';

export function useComponentService() {
  const forceUpdate = useForceUpdate();
  
  useEffect(() => {
    // Subscribe to component service
    return ComponentService.subscribe(forceUpdate);
  }, [forceUpdate]);
  
  // Return current state and methods
  return {
    ...ComponentService.state,
    generateComponent: ComponentService.generateComponent.bind(ComponentService),
    addToHistory: ComponentService.addToHistory.bind(ComponentService),
    // ...other methods
  };
}
```

## Migration Strategy

1. Create the base service framework and service implementations without modifying existing code
2. Add React hooks to integrate with the services
3. Modify small components to use the hooks first (VoiceButton, etc.)
4. Refactor the main VoiceAssistant component
5. Remove React contexts after all components have been migrated
6. Test thoroughly and optimize

## Benefits

- **Performance**: Significant reduction in React renders
- **Reliability**: Elimination of race conditions and stale closures
- **Simplicity**: Clear division between state management and UI
- **Maintainability**: Easier to debug and extend
- **Reusability**: Services can be used across different UI components

## Considerations

- Keep existing storage services that work well
- Leverage current settings.js which already uses direct MMKV access
- Focus on fixing the problematic areas (audio recording, WebSocket, component generation)
- Add comprehensive logging for debugging
- Ensure backwards compatibility during migration

By implementing this architecture, we'll solve the core issues while maintaining what already works well in the codebase.