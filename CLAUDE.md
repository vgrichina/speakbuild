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

## Code Style Guidelines
- Use functional components with hooks, not class components
- Export components as named exports
- Use services and hooks for state management (service-based architecture)
- Style with StyleSheet.create, not inline styles
- Optimize renders with useCallback/useMemo for functions/objects
- Handle errors with ErrorBoundary components
- Use Pressable with dynamic styles based on pressed state
- Follow existing patterns for file organization and component structure