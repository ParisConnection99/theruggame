'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { clusterApiUrl } from '@solana/web3.js';

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [isClient, setIsClient] = useState(false);
  
  // We need to use useState for wallets because we want to detect
  // if we're on mobile or desktop after component mounts
  const [wallets, setWallets] = useState([]);
  
  useEffect(() => {
    setIsClient(true);
    
    // Detect if user is on mobile device
    const isMobileDevice = () => {
      if (typeof navigator === 'undefined') return false;
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Detect if device is iOS
    const isIOSDevice = () => {
      if (typeof navigator === 'undefined') return false;
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    const isMobile = isMobileDevice();
    const isIOS = isIOSDevice();
    
    // Check if returning from wallet connection
    const checkWalletReturn = () => {
      const pendingConnection = localStorage.getItem('wallet_connect_pending');
      if (pendingConnection === 'true') {
        // Clear the pending flag
        localStorage.removeItem('wallet_connect_pending');
        
        // Check if we're within a reasonable timeframe (5 minutes)
        const timestamp = parseInt(localStorage.getItem('wallet_connect_timestamp') || '0');
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - timestamp < fiveMinutes) {
          console.log('Detected return from wallet connection');
          // We'll attempt a reconnection
          setTimeout(() => {
            console.log('Attempting to reconnect wallet after return');
            window.dispatchEvent(new Event('wallet-return-reconnect'));
          }, 1000); // Short delay to let things initialize
        } else {
          // Session probably expired
          localStorage.removeItem('wallet_connect_timestamp');
        }
      }
    };
    
    // Set up basic wallet adapters
    const walletAdapters = [new PhantomWalletAdapter()];
    
    // Add WalletConnect adapter based on device type
    try {
      // Configure WalletConnect differently for mobile vs desktop
      if (isMobile) {
        // On mobile, store info to detect return
        const handleWalletConnectionStart = () => {
          localStorage.setItem('wallet_connect_pending', 'true');
          localStorage.setItem('wallet_connect_timestamp', Date.now().toString());
        };
        
        // Listen for connection attempt to set the flags
        window.addEventListener('wallet-connect-start', handleWalletConnectionStart);
        
        // Check if we're returning from a connection
        checkWalletReturn();
        
        // For mobile, create wallet connect adapter with mobile-optimized settings
        const walletConnectAdapter = new WalletConnectWalletAdapter({
          network,
          options: {
            projectId: '9561050902e6bf6802cafcbb285d47ea',
            metadata: {
              name: 'The Rug Game',
              description: 'The #1 Memecoin Prediction Market',
              url: window.location.origin,
              icons: [`${window.location.origin}/images/logo1.png`]
            },
            relayUrl: 'wss://relay.walletconnect.com',
            // Use a dedicated callback page
            redirectUrl: `${window.location.origin}/wallet-callback`,
            storageOptions: {
              storageId: 'theruggame-wallet-connect'
            },
            qrcodeModalOptions: {
              mobileLinks: ['phantom'],
              desktopLinks: isIOS ? ['phantom'] : [],
              explorerRecommendedWalletIds: 'NONE',
              explorerExcludedWalletIds: '*'
            }
          }
        });
        
        // On mobile, put WalletConnect first for better experience
        walletAdapters.unshift(walletConnectAdapter);
      } else {
        // Desktop configuration - simpler and more standard
        const walletConnectAdapter = new WalletConnectWalletAdapter({
          network,
          options: {
            projectId: '9561050902e6bf6802cafcbb285d47ea',
            metadata: {
              name: 'The Rug Game',
              description: 'The #1 Memecoin Prediction Market',
              url: window.location.origin,
              icons: [`${window.location.origin}/images/logo1.png`]
            },
            relayUrl: 'wss://relay.walletconnect.com'
          }
        });
        
        walletAdapters.push(walletConnectAdapter);
      }
    } catch (error) {
      console.error("Error setting up WalletConnect adapter:", error);
    }
    
    setWallets(walletAdapters);
    
    // Add visibility change handler for mobile
    if (isMobile) {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log("Visibility changed - returning from wallet app");
          
          // If we've just become visible, check if we need to reconnect
          const pendingConnection = localStorage.getItem('wallet_connect_pending');
          if (pendingConnection === 'true') {
            // Short delay to let UI stabilize
            setTimeout(() => {
              window.dispatchEvent(new Event('wallet-return-reconnect'));
            }, 500);
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);
  
  // Note: You'll need to create a wallet-callback page that redirects back to your main app
  // This page should be very simple, just handling the redirect and preserving any query parameters

  // Handle rendering nothing on the server
  if (!isClient) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};