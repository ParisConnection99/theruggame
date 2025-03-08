'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected, wallet, publicKey } = useWallet();
  const [selectedWalletName, setSelectedWalletName] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  
  useEffect(() => {
    if (connected && publicKey) {
      onClose();
    }
  }, [connected, publicKey, onClose]);
  
  useEffect(() => {
    // Hide immediate feedback once connecting state is active
    if (connecting) {
      const connectionFeedbackEl = document.getElementById('connection-feedback');
      if (connectionFeedbackEl) {
        connectionFeedbackEl.classList.add('hidden');
      }
    }
  }, [connecting]);
  
  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setConnectionError(null);
      setSelectedWalletName(null);
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
    if (!connecting) {
      setConnectionError(null);
      setSelectedWalletName(walletName);
      
      // Show immediate connection feedback
      const connectionFeedbackEl = document.getElementById('connection-feedback');
      if (connectionFeedbackEl) {
        connectionFeedbackEl.classList.remove('hidden');
      }
      
      try {
        select(walletName);
        
        // Add timeout to detect if wallet extension isn't responding
        const connectionTimeout = setTimeout(() => {
          if (!connected && selectedWalletName === walletName) {
            setConnectionError('Connection timed out. Please check if your wallet is unlocked.');
          }
        }, 15000); // 15 second timeout
        
        return () => clearTimeout(connectionTimeout);
      } catch (error) {
        console.error('Error selecting wallet:', error);
        setConnectionError(`Failed to connect: ${error.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '24rem' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect a wallet on Solana</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        
        {/* Connection status message */}
        {connecting && (
          <div className="mb-4 py-2 px-3 bg-[#2a2a38] rounded-md text-white text-center">
            Connecting to {selectedWalletName}... Please check your wallet extension.
          </div>
        )}
        
        {/* Immediate connection feedback - hidden by default */}
        <div id="connection-feedback" className="mb-4 py-2 px-3 bg-blue-600 rounded-md text-white text-center hidden">
          Initializing connection to {selectedWalletName}...
        </div>
        
        {/* Error message */}
        {connectionError && (
          <div className="mb-4 py-2 px-3 bg-red-700 rounded-md text-white text-center">
            {connectionError}
          </div>
        )}
        
        <div className="space-y-2">
          {wallets.map((walletOption) => (
            <div
              key={walletOption.name}
              onClick={() => walletOption.detected && handleWalletSelect(walletOption.name)}
              className={`
                flex items-center gap-3 
                p-3 rounded-lg
                ${connecting && selectedWalletName === walletOption.name
                  ? 'bg-[#3a3a58] border border-blue-400'
                  : selectedWalletName === walletOption.name && !connecting
                    ? 'bg-[#2d2d45] border border-blue-300'
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
              
              {/* Status indicators */}
              {connecting && selectedWalletName === walletOption.name && (
                <div className="absolute right-3 w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
              )}
              
              {selectedWalletName === walletOption.name && !connecting && (
                <div className="absolute right-3 flex items-center justify-center">
                  <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;