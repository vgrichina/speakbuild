# Unified History Model

This document explains the unified history model introduced in the application, replacing the previous dual history approach.

## Overview

The unified history model combines conversation history and component history into a single data structure where each entry contains both the user's transcription (what they said) and the resulting generated component (what was created in response).

## Data Structure

Each history entry follows this structure:

```javascript
{
  id: "unique-id-123",
  // Transcript data
  transcript: "Create a bar chart showing sales by quarter",
  intent: "new",
  // Component data  
  component: {
    code: "// React component code here...",
    widgetUrl: "chart-123",
    params: { type: "bar", data: [...] }
  },
  // Metadata
  timestamp: 1647889231
}
```

This unified model provides several advantages:
- Clear 1:1 relationship between user requests and generated components
- Single source of truth for history navigation
- Simplified persistence
- More intuitive mental model for application state

## Service API

The `componentHistoryService` provides these core functions:

```javascript
// Add a new entry to history
componentHistoryService.addToHistory(component, analysis);

// Navigate through history
componentHistoryService.goBack();
componentHistoryService.goForward();
componentHistoryService.setCurrentIndex(index);

// Get current state
componentHistoryService.getCurrent();         // Full entry
componentHistoryService.getCurrentComponent(); // Just component part (legacy)

// Conversation management
componentHistoryService.switchConversation(id);
componentHistoryService.createNewConversation();
componentHistoryService.getAllConversations();
componentHistoryService.deleteConversation(id);
```

## React Integration

The `useComponentHistory` hook provides React components with access to the history:

```javascript
const {
  history,            // All history entries
  currentIndex,       // Current position
  current,            // Current entry (transcript + component)
  currentComponent,   // Just the component (legacy support)
  goBack,
  goForward,
  addToHistory,
  // ... other methods
} = useComponentHistory();
```

## Legacy Compatibility

To ensure a smooth transition, the service provides backward compatibility APIs:

```javascript
// Legacy component history methods
componentHistoryService.getComponents();      // Array in old format
componentHistoryService.back();               // Alias for goBack
componentHistoryService.forward();            // Alias for goForward
componentHistoryService.setComponentIndex();  // Alias for setCurrentIndex
```

These methods transform the unified data model into the legacy format expected by older components that haven't been updated.

## Implementation Notes

1. History is stored in conversationStorage with the unified format
2. Each component has a widgetUrl that's used as a key for widgetStorage
3. The history maintains application flow through component<->transcript pairs
4. Navigation affects both component and transcript simultaneously