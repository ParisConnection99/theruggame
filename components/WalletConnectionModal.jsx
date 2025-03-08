'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected, wallet } = useWallet();
  const [isAttemptingConnect, setIsAttemptingConnect] = useState(false);
  
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
    
    // Short timeout to ensure UI updates before potential wallet prompts
    setTimeout(() => {
      try {
        select(walletName);
      } catch (error) {
        console.error("Wallet selection error:", error);
        setIsAttemptingConnect(false);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '24rem' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect a wallet on Solana</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            ✕
          </button>
        </div>
        
        {/* Simple connection status */}
        {(connecting || isAttemptingConnect) && (
          <div className="mb-4 py-2 px-3 bg-[#2a2a38] rounded-md text-white text-center">
            Connecting to wallet... Check your wallet extension.
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
                <span>{walletOption.detected ? 'Detected' : 'Not Detected'}</span>
              </div>
              
              {/* Simple loading indicator */}
              {(connecting || isAttemptingConnect) && (
                <div className="absolute right-3 w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;