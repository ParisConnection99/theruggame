// services/priceSchedulerService.js
import { startPriceScheduler, stopPriceScheduler } from '@/services/PricesScheduler';

// Flag to track if scheduler is already running
let isSchedulerInitialized = false;

// Initialize the price scheduler when the window loads
export function initializePriceScheduler() {
  // Only initialize in the browser environment
  if (typeof window === 'undefined') return;
  
  // Set up the load event listener
  window.addEventListener('load', () => {
    if (!isSchedulerInitialized) {
      console.log('🚀 Initializing price scheduler...');
      startPriceScheduler();
      isSchedulerInitialized = true;
    }
  });
  
  // If the page is already loaded, start immediately
  if (document.readyState === 'complete' && !isSchedulerInitialized) {
    console.log('🚀 Initializing price scheduler (page already loaded)...');
    startPriceScheduler();
    isSchedulerInitialized = true;
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (isSchedulerInitialized) {
      console.log('🛑 Stopping price scheduler on page unload...');
      stopPriceScheduler();
      isSchedulerInitialized = false;
    }
  });
}