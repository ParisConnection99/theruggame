"use client";

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { listenToBets } from '@/services/BetsRealtimeService';
import { listenToMarkets } from '@/services/MarketRealtimeService';

const ActivityBanner = () => {
  const [currentMessage, setCurrentMessage] = useState("");
  const messageQueue = useRef([]);
  const timeoutRef = useRef(null);
  const defaultMessagesRef = useRef([
    "All markets are live now 🔥"
  ]);

  // Format bet message
  const formatBetMessage = (bet) => {
    if (!bet || !bet.payload || !bet.payload.user_id) {
      console.log("Received invalid bet data:", bet);
      return null;
    }
    
    // Create shortened user ID (first 4 chars)
    const shortUserId = bet.payload.user_id.substring(0, 4);
    
    // Limit token name to 7 characters
    const limitTokenName = (name) => name.length > 7 ? name.slice(0, 7) + '...' : name;
    
    if (bet.type === 'INSERT') {
      return `User ${shortUserId} bet ${bet.payload.amount} on ${limitTokenName(bet.payload.token_name)} to ${bet.payload.bet_type} 🚀`;
    } else if (bet.type === 'UPDATE' && bet.payload.status === 'WON') {
      return `User ${shortUserId} won ${bet.payload.potential_payout} ${limitTokenName(bet.payload.token_name)} on ${bet.payload.market_name} to ${bet.payload.bet_type} 🎉`;
    }
    
    return null;
  };

  // Format market message
  const formatMarketMessage = (market) => {
    if (!market || !market.payload) {
      console.log("Received invalid market data:", market);
      return null;
    }

    console.log(`Formatting betting data 🔒`);
    
    if (market.type === 'NEW MARKET') {
      return `${market.payload.name} to Pump or Rug in 10 mins is live now! 🔥`;
    } else if (market.type === 'MARKET STATUS UPDATE') {
      return `Betting is now closed for ${market.payload.name} 🔒`;
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
    
    const handleBetUpdates = (updatedBet) => {
      console.log("Received bet update:", updatedBet);
      const message = formatBetMessage(updatedBet);
      console.log("Formatted bet message:", message);
      addToQueue(message);
    };
    
    const subscription = listenToBets(handleBetUpdates);
    console.log("Bet subscription created:", !!subscription);
    
    return () => {
      console.log("Cleaning up bet subscription");
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Fetch latest market updates
  useEffect(() => {
    console.log("Setting up market update listener");
    
    const handleMarketUpdates = (updatedMarket) => {
      console.log("Received market update:", updatedMarket);
      const message = formatMarketMessage(updatedMarket);
      console.log("Formatted market message:", message);
      addToQueue(message);
    };
    
    const subscription = listenToMarkets(handleMarketUpdates);
    console.log("Market subscription created:", !!subscription);
    
    return () => {
      console.log("Cleaning up market subscription");
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="w-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mt-4 mr-4 gap-4 px-4">
      <Image
        className="rounded-full"
        src="/images/bh.png"
        alt="banner"
        width={25}
        height={25}
        priority
      />
      <h1 className="text-black text-sm font-semibold">
        {currentMessage}
      </h1>
    </div>
  );
};

export default ActivityBanner;