# Repository Map

This document provides a comprehensive overview of the codebase structure, modules, components, and state transitions in the Everything App web prototype.

## Table of Contents

- [Application Entry Points](#application-entry-points)
- [Components](#components)
- [Services](#services)
- [Controllers](#controllers)
- [Hooks](#hooks)
- [Utilities](#utilities)
- [Application Flow](#application-flow)

## Application Entry Points

### main.js

**Purpose**: Main Voice Assistant component orchestrating audio, transcription, and component generation

**Exports**:
- `VoiceAssistant` (React.memo) - Main component wrapping the voice assistant functionality

**State Management**:
- Uses `useAssistantState` hook for assistant state
- Tracks keyboard mode state
- Uses componentHistoryService for history management

**Dependencies**: 
- React, React Native
- Components: ErrorBoundary, VoiceButton, TranscriptionBox, ResponseStream, EmptyState, KeyboardInput
- Hooks: useAssistantState
- Services: componentHistoryService, hasApiKeys

### app/index.js

**Purpose**: Root entry point for Expo Router

**Exports**:
- Default redirect component to drawer layout

**Dependencies**:
- expo-router

### app/(drawer)/index.js

**Purpose**: Main application screen within drawer navigation

**Exports**:
- Default component for the main screen

**State Management**:
- Uses componentHistoryService for history management

**Dependencies**:
- React, expo-router
- Components: various UI components
- Services: componentHistoryService

## Components

### VoiceButton.js

**Purpose**: Multi-function button for voice input with PTT or call modes

**Exports**:
- `VoiceButton` (React.memo)

**Props**:
- `status`: Current assistant status
- `volume`: Audio volume level
- `callActive`: Boolean for call mode state
- `callStartTime`: Timestamp for call start
- `onPressIn`: Callback for button press start
- `onPressOut`: Callback for button press end
- `onLongPress`: Callback for long press
- `onPress`: Callback for tap

**State Management**:
- Local state for pressed state
- Tracks press duration

**Dependencies**:
- React, React Native
- @expo/vector-icons for icons

### TranscriptionBox.js

**Purpose**: Displays voice transcription and history

**Exports**:
- `TranscriptionBox` component

**Props**:
- `finalTranscript`: Completed transcription text
- `partialTranscript`: In-progress transcription
- `isListening`: Boolean for active listening state
- `requestHistory`: Array of past requests

**State Management**:
- Local state for visibility control

**Dependencies**:
- React, React Native

### ResponseStream.js

**Purpose**: Shows streaming responses during component generation

**Exports**:
- `ResponseStream` component

**Props**:
- `responseStream`: Stream of text from API
- `status`: Current generation status
- `intent`: Detected user intent
- `onRetry`: Callback for retry action

**State Management**:
- Local animation state

**Dependencies**:
- React, React Native

### EmptyState.js

**Purpose**: Placeholder component when no content is available

**Exports**:
- `EmptyState` component

**Props**:
- `message`: Optional custom message

**Dependencies**:
- React, React Native

### ErrorBoundary.js

**Purpose**: Catches and displays component errors

**Exports**:
- `ErrorBoundary` component
- `ErrorDetails` component

**State Management**:
- Error state tracking

**Props**:
- `children`: Components to wrap
- `fallback`: Optional custom fallback component

**Dependencies**:
- React, React Native
- useErrorBoundary hook

### KeyboardInput.js

**Purpose**: Text input component for keyboard-based queries

**Exports**:
- `KeyboardInput` component

**Props**:
- `onSubmit`: Callback for text submission
- `disabled`: Boolean to disable input

**State Management**:
- Local input text state

**Dependencies**:
- React, React Native

### ConversationView.js

**Purpose**: Displays conversation with the assistant

**Exports**:
- `ConversationView` component

**State Management**:
- Conversation history state

**Dependencies**:
- React, React Native
- AssistantService via useAssistantState hook

### ViewCode.js

**Purpose**: Displays generated component code

**Exports**:
- `ViewCode` component

**Props**:
- `code`: Source code to display
- `onClose`: Callback for close action

**Dependencies**:
- React, React Native

## Services

### assistantService.js

**Purpose**: Central service for voice assistant functionality

**Exports**:
- `AssistantService` singleton (instance of AssistantServiceClass)
- `ASSISTANT_STATUS` constants (IDLE, LISTENING, THINKING, PROCESSING, ERROR)
- `ASSISTANT_MODE` constants (PTT, CALL)

**State Management**:
- `_state` object containing:
  - `status`: Current status (idle, listening, thinking, processing, error)
  - `mode`: Input mode (ptt, call)
  - `volume`: Audio volume level
  - `transcript`: Final transcription
  - `partialTranscript`: In-progress transcription
  - `responseStream`: Generation response text
  - `error`: Error state
  - `callStartTime`: Timestamp for call start

**Methods**:
- `startRecording()`: Start recording audio
- `stopRecording()`: Stop recording audio
- `setMode(mode)`: Set recording mode
- `endCall()`: End call mode
- `abortGeneration()`: Cancel current generation
- `retry()`: Retry after error
- `navigateBack()`: Navigate to previous component
- `navigateForward()`: Navigate to next component
- `setHistoryIndex(index)`: Set the current history index
- `cleanup()`: Clean up resources
- Various getter methods for state properties

**Event Handlers**:
- `_handleVolumeChange`: Handle volume change events
- `_handlePartialTranscript`: Handle partial transcript events
- `_handleFinalTranscript`: Handle final transcript events
- `_handleSessionStatus`: Handle session status events
- `_handleAudioError`: Handle audio error events

**Dependencies**:
- EventEmitter (extends)
- audioSession
- createComponentGeneration
- analysisPrompt
- getApiKeys, getSettings from settings
- componentHistoryService

### audioSession.js

**Purpose**: Manages audio recording and transcription

**Exports**:
- `audioSession` singleton (instance of AudioSessionSingleton)

**State Management**:
- `active`: Whether audio session is active
- `mode`: Current mode (ptt or call)
- `audioBuffer`: Buffer for audio data
- `isCleaningUp`: Flag for cleanup state
- `isStartingRecording`: Flag for recording start state
- `serverListening`: Flag for server listening state
- `transcript`: Track if transcript has been received
- `lastMessageTime`: Track last message receive time

**Methods**:
- `start({ mode, onVolumeChange, onPartialTranscript, onFinalTranscript, onError, selectedLanguage, apiKeys, analysisPrompt })`: Start audio session
- `stop(forceImmediateCleanup)`: Stop audio session
- `isActive()`: Check if session is active
- `getCurrentMode()`: Get current mode
- `setMode(newMode)`: Set the audio session mode
- `cleanup(options)`: Clean up resources
- `cleanupWebSocket()`: Clean up WebSocket connection
- `checkPermission()`: Check microphone permission
- `initAudio()`: Initialize audio recording

**Implementation Features**:
- WebSocket-based communication with Ultravox API
- Callback-based event handling
- Comprehensive error handling
- Throttled volume and partial transcript updates
- Timeout management for final responses

**Dependencies**:
- AudioRecord from react-native-audio-record
- PERMISSIONS, request, check, RESULTS from react-native-permissions
- Platform from react-native
- parse, STR, OBJ from partial-json

### componentGeneration.js

**Purpose**: Factory for component generation processes

**Exports**:
- `createComponentGeneration` factory function

**Factory Function Parameters**:
- `analysis`: The analysis object with transcription and params
- `options`: Configuration options including callbacks
  - `onProgress`: Called with streaming updates
  - `onComplete`: Called when generation is complete
  - `onError`: Called when an error occurs
  - `currentComponentCode`: For modifications
  - `selectedModel`: Model to use for generation
  - `apiKey`: API key for generation

**Controller API**:
- `start()`: Begin component generation
- `abort()`: Cancel generation
- `getStatus()`: Get current status information
- `id`: Unique identifier for the generation process

**Implementation Features**:
- Unique ID generation for tracking
- Comprehensive error handling
- Detailed logging throughout the generation lifecycle
- Code extraction and validation from API responses

**Dependencies**:
- api
- widgetStorage
- formatExamples from componentExamples

## Services

### componentHistoryService.js

**Purpose**: Service for managing unified component history and conversations

**Exports**:
- `componentHistoryService`: Singleton service object

**Implementation Pattern**:
- Event-based state management
- Unified history model (see [UNIFIED_HISTORY_MODEL.md](UNIFIED_HISTORY_MODEL.md))
- Single source of truth for history state

**State Management**:
- `history`: Unified history array with transcript+component pairs
- `currentIndex`: Index for current position in history
- `activeConversationId`: Current conversation ID

**Methods**:
- `getState()`: Get complete current state
- `getCurrent()`: Get current history entry
- `addToHistory(component, analysis)`: Add component and analysis to history
- `goBack()/goForward()`: Navigate history
- `setCurrentIndex(index)`: Set history position directly
- `switchConversation(id)`: Change active conversation
- `createNewConversation()`: Create new conversation
- `clearHistory()`: Clear history
- `onIndexChange(callback)`: Subscribe to index change events

**Dependencies**:
- Services: conversationStorage, widgetStorage

### componentGeneration.js

**Purpose**: Factory for component generation processes

**Exports**:
- `createComponentGeneration`: Function to create generation controller

**Methods**:
- `start(input, callbacks)`: Start generation process
- `abort()`: Cancel generation
- `getStatus()`: Get current generation status

**Patterns**:
- Direct callback pattern for streaming results
- Component prompt building
- Process-based lifecycle with clear state transitions
- Comprehensive error handling with detailed context

**Implementation Features**:
- Structured logging throughout the generation lifecycle
- Performance metrics for each stage of generation
- Detailed error reporting with context-rich diagnostics
- Clean resource management and error recovery
- Validation of component format before acceptance

**Dependencies**:
- Services: api, componentExamples, widgetStorage

### processStream.js

**Purpose**: Processes streaming responses from Claude API

**Exports**:
- `processWithClaudeStream`: Function for API interaction

**Implementation**:
- Uses createComponentGeneration for handling the streaming response
- Creates a promise-based interface for component generation
- Manages abortController for cancellation
- Provides progress updates via onResponseStream callback

**Dependencies**:
- createComponent from componentUtils
- widgetStorage
- createComponentGeneration

### analysis.js

**Purpose**: Creates prompts for voice input analysis

**Exports**:
- `analysisPrompt`: Function to generate analysis prompt

**Dependencies**:
- None (pure function)

### api.js

**Purpose**: API client for OpenRouter API

**Exports**:
- `api`: Object with API methods

**Methods**:
- `streamCompletion(apiKey, messages, options)`: Make streaming completion request
- `completion(apiKey, messages, options)`: Make non-streaming completion request

**Implementation Features**:
- Detailed performance monitoring for streaming chunks
- Robust error handling with context-rich error objects
- Tracking for stream metrics (chunks, tokens, duration)
- Structured logging format for easier debugging
- Preview truncation for large responses
- API key masking in logs for security

**Dependencies**:
- fetchSSE from sseFetch
- truncateWithEllipsis from stringUtils

### storage.js

**Purpose**: Persistent storage utilities

**Exports**:
- `storage`: Object with storage methods
- `SETTINGS_KEY`: Constant for settings storage

**Methods**:
- `get(key)`: Retrieve stored value
- `set(key, value)`: Store value
- `remove(key)`: Delete stored value

**Dependencies**:
- AsyncStorage from React Native

### settings.js

**Purpose**: Application settings management

**Exports**:
- `getApiKeys()`: Retrieve API keys
- `setApiKeys(keys)`: Store API keys
- `hasApiKeys()`: Check if API keys exist

**Dependencies**:
- Services: storage

### conversationStorage.js

**Purpose**: Manages conversation history

**Exports**:
- Methods for conversation persistence

**Methods**:
- `saveConversation(conversation)`: Save conversation
- `getConversations()`: Get all conversations
- `deleteConversation(id)`: Delete conversation

**Dependencies**:
- Services: storage

### widgetStorage.js

**Purpose**: Manages component/widget storage

**Exports**:
- Methods for component persistence

**Methods**:
- `saveComponent(component)`: Save component
- `getAllComponents()`: Get all components
- `deleteComponent(id)`: Delete component

**Dependencies**:
- Services: storage

### componentExamples.js

**Purpose**: Provides example components for generation

**Exports**:
- `getExamples()`: Get component examples

**Dependencies**:
- Assets: examples directory

### sseFetch.js

**Purpose**: Server-Sent Events implementation for streaming

**Exports**:
- `sseFetch`: Function for SSE requests

**Implementation Features**:
- Cross-platform compatibility (Node.js, React Native, Web)
- Enhanced error diagnostics with detailed context information
- Performance tracking with timestamps for request lifecycle
- Custom XMLHttpRequest implementation for React Native
- Automatic error handling and resource release

**Dependencies**:
- Native fetch API for non-React Native environments
- XMLHttpRequest for React Native

## Hooks

### useAssistantState.js

**Purpose**: Unified hook connecting service layer to React components

**Exports**:
- `useAssistantState` hook

**Implementation Pattern**:
- Thin adapter layer over AssistantService and componentHistoryService
- Uses useState to track service state
- Subscribes to service events via useEffect
- Uses useMemo and useCallback for performance optimization

**State Management**:
- **Assistant State**:
  - `status`: Current assistant status
  - `mode`: Input mode (ptt, call)
  - `volume`: Audio volume level
  - `transcript`: Final transcription
  - `partialTranscript`: In-progress transcription
  - `responseStream`: Generation response text
  - `error`: Error state
  - `callActive`: Boolean for call mode state
  - `callStartTime`: Timestamp for call start

- **History State**:
  - `currentHistoryIndex`: Index of currently displayed component
  - `currentComponent`: Currently displayed component
  - `current`: Current unified history entry (transcript + component)
  - `activeConversationId`: Current conversation ID
  - `history`: All history entries for current conversation

**Methods**:
- **Assistant Actions**:
  - `startRecording()`: Start recording
  - `stopRecording()`: Stop recording
  - `setMode()`: Set recording mode
  - `endCall()`: End call mode
  - `abortGeneration()`: Cancel current generation
  - `retry()`: Retry after error
  - `processAnalysis()`: Process text input

- **History Navigation**:
  - `navigateBack()/goBack()`: Navigate to previous component
  - `navigateForward()/goForward()`: Navigate to next component
  - `setHistoryIndex()`: Set the current history index

- **Conversation Management**:
  - `switchConversation()`: Change active conversation
  - `createNewConversation()`: Create new conversation
  - `clearHistory()`: Clear history
  - `getAllConversations()`: Get all conversations
  - `deleteConversation()`: Delete a conversation
  - `renameConversation()`: Rename a conversation

**Dependencies**:
- AssistantService (ASSISTANT_STATUS, ASSISTANT_MODE)
- componentHistoryService
- audioSession (for call state detection)


### useErrorBoundary.js

**Purpose**: Provides error boundary functionality as a hook

**Exports**:
- `useErrorBoundary`: Hook for error handling

**Dependencies**:
- React

### useSettings.js

**Purpose**: Hook for accessing application settings

**Exports**:
- `useSettings`: Hook for settings
- `useApiKeyCheck`: Hook for validating API keys

**Implementation Pattern**:
- Follows the [Service-Hook Pattern](SERVICE_HOOK_PATTERN.md)
- Thin adapter over settings.js service
- Uses service methods directly instead of duplicating logic

**State Management**:
- `ultravoxApiKey`: Ultravox API key
- `openrouterApiKey`: OpenRouter API key
- `selectedModel`: Selected generation model
- `selectedLanguage`: Selected voice recognition language
- `isSettingsOpen`: UI state for settings modal
- `isSettingsLoaded`: Loading state indicator
- `error`: Error state

**Methods**:
- `saveSettings()`: Save settings through service
- `setIsSettingsOpen()`: Control settings UI visibility

**Dependencies**:
- React, expo-router
- Services: settings

## Utilities

### componentUtils.js

**Purpose**: Utilities for component creation and rendering

**Exports**:
- `createComponent(code)`: Create component from code
- `renderComponent(Component, props)`: Render component with props

**Dependencies**:
- React, React Native
- expo-modules

### stringUtils.js

**Purpose**: String manipulation utilities

**Exports**:
- Various helper functions (trim, format, extract)

**Dependencies**:
- None (pure functions)

## Application Flow

1. **User Interaction**:
   - User interacts with VoiceButton (PTT, call mode, or keyboard)
   - Input captured through audioSession service

2. **Transcription Process**:
   - Audio sent to Ultravox API via WebSocket
   - audioSession emits volume and partial transcript events
   - Final transcription analyzed for intent and parameters

3. **Component Generation**:
   - Analysis sent to Claude API through createComponentGeneration
   - AssistantService coordinates the process and manages state
   - Streaming response shown in ResponseStream with real-time updates
   - Code extracted, validated, and wrapped with proper dependencies
   - Comprehensive error handling with detailed diagnostics

4. **Component Rendering**:
   - Generated code compiled using createComponent
   - Component rendered with parameters through ErrorBoundary
   - Added to componentHistoryService with metadata
   - Performance metrics logged throughout process

5. **Navigation & History**:
   - User can navigate history with NavigationButtons
   - View source code with DebugMenuButton
   - Access settings and debugging tools

6. **Error Recovery**:
   - Enhanced error details capture for network failures
   - Detailed logging of error context and state
   - Structured diagnostics for API connection issues
   - User-friendly error presentation with retry options

The application follows a complete service-based architecture with clear separation of concerns:
- UI components handle display and user interaction
- Services manage stateful application logic
- Hooks provide React bindings to services
- Utils provide shared functionality

This architecture has several advantages:
- Reduced coupling between components
- Better testability of service logic
- Fewer re-renders due to more targeted updates
- Clearer boundaries between concerns
- Simpler state management through dedicated services
- Independent lifecycle for services outside of React component tree
- Consistent pattern for all application features
