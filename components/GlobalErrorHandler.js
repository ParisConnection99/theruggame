'use client';

import { useEffect } from 'react';
import { logError } from '@/utils/logger'; // Adjust path as needed

export function GlobalErrorHandler({ children }) {
  useEffect(() => {
    // Capture unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      logError(event.reason, { type: 'unhandledRejection' });
    };
    
    // Capture uncaught errors
    const handleError = (event) => {
      logError(event.error, { type: 'uncaughtError' });
      // Prevent the default browser error handler
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  return children;
}