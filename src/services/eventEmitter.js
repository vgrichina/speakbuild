/**
 * EventEmitter.js
 * 
 * Base class for implementing the observer pattern.
 * Used by services to emit events that components can subscribe to.
 */

export class EventEmitter {
  constructor() {
    this._listeners = {};
  }
  
  // Add event listener
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    
    this._listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  // Remove event listener
  off(event, callback) {
    if (!this._listeners[event]) return;
    
    if (callback) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    } else {
      // If no callback provided, remove all listeners for this event
      delete this._listeners[event];
    }
  }
  
  // Emit event
  emit(event, ...args) {
    if (!this._listeners[event]) return;
    
    this._listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
  
  // Remove all listeners
  removeAllListeners() {
    this._listeners = {};
  }
}