import { Component, type ComponentChildren } from 'preact';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: (error: Error) => ComponentChildren;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
          <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold text-red-700 dark:text-red-300 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4 text-center max-w-md">
            An error occurred while rendering this page.
          </p>
          <pre className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md mb-4 overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
