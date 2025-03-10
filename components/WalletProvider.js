'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [isClient, setIsClient] = useState(false);
  
  // We need to use useState for wallets because we want to detect
  // if we're on mobile or desktop after component mounts
  const [wallets, setWallets] = useState([]);
  
  useEffect(() => {
    setIsClient(true);
    
    // Get current URL for redirect
    const currentUrl = window.location.origin + window.location.pathname;
    
    // Initialize Phantom adapter with redirect URL
    const phantomAdapter = new PhantomWalletAdapter({
      appIdentity: {
        name: "The Rug Game", // Replace with your app name
      },
      redirectUrl: "https://www.theruggame.fun/" // This is the key part for redirecting back to your site
    });
    
    setWallets([phantomAdapter]);
    
    // Check if we've returned from a wallet connection via URL params
    const checkUrlForWalletReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasWalletParams = urlParams.has('phantom_encryption_public_key') || 
                            urlParams.has('errorCode');
      
      if (hasWalletParams) {
        console.log('Detected return from wallet via URL parameters');
        // Clean up URL if desired
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    checkUrlForWalletReturn();
  }, []);
  
  // Handle rendering nothing on the server
  if (!isClient) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProviderComponent;
// 'use client';

// import React, { useMemo, useState, useEffect } from 'react';
// import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
// import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// import { clusterApiUrl } from '@solana/web3.js';

// export const WalletProviderComponent = ({ children }) => {
//   const network = 'mainnet-beta';
//   const endpoint = useMemo(() => clusterApiUrl(network), [network]);
//   const [isClient, setIsClient] = useState(false);
  
//   // We need to use useState for wallets because we want to detect
//   // if we're on mobile or desktop after component mounts
//   const [wallets, setWallets] = useState([]);
  
//   useEffect(() => {
//     setIsClient(true);
    
//     // Following the tutorial approach - simple setup with just PhantomWalletAdapter
//     const phantomAdapter = new PhantomWalletAdapter();
//     const walletAdapters = [phantomAdapter];
//     setWallets(walletAdapters);
    
//     // For mobile devices, we'll still handle wallet returns
//     const isMobileDevice = () => {
//       if (typeof navigator === 'undefined') return false;
//       return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//     };
    
//     if (isMobileDevice()) {
//       // Handle wallet connection start
//       const handleWalletConnectionStart = () => {
//         localStorage.setItem('wallet_connect_pending', 'true');
//         localStorage.setItem('wallet_connect_timestamp', Date.now().toString());
//       };
      
//       window.addEventListener('wallet-connect-start', handleWalletConnectionStart);
      
//       // Check if returning from wallet connection
//       const checkWalletReturn = () => {
//         const pendingConnection = localStorage.getItem('wallet_connect_pending');
//         if (pendingConnection === 'true') {
//           // Clear the pending flag
//           localStorage.removeItem('wallet_connect_pending');
          
//           // Check if we're within a reasonable timeframe (5 minutes)
//           const timestamp = parseInt(localStorage.getItem('wallet_connect_timestamp') || '0');
//           const now = Date.now();
//           const fiveMinutes = 5 * 60 * 1000;
          
//           if (now - timestamp < fiveMinutes) {
//             console.log('Detected return from wallet connection');
//             // We'll attempt a reconnection
//             setTimeout(() => {
//               console.log('Attempting to reconnect wallet after return');
//               window.dispatchEvent(new Event('wallet-return-reconnect'));
//             }, 1000); // Short delay to let things initialize
//           } else {
//             // Session probably expired
//             localStorage.removeItem('wallet_connect_timestamp');
//           }
//         }
//       };
      
//       checkWalletReturn();
      
//       // Handle visibility changes for mobile
//       const handleVisibilityChange = () => {
//         if (!document.hidden) {
//           console.log("Visibility changed - returning from wallet app");
          
//           // If we've just become visible, check if we need to reconnect
//           const pendingConnection = localStorage.getItem('wallet_connect_pending');
//           if (pendingConnection === 'true') {
//             // Short delay to let UI stabilize
//             setTimeout(() => {
//               window.dispatchEvent(new Event('wallet-return-reconnect'));
//             }, 500);
//           }
//         }
//       };
      
//       document.addEventListener('visibilitychange', handleVisibilityChange);
//       return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
//     }
//   }, []);
  
//   // Handle rendering nothing on the server
//   if (!isClient) {
//     return null;
//   }

//   return (
//     <ConnectionProvider endpoint={endpoint}>
//       <WalletProvider wallets={wallets} autoConnect={true}>
//         <WalletModalProvider>
//           {children}
//         </WalletModalProvider>
//       </WalletProvider>
//     </ConnectionProvider>
//   );
// };