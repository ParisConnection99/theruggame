// app/utils/logger.js
export function log(message, data = {}, level = 'info') {
    const logData = {
      level,
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    };
    
    // Log to console during development with appropriate method
    if (level === 'error') {
      console.error(message, data);
    } else if (level === 'warn') {
      console.warn(message, data);
    } else {
      console.log(message, data);
    }
    
    // Send to your API endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      }).catch(e => console.error('Failed to send log', e));
    }
  }
  
  // Convenience methods
  export const logInfo = (message, data) => log(message, data, 'info');
  export const logWarn = (message, data) => log(message, data, 'warn');
  export const logError = (error, context) => {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    log(message, { ...context, stack }, 'error');
  };