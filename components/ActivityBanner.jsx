"use client";

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { listenToBets } from '@/services/BetsRealtimeService';

const ActivityBanner = () => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const messageQueue = useRef([]);
  const timeoutRef = useRef(null);
  const defaultMessagesRef = useRef([
    "All markets are live now 🔥"
  ]);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Standard mobile breakpoint
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Format bet message
  const formatBetMessage = (bet) => {
    if (!bet || !bet.payload || !bet.payload.user_id) {
      return null;
    }
    
    // Create shortened user ID (first 4 chars)
    const shortUserId = bet.payload.user_id.substring(0, 4);
    
    // Limit token name to 7 characters
    const limitTokenName = (name) => name.length > 7 ? name.slice(0, 7) + '...' : name;
    
    if (bet.type === 'INSERT') {
      return isMobile 
        ? `${shortUserId} bet ${bet.payload.amount} SOL on ${limitTokenName(bet.payload.token_name)} to ${bet.payload.bet_type} 🚀`
        : `${shortUserId} bet ${bet.payload.amount} SOL on ${limitTokenName(bet.payload.token_name)} to ${bet.payload.bet_type} in 20 mins 🚀`;
    } else if (bet.type === 'UPDATE' && bet.payload.status === 'WON') {
      return isMobile
        ? `${shortUserId} won ${bet.payload.potential_payout} SOL on ${limitTokenName(bet.payload.token_name)} to ${bet.payload.bet_type} 🎉`
        : `${shortUserId} won ${bet.payload.potential_payout} SOL on ${limitTokenName(bet.payload.token_name)} to ${bet.payload.bet_type} in 20 mins 🎉`;
    }
    
    return null;
  };

  // Process the message queue
  const processQueue = () => {
    if (messageQueue.current.length === 0) {
      // Display the single default message if no real-time updates are available
      setCurrentMessage(defaultMessagesRef.current[0]);
      timeoutRef.current = setTimeout(processQueue, 5000);
      return;
    }
    
    // Take the first message from the queue
    const nextMessage = messageQueue.current.shift();
    setCurrentMessage(nextMessage);
    
    // Set a timeout to process the next message after 3 seconds
    timeoutRef.current = setTimeout(processQueue, 3000);
  };

  // Add a message to the queue
  const addToQueue = (message) => {
    if (!message) return;
    
    const wasEmpty = messageQueue.current.length === 0;
    messageQueue.current.push(message);
    
    // If the queue was empty, start processing
    if (wasEmpty && !timeoutRef.current) {
      processQueue();
    }
  };

  // Setup initial message and queue processing
  useEffect(() => {
    // Start with the default message
    setCurrentMessage(defaultMessagesRef.current[0]);
    
    // Start the queue processing
    timeoutRef.current = setTimeout(processQueue, 5000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Fetch latest bet updates
  useEffect(() => {
    console.log("Setting up bet update listener");

    const setupSubscription = async () => {
      const handleBetUpdates = (updatedBet) => {
        const message = formatBetMessage(updatedBet);
        addToQueue(message);
      };

      const subscription = await listenToBets(handleBetUpdates);
      return subscription;
    };
    
    let subscriptionPromise = setupSubscription();
    
    return () => {
      subscriptionPromise.then(subscription => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });
    };
  }, [isMobile]); // Re-subscribe when mobile state changes to update message format

  return (
    <div className="w-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mt-4 gap-2 px-4">
      <Image
        className="rounded-full"
        src="/images/bh.png"
        alt="banner"
        width={25}
        height={25}
        priority
      />
      <h1 className={`text-black ${isMobile ? 'text-sm font-normal' : 'text-m font-medium'} truncate`}>
        {currentMessage}
      </h1>
    </div>
  );
};

export default ActivityBanner;