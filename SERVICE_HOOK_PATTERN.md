# Service-Hook Integration Pattern

This document describes the standardized pattern for integrating services with React components through hooks in our application architecture.

## Architectural Principles

```
┌─────────────────────┐      ┌─────────────────────┐
│                     │      │                     │
│    React Components │      │  React Hooks (Thin) │
│                     │      │                     │
└─────────┬───────────┘      └─────────┬───────────┘
          │                            │
          │ Uses                       │ Adapts
          │                            │
          ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐
│                     │      │                     │
│     Service Layer   │◄─────┤ Event Subscriptions │
│  (State Ownership)  │      │                     │
│                     │      │                     │
└─────────┬───────────┘      └─────────────────────┘
          │
          │ Persists
          │
          ▼
┌─────────────────────┐
│                     │
│    Storage Layer    │
│                     │
└─────────────────────┘
```

## Core Principles

1. **Single Source of Truth**: Services own and manage state.
2. **Hooks as Adapters**: Hooks provide a thin adapter layer between services and React components.
3. **One-Way Data Flow**: State flows from services to components via hooks.
4. **Event-Based Communication**: Services emit events, hooks subscribe to them.
5. **Memoized Return Values**: Hooks memoize their return values to prevent unnecessary component re-renders.

## Implementation Structure

### 1. Services

Services implement this consistent pattern:

```javascript
// Example service structure
class ServiceClass extends EventEmitter {
  constructor() {
    super();
    this._state = { /* Initial state */ };
  }
  
  // State management
  _setState(updates) {
    this._state = { ...this._state, ...updates };
    this.emit('stateChange', this._state);
  }
  
  // Getters
  getState() { return { ...this._state }; }
  getSomeValue() { return this._state.someValue; }
  
  // Actions
  doSomething() {
    // Modify state
    this._setState({ someValue: newValue });
    // Emit specific event if needed
    this.emit('specificChange', newValue);
  }
}

// Export as singleton
export const Service = new ServiceClass();
```

### 2. Hooks

Hooks follow this pattern:

```javascript
export function useService() {
  // Initialize state from service
  const [state, setState] = useState(Service.getState());
  
  // Subscribe to service events
  useEffect(() => {
    // Subscribe to main state change
    const stateUnsub = Service.on('stateChange', setState);
    
    // Clean up subscriptions
    return () => {
      stateUnsub();
    };
  }, []);
  
  // Memoize action methods
  const doSomething = useCallback(() => Service.doSomething(), []);
  
  // Memoize return value for performance
  const hookReturn = useMemo(() => ({
    ...state,          // Spread state properties
    doSomething,       // Include actions
    CONSTANTS: SERVICE_CONSTANTS // Include constants
  }), [
    // Include all state properties in dependency array
    state.prop1,
    state.prop2
    // No need to include action methods since they're already memoized
  ]);
  
  return hookReturn;
}
```

## State Management Comparison

```
Before:
┌────────────────────┐    ┌────────────────────┐
│                    │    │                    │
│     React Hook     │    │      Service       │
│  (Parallel State)  │    │   (Service State)  │
└────────────────────┘    └────────────────────┘
     Multiple state           The same state
       variables              values again

After:
┌────────────────────┐    ┌────────────────────┐
│                    │    │                    │
│     React Hook     │◄───┤      Service       │
│ (Memoized Adapter) │    │   (State Source)   │
└────────────────────┘    └────────────────────┘
    Subscriptions to           Single state
     state changes              definition
```

## Benefits

1. **Performance Optimization**:
   - Components only re-render when actual dependencies change
   - State updates are targeted through specific events
   - Memoization prevents unnecessary re-renders

2. **Maintainability**:
   - Clear separation of concerns
   - Predictable state flow
   - Consistent pattern across the application
   - Services can be tested independently of React

3. **Developer Experience**:
   - Components get a simple, familiar React interface
   - State management happens outside of component lifecycle
   - Hooks hide implementation details from components
   - Actions and state are co-located in the service API

## Implementation Examples

### Assistant Service with Hook Integration

```javascript
// In assistantService.js
class AssistantServiceClass extends EventEmitter {
  constructor() {
    super();
    this._state = {
      status: 'idle',
      // ...other state
    };
  }
  
  // State update method
  _setState(updates) {
    this._state = { ...this._state, ...updates };
    this.emit('stateChange', this._state);
  }
  
  // Actions
  startPTT() {
    // Implementation...
    this._setState({ status: 'listening' });
  }
}
export const AssistantService = new AssistantServiceClass();

// In useAssistantState.js
export function useAssistantState() {
  const [state, setState] = useState(AssistantService.getState());
  
  useEffect(() => {
    const unsub = AssistantService.on('stateChange', setState);
    return () => unsub();
  }, []);
  
  const startPTT = useCallback(() => AssistantService.startPTT(), []);
  
  return useMemo(() => ({
    ...state,
    startPTT
  }), [state, startPTT]);
}
```