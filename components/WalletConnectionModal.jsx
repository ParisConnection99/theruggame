'use client';

import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connected } = useWallet();

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
  ];

  // In your modal component
  const handleWalletSelect = (walletName) => {
    console.log(`Attempting to select wallet: ${walletName}`);
    try {
      select(walletName);
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

        <div className="space-y-2">
          {wallets.map((wallet) => (
            <div
              key={wallet.name}
              onClick={() => wallet.detected && handleWalletSelect(wallet.name)}
              className={`
                flex items-center gap-3 
                p-3 rounded-lg 
                ${wallet.detected
                  ? 'cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white'
                  : 'bg-gray-700 text-gray-400 opacity-50'}
              `}
            >
              <Image
                src={wallet.logo}
                alt={`${wallet.name} logo`}
                width={24}
                height={24}
                className="rounded-full"
              />
              <div className="flex justify-between flex-1">
                <span>{wallet.name}</span>
                <span>{wallet.detected ? 'Detected' : 'Not Detected'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;