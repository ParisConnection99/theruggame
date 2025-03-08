'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import WalletConnectionModal from './WalletConnectionModal';
import UserService from '@/services/UserService';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';

const userService = new UserService(supabase);

// Mobile detection utility
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

export const WalletConnectButton = () => {
 const router = useRouter();
 const { publicKey, connected, wallet, connecting } = useWallet();
 const { auth } = useAuth();
 const [isClient, setIsClient] = useState(false);
 const [isMobile, setIsMobile] = useState(false);
 const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
 const [userProfile, setUserProfile] = useState(null);
 const [connectionInProgress, setConnectionInProgress] = useState(false);
 const [connectionError, setConnectionError] = useState('');
 const connectionTimeoutRef = useRef(null);
 const [connectionRetries, setConnectionRetries] = useState(0);

 useEffect(() => {
   setIsClient(true);
   setIsMobile(isMobileDevice());
   
   // Cleanup function to clear any timeouts when component unmounts
   return () => {
     if (connectionTimeoutRef.current) {
       clearTimeout(connectionTimeoutRef.current);
     }
   };
 }, []);

 // Monitor connecting state for timeouts
 useEffect(() => {
   // Clear any existing timeout when connection state changes
   if (connectionTimeoutRef.current) {
     clearTimeout(connectionTimeoutRef.current);
     connectionTimeoutRef.current = null;
   }
   
   if (connecting) {
     // Set a timeout to reset connecting state if it takes too long
     connectionTimeoutRef.current = setTimeout(() => {
       if (connecting) {
         // On mobile, we give a different message
         const errorMessage = isMobile
           ? 'Connection to wallet is taking longer than expected. Please make sure you have a wallet app installed.'
           : 'Connection is taking longer than expected. Please check your wallet extension for any pending approval requests or try again.';
         
         setConnectionError(errorMessage);
         setConnectionInProgress(false);
       }
     }, isMobile ? 15000 : 10000); // Longer timeout on mobile
   }
 }, [connecting, isMobile]);

 useEffect(() => {
   if (connected && publicKey) {
     handleWalletConnection();
   }
 }, [connected, publicKey]);

 const handleWalletConnection = async () => {
   try {
     setConnectionInProgress(true);
     setConnectionError('');
     
     // Set a timeout for the whole wallet connection process
     if (connectionTimeoutRef.current) {
       clearTimeout(connectionTimeoutRef.current);
     }
     
     connectionTimeoutRef.current = setTimeout(() => {
       if (connectionInProgress) {
         setConnectionError('Authentication is taking longer than expected. Please try again.');
         setConnectionInProgress(false);
       }
     }, 15000); // Longer timeout for the whole process
     
     console.log("Starting wallet connection...");
     if (!publicKey) {
       clearTimeout(connectionTimeoutRef.current);
       setConnectionInProgress(false);
       return;
     }

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

     const data = await response.json();
     
     if (data.error) {
       throw new Error(data.error);
     }
     
     // Sign in to Firebase
     await signInWithCustomToken(auth, data.token);

     // Then check and update user profile
     await checkUserProfile();
     
     // Clear the timeout since we completed successfully
     if (connectionTimeoutRef.current) {
       clearTimeout(connectionTimeoutRef.current);
     }
     
     setConnectionInProgress(false);
     // Reset retries on successful connection
     setConnectionRetries(0);
   } catch (error) {
     console.error('Error during authentication:', error);
     setConnectionError(error.message || 'Failed to complete wallet connection');
     setConnectionInProgress(false);
     
     // Clear the timeout since we got an error
     if (connectionTimeoutRef.current) {
       clearTimeout(connectionTimeoutRef.current);
     }
     
     // Increment retry counter
     setConnectionRetries(prev => prev + 1);
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

 const handleConnectClick = () => {
   // Reset retry counter when initiating a new connection
   setConnectionRetries(0);
   setShowWalletConnectionModal(true);
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
             handleConnectClick();
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

     {/* Mobile wallet notice - show after multiple failed attempts */}
     {isMobile && connectionRetries > 1 && !connected && (
       <div className="fixed bottom-4 left-4 right-4 bg-blue-900 text-white p-3 rounded shadow-lg z-50">
         <div className="flex items-center">
           <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <div>
             <p className="font-bold">Having trouble connecting?</p>
             <p className="text-sm">Make sure you have a Solana wallet app installed on your device.</p>
             <p className="text-sm mt-1">Try using our site in private browsing mode if problems persist.</p>
           </div>
           <button 
             onClick={() => setConnectionRetries(0)}
             className="ml-2 text-white"
           >
             ✕
           </button>
         </div>
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