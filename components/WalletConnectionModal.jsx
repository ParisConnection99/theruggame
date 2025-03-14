'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { logInfo, logError } from '@/utils/logger';
import Image from 'next/image';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export const WalletConnectionModal = ({ isOpen, onClose, onError }) => {
  const { select, connecting, connected } = useWallet();
  const [isAttemptingConnect, setIsAttemptingConnect] = useState(false);
  const [dappEncryptionPublicKey, setDappEncryptionPublicKey] = useState('');
  const keypairRef = useRef(null);

  // Detect if user is on mobile device
  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const [isMobile, setIsMobile] = useState(false);
  const [reconnectAttempted, setReconnectAttempted] = useState(false);

  // Set mobile state on client side
  useEffect(() => {
    // Check if a keypair already exists in localStorage
 // Check if a keypair already exists in localStorage
 const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');

 if (storedPrivateKey) {
   try {
     // Use the existing keypair
     const existingKeypair = nacl.box.keyPair.fromSecretKey(bs58.decode(storedPrivateKey));
     keypairRef.current = existingKeypair;
     setDappEncryptionPublicKey(bs58.encode(existingKeypair.publicKey));
   } catch (error) {
     console.error("Failed to load existing keypair:", error);
     localStorage.removeItem('dappEncryptionPrivateKey');
     localStorage.removeItem('dappEncryptionPublicKey');
   }
 } else {
   // Generate a new keypair
   const keypair = nacl.box.keyPair();
   keypairRef.current = keypair;

   // Store the public key
   const publicKeyBase58 = bs58.encode(keypair.publicKey);
   setDappEncryptionPublicKey(publicKeyBase58);
   localStorage.setItem('dappEncryptionPublicKey', publicKeyBase58);

   // Store the private key securely (consider an alternative to localStorage)
   const privateKeyBase58 = bs58.encode(keypair.secretKey);
   localStorage.setItem('dappEncryptionPrivateKey', privateKeyBase58);

   // Log key generation
   logInfo('dapp_private_key', {
     component: 'WalletConnectionModal',
     dappPrivateKey: privateKeyBase58,
   });
 }

 setIsMobile(isMobileDevice());
  }, []);

  // Listen for wallet return reconnect events
  useEffect(() => {
    const handleWalletReturnReconnect = () => {
      console.log("Wallet return reconnect event received");
      setReconnectAttempted(true);

      // Reset after a few seconds
      setTimeout(() => {
        setReconnectAttempted(false);
      }, 3000);
    };

    window.addEventListener('wallet-return-reconnect', handleWalletReturnReconnect);
    return () => window.removeEventListener('wallet-return-reconnect', handleWalletReturnReconnect);
  }, []);

  // Close modal when connected successfully
  useEffect(() => {
    if (connected) {
      console.log("Connection detected, closing modal");
      onClose();
      setIsAttemptingConnect(false);

      // Clear any pending connection flags when successfully connected
      localStorage.removeItem('wallet_connect_pending');
      localStorage.removeItem('wallet_connect_timestamp');
    }
  }, [connected, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAttemptingConnect(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const wallets = [
    {
      name: 'Phantom',
      detected: true,
      logo: '/images/phantom_wallet.png'
    }
  ];

  const handleWalletSelect = async (walletName) => {
    // Set attempting state immediately for visual feedback
    setIsAttemptingConnect(true);

    try {
      // For mobile, dispatch an event to set connection pending flags
      if (isMobile) {
        window.dispatchEvent(new Event('wallet-connect-start'));
      }

      // Use wallet adapter select - simplifying to match the tutorial approach
      select(walletName);
    } catch (error) {
      console.error("Wallet selection error:", error);
      setIsAttemptingConnect(false);
      if (onError) {
        onError('Failed to connect to wallet. Please try again.');
      }
    }
  };
  // Option for direct Phantom deep link on mobile
  const handleDirectPhantomLink = () => {
    if (!isMobile) return;

    logInfo('Handle Direct Phantom Link', {
      component: 'Wallet connection modal'
    });

    try {
      // Set pending flags
      localStorage.setItem('wallet_connect_pending', 'true');
      localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

      const appUrl = 'https://theruggame.fun/';
      const redirectUrl = 'https://theruggame.fun/wallet-callback';

      const params = new URLSearchParams({
        dapp_encryption_public_key: dappEncryptionPublicKey,
        cluster: "mainnet-beta",
        app_url: appUrl,
        redirect_link: redirectUrl
      });

      const deepLink = `https://phantom.app/ul/v1/connect?${params.toString()}`;

      logInfo('Deeplink', {
        link: deepLink
      });

      // Direct link to Phantom with callback to our site
      window.location.href = deepLink;
    } catch (error) {
      console.error("Direct link error:", error);
      if (onError) {
        onError('Failed to open Phantom app. Please try connecting manually.');
      }
    }
  };

  // Content component
  const ModalContent = () => (
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
            {reconnectAttempted
              ? "Completing connection... If you approved in your wallet, you'll be connected shortly."
              : "You'll be redirected to the Phantom app. After connecting, return to this browser to continue."}
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
              onClick={() => walletOption.detected && !connecting && !isAttemptingConnect &&
                (isMobile ? handleDirectPhantomLink() : handleWalletSelect(walletOption.name))}
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

  // Return the modal
  return <ModalContent />;
};

export default WalletConnectionModal;