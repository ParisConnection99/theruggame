'use client';

import { useEffect, useState } from 'react';
import { startPriceScheduler, stopPriceScheduler } from '@/lib/priceScheduler'; // Update the path as needed

export default function PriceSchedulerInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once to prevent duplicate schedulers
    if (!isInitialized) {
      console.log('🚀 Initializing price scheduler...');
      startPriceScheduler();
      setIsInitialized(true);
    }

    // Cleanup function to stop the scheduler when component unmounts
    return () => {
      console.log('🛑 Stopping price scheduler on unmount...');
      stopPriceScheduler();
    };
  }, [isInitialized]);

  // This component doesn't render anything visible
  return null;
}