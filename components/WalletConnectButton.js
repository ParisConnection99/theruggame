'use client';

import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export const WalletConnectButton = () => {
  const { publicKey, connected } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure this component only renders on the client
  }, []);

  if (!isClient) return null; // Avoid rendering during SSR

  return (
    <div className="flex items-center space-x-4">
      {connected && publicKey ? (
        <div className="flex items-center space-x-2">
          {/* Custom Circular Profile */}
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-bold">
            {publicKey.toBase58().slice(0, 1).toUpperCase()} {/* First letter of wallet */}
          </div>
          {/* Custom Wallet Address */}
          <span className="text-white text-md">
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
        </div>
      ) : null}
      {/* WalletMultiButton */}
      <WalletMultiButton className="text-white text-md hover:scale-105 hover:underline font-medium !pl-3 !pr-3 !bg-transparent !border-none" />
    </div>
  );
};
