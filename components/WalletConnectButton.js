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
 const { publicKey, connected, wallet } = useWallet();
 const { auth } = useAuth();
 const [isClient, setIsClient] = useState(false);
 const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
 const [userProfile, setUserProfile] = useState(null);

 useEffect(() => {
   setIsClient(true);
 }, []);

 useEffect(() => {
   if (connected && publicKey) {
     handleWalletConnection();
   }
 }, [connected, publicKey]);

 const handleWalletConnection = async () => {
   try {
    console.log("Starting wallet connection...");
     if (!publicKey) return;

     console.log("Checking user in Supabase...");
     // Check if user exists in Supabase
     const user = await userService.getUserByWallet(publicKey.toString());

     console.log(`User: ${user}`);

     if (!user) {
      console.log("Creating new user...");
       // Create new user if doesn't exist
       await userService.createUser({
         wallet_ca: publicKey.toString(),
         username: getDefaultUsername()
       });
     }

     console.log("Getting Firebase token...");
     // Get Firebase custom token
     const response = await fetch('/api/auth', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ publicKey: publicKey.toString() })
     });

     const { token } = await response.json();

     // Sign in to Firebase
     await signInWithCustomToken(auth, token);

     // Then check and update user profile
     await checkUserProfile();
   } catch (error) {
    console.error('Error during authentication:', error);
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
         onClick={handleConnectedClick}  // Uncommented this since we have profile page now
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