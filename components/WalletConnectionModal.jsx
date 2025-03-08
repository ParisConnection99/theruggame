'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose, onError }) => {
  const { select, connecting, connected, wallet } = useWallet();
  const [isAttemptingConnect, setIsAttemptingConnect] = useState(false);
  // Add these variables for reconnection
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;
  
  // Detect if user is on mobile device
  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  
  const [isMobile, setIsMobile] = useState(false);
  
  // Set mobile state on client side
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  useEffect(() => {
    if (connected) {
      onClose();
    }
  }, [connected, onClose]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAttemptingConnect(false);
    }
  }, [isOpen]);
  
  // Handle mobile visibility changes (app switching)
  // Handle mobile visibility changes (app switching)
useEffect(() => {
  const attemptReconnection = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      setReconnectAttempts(prev => prev + 1);
      console.log(`Reconnection attempt ${reconnectAttempts + 1}...`);
      
      // Try to manually reconnect to wallet
      try {
        // For Phantom specifically
        if (window.phantom?.solana && !connected) {
          window.phantom.solana.connect({ onlyIfTrusted: true })
            .catch(e => console.log("Reconnection failed:", e));
        }
      } catch (e) {
        console.error("Reconnection error:", e);
      }
      
      // Schedule another attempt with exponential backoff
      setTimeout(attemptReconnection, 1000 * (2 ** (reconnectAttempts + 1)));
    } else if (reconnectAttempts >= maxReconnectAttempts && !connected) {
      // If all reconnection attempts fail
      console.log("All reconnection attempts failed");
      if (onError) {
        onError('Connection not established after multiple attempts. Please try again.');
      }
      setIsAttemptingConnect(false);
      setReconnectAttempts(0);
    }
  };

  const handleVisibilityChange = () => {
    if (!document.hidden && !connected && isAttemptingConnect) {
      // User returned from wallet app, attempt to refresh connection
      console.log("User returned from wallet app, checking connection");
      
      // Reset reconnection attempts
      setReconnectAttempts(0);
      
      // Start reconnection process
      attemptReconnection();
      
      // Original timeout as fallback
      setTimeout(() => {
        if (!connected && isAttemptingConnect) {
          // If still not connected after returning and no reconnection succeeded
          if (onError && reconnectAttempts >= maxReconnectAttempts) {
            onError('Connection not established after returning from wallet app. Please try again.');
          }
          setIsAttemptingConnect(false);
        }
      }, 5000);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [connected, isAttemptingConnect, onError, reconnectAttempts]);
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && !connected && isAttemptingConnect) {
  //       // User returned from wallet app, attempt to refresh connection
  //       console.log("User returned from wallet app, checking connection");
  //       // Give a short delay to allow connection to be established
  //       setTimeout(() => {
  //         if (!connected && isAttemptingConnect) {
  //           // If still not connected after returning, show a helpful error
  //           if (onError) {
  //             onError('Connection not established after returning from wallet app. Please try again.');
  //           }
  //           setIsAttemptingConnect(false);
  //         }
  //       }, 1000);
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [connected, isAttemptingConnect, onError]);

  if (!isOpen) return null;

  const wallets = [
    {
      name: 'Phantom',
      detected: true,
      logo: '/images/phantom_wallet.png'
    }
    // Add other wallets as needed
  ];

  const handleWalletSelect = (walletName) => {
    // Set attempting state immediately for visual feedback
    setIsAttemptingConnect(true);
    
    if (isMobile) {
      try {
        // For mobile, we need to handle deep linking to the wallet app
        // This will send users to Phantom app and then return to your site
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://phantom.app/ul/browse/${currentUrl}`;
        // Note: The connection will be handled on return via visibilitychange event
      } catch (error) {
        console.error("Mobile wallet redirect error:", error);
        setIsAttemptingConnect(false);
        if (onError) {
          onError('Failed to open wallet app. Please ensure Phantom is installed.');
        }
      }
    } else {
      // Desktop flow
      setTimeout(() => {
        try {
          select(walletName);
        } catch (error) {
          console.error("Wallet selection error:", error);
          setIsAttemptingConnect(false);
          if (onError) {
            onError('Failed to connect to wallet. Please try again.');
          }
        }
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '24rem', maxWidth: '90vw' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect a wallet on Solana</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            ✕
          </button>
        </div>
        
        {/* Mobile-specific instructions */}
        {isMobile && (
          <div className="mb-4 py-2 px-3 bg-blue-900/30 rounded-md text-white text-sm">
            You'll be redirected to the Phantom app. After connecting, return to this browser to continue.
          </div>
        )}
        
        {/* Connection status */}
        {(connecting || isAttemptingConnect) && (
          <div className="mb-4 py-2 px-3 bg-[#2a2a38] rounded-md text-white text-center">
            {isMobile 
              ? "Opening wallet app... If nothing happens, please ensure Phantom is installed."
              : "Connecting to wallet... Check your wallet extension."}
          </div>
        )}
        
        <div className="space-y-2">
          {wallets.map((walletOption) => (
            <div
              key={walletOption.name}
              onClick={() => walletOption.detected && !connecting && !isAttemptingConnect && handleWalletSelect(walletOption.name)}
              className={`
                flex items-center gap-3 
                p-3 rounded-lg
                ${(connecting || isAttemptingConnect)
                  ? 'bg-[#3a3a58] border border-blue-400'
                  : walletOption.detected
                    ? 'cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white'
                    : 'bg-gray-700 text-gray-400 opacity-50'}
                relative
              `}
            >
              <Image
                src={walletOption.logo}
                alt={`${walletOption.name} logo`}
                width={24}
                height={24}
                className="rounded-full"
              />
              <div className="flex justify-between flex-1">
                <span>{walletOption.name}</span>
                <span>
                  {isMobile ? 'Mobile App' : (walletOption.detected ? 'Detected' : 'Not Detected')}
                </span>
              </div>
              
              {/* Simple loading indicator */}
              {(connecting || isAttemptingConnect) && (
                <div className="absolute right-3 w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Fallback instruction for mobile users */}
        {isMobile && (
          <div className="mt-4 text-xs text-gray-400">
            If you don't have Phantom installed, you can download it from the App Store or Google Play.
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnectionModal;