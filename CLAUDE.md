# Everything App Development Guide

## Build Commands
- Start: `yarn start` or `expo start`
- Android: `yarn android` or `expo run:android`
- iOS: `yarn ios` or `expo run:ios`
- Web: `yarn web` or `expo start --web`
- Clean cache: `yarn clean`

## Test/Evaluation Commands
- Evaluate analysis: `yarn evaluate-analysis` or `bun scripts/evaluate-analysis.js`
- Evaluate generation: `yarn evaluate-generation` or `bun scripts/evaluate-generation.js`

## Logging Standards
- Use tagged logs with square brackets to identify source: `[TAG] Message`
- Keep logs concise, using single-line formats for structured data
- Use consistent tags for easier filtering:
  - `[ASSISTANT_STATE]` - State changes in assistant service
  - `[AUDIO_SESSION]` - Audio recording and WebSocket events
  - `[VOICE_BUTTON]` - Interaction with voice UI
  - `[TRANSCRIPTION]` - Text processing from speech
  - `[COMPONENT_GEN]` - Component generation process
  - `[FINAL_TRANSCRIPT]` - Complete transcription details
- Use ultra-concise key-value format for complex state logs: 
  ```javascript
  console.log(`[TAG] Event  key1:${value1}, key2:${value2}, t:${Date.now()}`);
  ```
- For audio/voice chunk data, include performance metrics (time, size) in logs

## Code Style Guidelines
- Use functional components with hooks, not class components
- Export components as named exports
- Use services and hooks for state management (service-based architecture)
- Style with StyleSheet.create, not inline styles
- Optimize renders with useCallback/useMemo for functions/objects
- Handle errors with ErrorBoundary components
- Use Pressable with dynamic styles based on pressed state
- Follow existing patterns for file organization and component structure