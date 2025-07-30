import React, { Component, ErrorInfo, ReactNode } from 'react';
import Alert from './Alert';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Alert
            type="error"
            title="Component Error"
            message={
              `Something went wrong in this section. Please try regenerating the content or refresh the page. Details: ${this.state.error?.message || 'Unknown error'}`
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
