'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Image from 'next/image';
import ProfileEditModal from './ProfileEditModal';
import WalletConnectionModal from './WalletConnectionModal';

export const WalletConnectButton = () => {
  const { publicKey, connected, wallet } = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!connected) {
      setShowWalletModal(false);
    }
  }, [connected]);

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

  if (!isClient) return null;

  return (
    <>
      {connected ? (
        <div 
          onClick={() => setShowWalletModal(true)}
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
          {'<connect wallet>'}
        </div>
      )}

      {showWalletModal && (
        <WalletModal 
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          connected={connected}
          showProfileOption={connected && userProfile}
          onEditProfile={() => {
            setShowProfileEditModal(true);
          }}
        />
      )}

      <ProfileEditModal 
        isOpen={showProfileEditModal}
        onClose={() => setShowProfileEditModal(false)}
        onSave={(profileData) => {
          // Implement profile save logic
          console.log('Saving profile:', profileData);
        }}
        defaultUsername={getDefaultUsername()}
      />

      <WalletConnectionModal 
        isOpen={showWalletConnectionModal}
        onClose={() => setShowWalletConnectionModal(false)}
      />
    </>
  );
};

const WalletModal = ({ isOpen, onClose, showProfileOption, onEditProfile }) => {
  const { publicKey, disconnect } = useWallet();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '32rem' }}>
        <div className="flex flex-col items-center gap-4">
          {/* Profile Picture and Username */}
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/images/pepe.webp"
              alt="Profile"
              width={50}
              height={50}
              className="rounded-full"
            />
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">@{publicKey?.toBase58().slice(0, 6)}</span>
            </div>
            {showProfileOption && (
              <button 
                onClick={onEditProfile}
                className="text-white bg-[#2a2a38] px-3 py-1 rounded-lg flex items-center gap-2 border border-white text-sm"
              >
                edit profile <span>↗</span>
              </button>
            )}
          </div>

          {/* Edit profile Button */}
          <div 
            onClick={onEditProfile}
            className="bg-gray-200 py-2 px-4 text-sm rounded-lg text-center text-black border border-white cursor-pointer hover:bg-gray-300"
          >
            edit profile
          </div>

          {/* Wallet Address */}
          <div className="bg-[#2a2a38] rounded-lg py-2 px-4 w-full text-center text-gray-300 text-sm border border-white">
            {publicKey?.toBase58()}
          </div>

          {/* Disconnect Button */}
          <button 
            onClick={disconnect}
            className="w-full bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg text-sm"
          >
            disconnect wallet
          </button>

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-sm font-bold"
          >
            {'<close>'}
          </button>
        </div>
      </div>
    </div>
  );
};


