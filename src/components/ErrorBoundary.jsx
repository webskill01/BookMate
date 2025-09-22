// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // In development, log detailed error info
    if (import.meta.env.DEV) {
      console.log('🔧 Development mode: Consider hard refresh if components aren\'t updating');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-theme-primary mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-theme-secondary mb-6">
              {import.meta.env.DEV 
                ? 'Development Error - Try refreshing the page' 
                : 'Please refresh the page and try again'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent-primary hover:bg-accent-primary/90 text-white px-6 py-2 rounded-lg"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && (
              <details className="mt-4 text-left">
                <summary className="text-theme-muted cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-400 bg-gray-900 p-4 rounded mt-2 overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
