'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected } = useWallet();
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConnectionAttempted(false);
      console.log("Modal opened, connection state reset");
    }
  }, [isOpen]);

  // Monitor connection states
  useEffect(() => {
    console.log("Connection state:", { connecting, connected, connectionAttempted });
    
    if (connected) {
      console.log("Connection successful!");
      onClose();
    }
  }, [connecting, connected, connectionAttempted, onClose]);

  if (!isOpen) return null;

  const handleConnectPhantom = () => {
    console.log("Connect button clicked");
    setConnectionAttempted(true);
    
    try {
      console.log("Attempting to select Phantom wallet");
      select('Phantom');
      console.log("select() function called successfully");
    } catch (error) {
      console.error("Error selecting wallet:", error);
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
        
        {/* Connection Status */}
        {connecting && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300 flex items-center">
            <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Connecting to Phantom... Check your wallet extension</span>
          </div>
        )}
        
        {connectionAttempted && !connecting && !connected && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg text-red-300">
            <p>No response from wallet. Make sure Phantom is installed and unlocked.</p>
            <button 
              onClick={handleConnectPhantom}
              className="mt-2 px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )}
        
        <div className="space-y-2">
          <div 
            onClick={handleConnectPhantom}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white"
          >
            <Image 
              src="/images/phantom_wallet.png" 
              alt="Phantom logo" 
              width={24} 
              height={24} 
              className="rounded-full"
            />
            <div className="flex justify-between flex-1">
              <span>Phantom</span>
              <span>Connect</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;