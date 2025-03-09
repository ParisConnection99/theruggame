'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SignClient } from '@walletconnect/sign-client';
import { Web3Provider } from '@solana/web3.js';

export const WalletConnectionModal = ({ isOpen, onClose, onError }) => {
  const [signClient, setSignClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
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

  // Initialize WalletConnect client
  useEffect(() => {
    const initWalletConnect = async () => {
      try {
        setIsInitializing(true);
        const client = await SignClient.init({
          projectId: '9561050902e6bf6802cafcbb285d47ea',
          metadata: {
            name: 'The Rug Game',
            description: 'Connect to The Rug Game',
            url: 'https://theruggame.fun',
            icons: ['https://theruggame.fun/images/logo1.png']
          }
        });
        
        setSignClient(client);
        
        // Check for existing sessions
        const existingSessions = client.session.getAll();
        if (existingSessions.length > 0) {
          // Use the most recent session
          const latestSession = existingSessions[existingSessions.length - 1];
          setSession(latestSession);
          
          // Extract Solana account if available
          if (latestSession.namespaces.solana?.accounts?.length > 0) {
            const accountId = latestSession.namespaces.solana.accounts[0];
            // Format: solana:mainnet:publicKey
            const publicKey = accountId.split(':')[2];
            setPublicKey(publicKey);
            setConnected(true);
          }
        }
      } catch (error) {
        console.error("Error initializing WalletConnect:", error);
        if (onError) {
          onError('Failed to initialize wallet connection. Please try again.');
        }
      } finally {
        setIsInitializing(false);
      }
    };

    if (isOpen) {
      initWalletConnect();
    }
  }, [isOpen, onError]);

  // Setup event listeners
  useEffect(() => {
    if (!signClient) return;

    const handleSessionUpdate = (updatedSession) => {
      console.log("Session updated:", updatedSession);
      setSession(updatedSession);
    };

    const handleSessionDelete = () => {
      console.log("Session deleted");
      setConnected(false);
      setPublicKey(null);
      setSession(null);
    };

    signClient.on('session_update', handleSessionUpdate);
    signClient.on('session_delete', handleSessionDelete);

    return () => {
      signClient.off('session_update', handleSessionUpdate);
      signClient.off('session_delete', handleSessionDelete);
    };
  }, [signClient]);

  // Close modal when connected successfully
  useEffect(() => {
    if (connected) {
      console.log("Connection detected, closing modal");
      onClose();
    }
  }, [connected, onClose]);

  // Function to connect with WalletConnect
  const connectWithWalletConnect = async () => {
    if (!signClient) {
      console.error("WalletConnect client not initialized");
      return;
    }
    
    try {
      setConnecting(true);
      
      // Create connection request
      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          solana: {
            methods: ['solana_signTransaction', 'solana_signMessage'],
            chains: ['solana:mainnet'],
            events: ['accountsChanged']
          }
        }
      });
      
      if (!uri) {
        throw new Error("Failed to generate connection URI");
      }
      
      // For mobile, deep link to Phantom
      if (isMobile) {
        // Deep link to Phantom with WalletConnect URI
        // Using the correct URI format for Phantom WalletConnect
        window.location.href = `phantom://wc?uri=${encodeURIComponent(uri)}`;
        
        // Fallback for if the phantom:// protocol doesn't work
        setTimeout(() => {
          window.location.href = `https://phantom.app/ul/browse/wc?uri=${encodeURIComponent(uri)}`;
        }, 1000);
      } else {
        // For desktop, we'd typically show a QR code
        // But since you mentioned you don't want QR codes, we'll just try to open Phantom extension
        if (window.phantom?.solana) {
          // If Phantom extension is available, try to connect directly
          await window.phantom.solana.connect();
        } else {
          alert("Please install Phantom browser extension or scan the QR code with your Phantom mobile app");
          // Here you would normally display a QR code with the URI
        }
      }
      
      // Wait for approval
      const newSession = await approval();
      console.log('Connected with WalletConnect', newSession);
      
      // Get accounts
      if (newSession.namespaces.solana?.accounts?.length > 0) {
        const accountId = newSession.namespaces.solana.accounts[0];
        // Format: solana:mainnet:publicKey
        const publicKey = accountId.split(':')[2];
        setPublicKey(publicKey);
        setConnected(true);
        setSession(newSession);
      }
      
    } catch (error) {
      console.error('Error connecting with WalletConnect', error);
      if (onError) {
        onError('Failed to connect to wallet. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Function to disconnect
  const disconnectWallet = async () => {
    if (signClient && session) {
      try {
        await signClient.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: 'User disconnected' }
        });
        
        setConnected(false);
        setPublicKey(null);
        setSession(null);
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }
  };

  if (!isOpen) return null;

  const wallets = [
    {
      name: 'Phantom',
      detected: true,
      logo: '/images/phantom_wallet.png'
    }
    // Add other wallets as needed
  ];

  const handleWalletSelect = async (walletName) => {
    if (connecting || isInitializing) return;
    
    try {
      await connectWithWalletConnect();
    } catch (error) {
      console.error("Wallet connection error:", error);
      if (onError) {
        onError('Failed to connect to wallet. Please try again.');
      }
    }
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
        {(connecting || isInitializing) && (
          <div className="mb-4 py-2 px-3 bg-[#2a2a38] rounded-md text-white text-center">
            {isInitializing 
              ? "Initializing wallet connection..."
              : isMobile
                ? "Opening wallet app... If nothing happens, please ensure Phantom is installed."
                : "Connecting to wallet... Check your wallet extension."}
          </div>
        )}

        <div className="space-y-2">
          {wallets.map((walletOption) => (
            <div
              key={walletOption.name}
              onClick={() => walletOption.detected && !connecting && !isInitializing && handleWalletSelect(walletOption.name)}
              className={`
                flex items-center gap-3 
                p-3 rounded-lg
                ${(connecting || isInitializing)
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
              {(connecting || isInitializing) && (
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