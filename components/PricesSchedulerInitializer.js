'use client';
import { useEffect } from 'react';
import { startPriceScheduler, stopPriceScheduler } from '@/services/PricesScheduler';

// Flag to track if scheduler is already running
let isSchedulerInitialized = false;

export default function PricesSchedulerInitializer() {
  useEffect(() => {
    console.log('🔄 PricesSchedulerInitializer component mounted');

    // Initialize the price scheduler
    initializePriceScheduler();

    // Check status after a delay to make sure it started
    setTimeout(() => {
      const isRunning = checkSchedulerStatus();
      console.log(`⏱️ Scheduler status check: ${isRunning ? 'Running' : 'Not running'}`);

      if (!isRunning) {
        console.log('🔄 Attempting to restart scheduler...');
        initializePriceScheduler();
      }
    }, 5000);

    return () => {
      console.log('🧹 PricesSchedulerInitializer component unmounting');
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

// Initialize the price scheduler when the window loads
export async function initializePriceScheduler() {
  // Only initialize in the browser environment
  if (typeof window === 'undefined') {
    console.log('🔶 Not in browser environment, skipping scheduler initialization');
    return;
  }

  try {
    const timestamp = new Date().getTime();
    const res = await fetch(`/api/check-maintenance?t=${timestamp}`, {
      cache: 'no-store'
    });
    const { isMaintenance, endTimestamp } = await res.json();

    if (isMaintenance) {
      console.log('🛠️ Maintenance mode active, price scheduler stopped...');
      if (endTimestamp) {
        console.log(`⏱️ Maintenance scheduled to end at: ${new Date(endTimestamp).toLocaleString()}`);
      }
      return;
    }
  } catch (error) {
    console.error('❌ Error checking maintenance mode:', error);
    // Continue execution - fail open in case of error checking maintenance
  }

  console.log('🔍 Price scheduler initialization requested...');

  // Set up the load event listener
  window.addEventListener('load', () => {
    console.log('🌐 Window load event fired');
    if (!isSchedulerInitialized) {
      console.log('🚀 Initializing price scheduler on window load...');
      startPriceScheduler();
      isSchedulerInitialized = true;
      console.log('✅ Price scheduler successfully initialized');
    } else {
      console.log('⚠️ Price scheduler already initialized, skipping');
    }
  });

  // If the page is already loaded, start immediately
  if (document.readyState === 'complete' && !isSchedulerInitialized) {
    console.log('📄 Page already loaded, initializing price scheduler immediately...');
    startPriceScheduler();
    isSchedulerInitialized = true;
    console.log('✅ Price scheduler successfully initialized (immediate)');
  } else {
    console.log(`🔸 Page not ready yet (readyState: ${document.readyState}), waiting for load event`);
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    console.log('🚪 Window beforeunload event fired');
    if (isSchedulerInitialized) {
      console.log('🛑 Stopping price scheduler on page unload...');
      stopPriceScheduler();
      isSchedulerInitialized = false;
      console.log('✅ Price scheduler successfully stopped');
    } else {
      console.log('⚠️ Price scheduler not running, nothing to stop');
    }
  });

  // Also handle visibility change to conserve resources
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('📱 Page hidden, pausing price scheduler...');
      if (isSchedulerInitialized) {
        stopPriceScheduler();
        console.log('✅ Price scheduler paused due to page hidden');
      }
    } else if (document.visibilityState === 'visible') {
      console.log('👁️ Page visible again, resuming price scheduler...');
      if (isSchedulerInitialized) {
        startPriceScheduler();
        console.log('✅ Price scheduler resumed due to page visible');
      }
    }
  });

  console.log('🔄 Price scheduler initialization setup complete');
}

// Add a function to manually check scheduler status
export function checkSchedulerStatus() {
  console.log(`🔍 Scheduler status: ${isSchedulerInitialized ? 'Running' : 'Not running'}`);
  return isSchedulerInitialized;
}