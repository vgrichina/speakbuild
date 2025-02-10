import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorBoundaryProvider } from '../hooks/useErrorBoundary';
import { ErrorDetails } from './ErrorDetails';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      showErrorDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Component Error</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onError) {
                this.props.onError(this.state.error);
              }
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => this.setState({ showErrorDetails: true })}
            >
              <Text style={styles.viewDetailsText}>View Error Details</Text>
            </TouchableOpacity>
          )}
          <ErrorDetails 
            isVisible={this.state.showErrorDetails}
            error={this.state.error}
            onClose={() => this.setState({ showErrorDetails: false })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children, onError }) {
  return (
    <ErrorBoundaryClass onError={onError}>
      <ErrorBoundaryProvider onError={onError}>
        {children}
      </ErrorBoundaryProvider>
    </ErrorBoundaryClass>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    margin: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#DC2626',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    backgroundColor: '#4B5563',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: 'white',
  }
});
