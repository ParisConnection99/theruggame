'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected, wallet } = useWallet();
  const [selectedWalletName, setSelectedWalletName] = useState(null);
  
  useEffect(() => {
    if (connected) {
      onClose();
    }
  }, [connected, onClose]);

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
      setSelectedWalletName(walletName);
      select(walletName);
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
              
              {/* Loading indicator */}
              {connecting && selectedWalletName === walletOption.name && (
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