import { useState } from 'react';

export function useErrorBoundary() {
  const [error, setError] = useState(null);
  
  if (error) {
    throw error; // Will be caught by ErrorBoundary
  }
  
  return setError;
}
