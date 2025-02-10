import { createContext, useContext, useCallback } from 'react';

const ErrorBoundaryContext = createContext(null);

export function ErrorBoundaryProvider({ children, onError }) {
  const throwError = useCallback((error) => {
    if (onError) {
      onError(error);
    }
    throw error;
  }, [onError]);

  return (
    <ErrorBoundaryContext.Provider value={throwError}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

export function useErrorBoundary() {
  const throwError = useContext(ErrorBoundaryContext);
  if (!throwError) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return throwError;
}
