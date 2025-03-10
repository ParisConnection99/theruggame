// ErrorBoundary.js
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
    // This will be logged to Vercel
    console.error("COMPONENT ERROR:", error);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong in this component.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;