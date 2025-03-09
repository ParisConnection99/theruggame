'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { transact } from '@solana-mobile/wallet-adapter-mobile';

export const WalletConnectionModal = ({ isOpen, onClose, onError }) => {
  const { select, connecting, connected, wallet } = useWallet();
  const [isAttemptingConnect, setIsAttemptingConnect] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);

  // Detect if user is on mobile device
  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Detect if device is iOS
  const isIOSDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Set mobile state on client side
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsIOS(isIOSDevice());
  }, []);

  // Close modal when connected successfully
  useEffect(() => {
    if (connected) {
      console.log("Connection detected, closing modal");
      onClose();
      setIsAttemptingConnect(false);
      setReconnectAttempts(0);
    }
  }, [connected, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAttemptingConnect(false);
      setReconnectAttempts(0);
    }
  }, [isOpen]);

  // Check URL params on component mount to handle deep link returns
  useEffect(() => {
    if (isMobile && isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const hasWalletParams = urlParams.has('phantom_encryption_public_key') ||
        urlParams.has('errorCode') ||
        urlParams.has('phantom_connector_id');

      if (hasWalletParams) {
        console.log("Detected return from Phantom app via URL params");
        // Clear the URL params to prevent issues on refresh
        window.history.replaceState({}, document.title, window.location.pathname);

        // Force a reconnection attempt when we detect return via URL params
        attemptPhantomConnection();
      }
    }
  }, [isOpen]);

  // Function to manually attempt Phantom connection
  const attemptPhantomConnection = async () => {
    console.log("Attempting manual Phantom connection");
    setLastConnectionAttempt(Date.now());

    try {
      if (window.phantom?.solana) {
        console.log("Phantom detected, attempting connect");

        // First try with onlyIfTrusted for auto-connect
        try {
          await window.phantom.solana.connect({ onlyIfTrusted: true });
          console.log("Connected with trusted connection");
          return true;
        } catch (e) {
          console.log("Trusted connection failed, trying regular connect");
        }

        // If that fails, try regular connection
        try {
          await window.phantom.solana.connect();
          console.log("Connected with regular connection");
          return true;
        } catch (e) {
          console.error("Regular connection failed:", e);
        }
      } else {
        console.log("Phantom not available in window");
      }
    } catch (error) {
      console.error("Phantom connection error:", error);
    }

    return false;
  };

  // Improved reconnection logic
  const attemptReconnection = async () => {
    // Prevent too frequent reconnection attempts (at least 1.5s apart)
    const now = Date.now();
    if (now - lastConnectionAttempt < 1500) {
      console.log("Skipping reconnection attempt (too soon)");
      return;
    }

    if (reconnectAttempts < maxReconnectAttempts) {
      setReconnectAttempts(prev => prev + 1);
      console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);

      const success = await attemptPhantomConnection();

      if (!success && reconnectAttempts < maxReconnectAttempts - 1) {
        // Schedule another attempt with a more gentle backoff
        const backoffTime = Math.min(1000 * (reconnectAttempts + 1), 3000);
        console.log(`Scheduling next attempt in ${backoffTime}ms`);
        setTimeout(attemptReconnection, backoffTime);
      } else if (!success) {
        console.log("All reconnection attempts failed");
        if (onError) {
          onError('Connection not established. Please try again or restart your wallet app.');
        }
        setIsAttemptingConnect(false);
        setReconnectAttempts(0);
      }
    }
  };

  // Improved visibility change handler
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Only react when becoming visible AND we were attempting to connect
      if (!document.hidden && isAttemptingConnect) {
        console.log("User returned from wallet app, checking connection");

        // Give a small delay for the wallet to initialize
        setTimeout(() => {
          if (!connected) {
            console.log("Not connected after return, starting reconnection process");
            // Reset reconnection counter when we detect a return
            setReconnectAttempts(0);
            attemptReconnection();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connected, isAttemptingConnect, onError, reconnectAttempts]);

  if (!isOpen) return null;

  const wallets = [
    {
      name: 'Phantom',
      detected: true,
      logo: '/images/phantom_wallet.png'
    }
    // Add other wallets as needed
  ];

  // Function to handle deep linking to Phantom
  const connectWithDeepLink = () => {
    try {
      console.log("Attempting deep link connection");
      
      const params = new URLSearchParams({
        app_url: "https://theruggame.fun",
        redirect_url: "https://theruggame.fun",
        app_logo: "https://theruggame.fun/images/logo1.png",
        cluster: "mainnet-beta"
      }).toString();
 
      const deepLinkUrl = `https://phantom.app/ul/v1/connect?${params}`;
      window.location.href = deepLinkUrl;

      return true;
    } catch (error) {
      console.error("Deep link error:", error);
      alert(`Error: ${error}`);
      return false;
    }
  };

  // Function for mobile wallet adapter connection (primarily Android)
  const connectWithMobileAdapter = async () => {
    try {
      console.log("Attempting mobile wallet adapter connection");
      
      // Check if transact is available and properly imported
      if (typeof transact !== 'function') {
        console.error("Mobile wallet adapter not properly imported");
        return false;
      }
      
      // Use mobile wallet adapter
      await transact(async (wallet) => {
        try {
          if (!wallet.identify) {
            console.error("Wallet identify method not available");
            return false;
          }
          
          const authResult = await wallet.identify({
            appIdentity: {
              name: 'The Rug Game',
              uri: window.location.origin,
              icon: `${window.location.origin}/images/logo1.png`,
            },
            cluster: 'mainnet-beta',
          });
          
          console.log('Connected with public key:', authResult.publicKey);
          return true;
        } catch (error) {
          console.error("Wallet identity error:", error);
          return false;
        }
      });
      
      return true;
    } catch (error) {
      console.error("Mobile adapter error:", error);
      return false;
    }
  };

  const handleWalletSelect = async (walletName) => {
    // Set attempting state immediately for visual feedback
    setIsAttemptingConnect(true);
    setReconnectAttempts(0);

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

    // if (isMobile) {
    //   console.log("Mobile device detected. iOS:", isIOS);
      
    //   let connectionSuccess = false;
      
    //   // For iOS, always use deep linking
    //   if (isIOS) {
    //     connectionSuccess = connectWithDeepLink();
    //   } else {
    //     // For Android, try mobile wallet adapter first, then fall back to deep linking
    //     try {
    //       connectionSuccess = await connectWithMobileAdapter();
          
    //       // If mobile adapter fails, fall back to deep linking
    //       if (!connectionSuccess) {
    //         console.log("Mobile adapter failed, trying deep link");
    //         connectionSuccess = connectWithDeepLink();
    //       }
    //     } catch (error) {
    //       console.error("Mobile connection error:", error);
    //       connectionSuccess = connectWithDeepLink(); // Fall back to deep linking
    //     }
    //   }
      
    //   if (!connectionSuccess) {
    //     console.error("All mobile connection methods failed");
    //     setIsAttemptingConnect(false);
    //     if (onError) {
    //       onError('Failed to connect to wallet. Please ensure Phantom is installed and try again.');
    //     }
    //   }
    // } else {
    //   // Desktop flow
    //   setTimeout(() => {
    //     try {
    //       select(walletName);
    //     } catch (error) {
    //       console.error("Wallet selection error:", error);
    //       setIsAttemptingConnect(false);
    //       if (onError) {
    //         onError('Failed to connect to wallet. Please try again.');
    //       }
    //     }
    //   }, 50);
    // }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ width: isMobile ? '85%' : '24rem', maxWidth: '420px' }}>
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