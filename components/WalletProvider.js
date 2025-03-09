"use client";

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
    
    // Check if we're on mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Set up appropriate wallet adapters
    const walletAdapters = [new PhantomWalletAdapter()];
    
    // Add WalletConnect adapter for better mobile support
    if (isMobileDevice) {
      try {
        // Note: You'll need to register for a WalletConnect project ID
        const walletConnectAdapter = new WalletConnectWalletAdapter({
          network,
          options: {
            projectId: '9561050902e6bf6802cafcbb285d47ea', // Replace with your WalletConnect project ID
            metadata: {
              name: 'The Rug Game',
              description: 'The #1 Memecoin Prediction Market',
              url: "https://theruggame.fun",
              icons: `https://theruggame.fun/images/logo1.png`
            }
          }
        });
        
        walletAdapters.push(walletConnectAdapter);
      } catch (error) {
        console.error("Error setting up WalletConnect adapter:", error);
      }
    }
    
    setWallets(walletAdapters);
  }, []);

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