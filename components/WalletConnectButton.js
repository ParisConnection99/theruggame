'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import WalletConnectionModal from './WalletConnectionModal';
import UserService from '@/services/UserService';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';

const userService = new UserService(supabase);

export const WalletConnectButton = () => {
  const router = useRouter();
  const { publicKey, connected, connecting } = useWallet();
  const { auth } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Simplified connection monitoring
  useEffect(() => {
    if (connected && publicKey && auth) {
      handleWalletConnection();
    }
  }, [connected, publicKey, auth]);

  const handleWalletConnection = async () => {
    if (connectionInProgress) return; // Prevent multiple simultaneous attempts
    
    try {
      setConnectionInProgress(true);
      setConnectionError('');
      
      console.log("Starting wallet connection process");
      if (!publicKey || !auth) {
        console.log("Wallet connection aborted: publicKey or auth not available");
        setConnectionInProgress(false);
        return;
      }

      // Step 1: Check if user exists in Supabase
      console.log("Checking user in Supabase...");
      const user = await userService.getUserByWallet(publicKey.toString());

      if (!user) {
        console.log("Creating new user...");
        // Create new user if doesn't exist
        await userService.createUser({
          wallet_ca: publicKey.toString(),
          username: getDefaultUsername()
        });
      }

      // Step 2: Get Firebase custom token
      console.log("Getting Firebase token for:", publicKey.toString());
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.toString() })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Step 3: Sign in to Firebase
      console.log("Signing in with custom token...");
      await signInWithCustomToken(auth, data.token);
      console.log("Firebase sign in successful");

      // Step 4: Update user profile state
      await checkUserProfile();
      
      setConnectionInProgress(false);
    } catch (error) {
      console.error('Error during authentication:', error);
      setConnectionError(error.message || 'Failed to authenticate after wallet connection');
      setConnectionInProgress(false);
    }
  };

  const checkUserProfile = async () => {
    if (!userProfile && publicKey) {
      const user = await userService.getUserByWallet(publicKey.toString());
      setUserProfile(user);
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
          onClick={handleConnectedClick}
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
            {userProfile?.username || getDefaultUsername()}
          </span>
        </div>
      ) : (
        <div 
          onClick={() => {
            if (!connecting && !connectionInProgress) {
              setShowWalletConnectionModal(true);
            }
          }}
          className={`text-white text-md hover:scale-105 hover:underline cursor-pointer flex items-center gap-2 
            ${(connecting || connectionInProgress) ? 'opacity-70 pointer-events-none' : ''}`}
        >
          {(connecting || connectionInProgress) ? (
            <>
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
              CONNECTING...
            </>
          ) : (
            "CONNECT WALLET"
          )}
        </div>
      )}

      {/* Connection error toast */}
      {connectionError && (
        <div className="fixed bottom-4 right-4 bg-red-900 text-white p-3 rounded shadow-lg z-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold">Connection Error</p>
            <p className="text-sm">{connectionError}</p>
          </div>
          <button 
            onClick={() => setConnectionError('')}
            className="ml-2 text-white"
          >
            ✕
          </button>
        </div>
      )}

      <WalletConnectionModal 
        isOpen={showWalletConnectionModal}
        onClose={() => setShowWalletConnectionModal(false)}
      />
    </>
  );
};