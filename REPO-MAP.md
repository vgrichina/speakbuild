# Repository Map

This document provides a comprehensive overview of the codebase structure, modules, components, and state transitions in the Everything App web prototype.

## Table of Contents

- [Application Entry Points](#application-entry-points)
- [Components](#components)
- [Contexts](#contexts)
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
- Uses `useSettings` hook for configuration
- Tracks keyboard mode state
- Manages component history

**Dependencies**: 
- React, React Native
- Components: ErrorBoundary, VoiceButton, TranscriptionBox, ResponseStream
- Contexts: AssistantContext, ComponentHistoryContext
- Controllers: AssistantController
- Services: componentGeneration, processStream

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
- Uses component history context

**Dependencies**:
- React, expo-router
- Components: various UI components
- Contexts: ComponentHistoryContext

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
- lucide-react-native for icons

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
- AssistantContext

### ViewCode.js

**Purpose**: Displays generated component code

**Exports**:
- `ViewCode` component

**Props**:
- `code`: Source code to display
- `onClose`: Callback for close action

**Dependencies**:
- React, React Native

## Contexts

### AssistantContext.js

**Purpose**: Unified API for voice assistant functionality

**Exports**:
- `AssistantProvider` component
- `useAssistant` hook

**State Management**:
- `status`: Current assistant status (idle, listening, processing, etc.)
- `transcription`: Voice input transcription (partial and final)
- `response`: Assistant response data
- `callActive`: Boolean for call mode state
- `callStartTime`: Timestamp for call start

**Methods**:
- `listen()`: Start listening for input
- `stop()`: Stop listening
- `reset()`: Reset assistant state
- `submitText(text)`: Submit text input
- `handlePressIn()`: Handle button press start
- `handlePressOut()`: Handle button press end

**State Transitions**:
- idle → listening: When user starts voice input
- listening → processing: When input is complete
- processing → responding: When generation starts
- responding → idle: When generation completes
- any state → error: On error condition

**Dependencies**:
- React
- VoiceRoomContext
- ComponentHistoryContext
- Services: componentGeneration, processStream

### VoiceRoomContext.js

**Purpose**: Manages audio recording and transcription

**Exports**:
- `VoiceRoomProvider` component
- `useVoiceRoom` hook

**State Management**:
- Reducer-based state:
  - `volume`: Audio input volume
  - `results`: Transcription results
  - `recording`: Recording status
  - `error`: Error state

**Methods**:
- `startRecording()`: Begin audio capture
- `stopRecording()`: End audio capture
- `cancelRecording()`: Cancel current recording
- `reset()`: Reset voice room state

**State Transitions**:
- idle → recording: When recording starts
- recording → processing: When recording stops
- processing → idle: When transcription completes
- any state → error: On error condition

**Dependencies**:
- React
- react-native-audio-record
- Services: audioSession

### ComponentHistoryContext.js

**Purpose**: Manages history of generated components

**Exports**:
- `ComponentHistoryProvider` component
- `useComponentHistory` hook

**State Management**:
- `history`: Array of generated components
- `currentIndex`: Index of currently displayed component

**Methods**:
- `addToHistory(component)`: Add new component to history
- `goBack()`: Navigate to previous component
- `goForward()`: Navigate to next component
- `clearHistory()`: Clear component history

**Dependencies**:
- React
- Services: conversationStorage, widgetStorage

### GenerationContext.js

**Purpose**: Manages component generation workflow

**Exports**:
- `GenerationProvider` component
- `useGeneration` hook

**State Management**:
- `generating`: Boolean for active generation
- `responseStream`: Stream of text from API
- `error`: Error state

**Methods**:
- `generateComponent(input)`: Generate component from input
- `modifyComponent(code, request)`: Modify existing component
- `cancelGeneration()`: Cancel ongoing generation

**Dependencies**:
- React
- Services: componentGeneration, processStream

## Services

### componentGeneration.js

**Purpose**: Factory for component generation processes

**Exports**:
- `createComponentGeneration`: Function to create generation controller
- `ComponentHistory`: Object for history management

**Methods**:
- `start(input, callbacks)`: Start generation process
- `abort()`: Cancel generation
- `getStatus()`: Get current generation status

**Patterns**:
- Direct callback pattern for streaming results
- Component prompt building

**Dependencies**:
- Services: api, widgetStorage, componentExamples

### processStream.js

**Purpose**: Processes streaming responses from Claude API

**Exports**:
- `processWithClaudeStream`: Function for API interaction

**Methods**:
- Streaming API interaction
- Response parsing and handling

**Dependencies**:
- Services: api, componentGeneration

### analysis.js

**Purpose**: Creates prompts for voice input analysis

**Exports**:
- `analysisPrompt`: Function to generate analysis prompt

**Dependencies**:
- None (pure function)

### api.js

**Purpose**: API client for OpenRouter and other services

**Exports**:
- `api`: Object with API methods

**Methods**:
- `completion(params)`: Make completion request
- `streamCompletion(params, callbacks)`: Make streaming request

**Dependencies**:
- Services: sseFetch, settings

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

**Dependencies**:
- Native fetch API

## Controllers

### AssistantController.js

**Purpose**: Controller for voice assistant functionality

**Exports**:
- `useAssistantController`: Hook for controller

**State Management**:
- Combines states from multiple contexts

**Methods**:
- Unified API for assistant operations

**Dependencies**:
- React
- Contexts: VoiceRoomContext, GenerationContext

## Hooks

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

**Dependencies**:
- React
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
   - Input captured through VoiceRoomContext (audio) or keyboard

2. **Transcription Process**:
   - Audio sent to Ultravox API via WebSocket
   - Streaming transcription received and displayed
   - Final transcription analyzed for intent and parameters

3. **Component Generation**:
   - Analysis sent to Claude API through processWithClaudeStream
   - Streaming response shown in ResponseStream
   - Code extracted and validated

4. **Component Rendering**:
   - Generated code compiled using createComponent
   - Component rendered with parameters
   - Added to ComponentHistory

5. **Navigation & History**:
   - User can navigate history with NavigationButtons
   - View source code with DebugMenuButton
   - Access settings and debugging tools

The application follows a context-based architecture with clear separation of concerns:
- UI components handle display and user interaction
- Contexts manage stateful application logic
- Services provide external API integration
- Controllers unify functionality across contexts
- Utils provide shared functionality