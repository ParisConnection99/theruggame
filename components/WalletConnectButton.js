'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import WalletConnectionModal from './WalletConnectionModal';

export const WalletConnectButton = () => {
  const router = useRouter();
  const { publicKey, connected, wallet } = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      checkUserProfile();
    }
  }, [connected, publicKey]);

  const checkUserProfile = async () => {
    if (!userProfile) {
      // Implement your profile checking logic here
    }
  };

  const getDefaultUsername = () => {
    return publicKey ? publicKey.toBase58().slice(0, 6) : '';
  };

  const handleConnectedClick = () => {
    router.push('/profile');
  };

  if (!isClient) return null;

  return (
    <>
      {connected ? (
        <div 
          //onClick={handleConnectedClick}
          className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-white hover:scale-105"
        >
          <Image
            src="/images/pepe.webp"
            alt="Profile"
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-white text-sm">
            {getDefaultUsername()}
          </span>
        </div>
      ) : (
        <div 
          onClick={() => setShowWalletConnectionModal(true)}
          className="text-white text-md hover:scale-105 hover:underline cursor-pointer"
        >
          CONNECT WALLET
        </div>
      )}

      <WalletConnectionModal 
        isOpen={showWalletConnectionModal}
        onClose={() => setShowWalletConnectionModal(false)}
      />
    </>
  );
};
