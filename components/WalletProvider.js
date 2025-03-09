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
    
    // Set up basic wallet adapters
    const walletAdapters = [new PhantomWalletAdapter()];
    
    // Add WalletConnect adapter for all devices
    // It provides a good fallback even for desktop users
    try {
      const walletConnectAdapter = new WalletConnectWalletAdapter({
        network,
        options: {
          projectId: '9561050902e6bf6802cafcbb285d47ea',
          metadata: {
            name: 'The Rug Game',
            description: 'The #1 Memecoin Prediction Market',
            url: "https://theruggame.fun",
            icons: ["https://theruggame.fun/images/logo1.png"] // Fix: icons must be an array
          },
          // Add relay URL to ensure good connectivity
          relayUrl: 'wss://relay.walletconnect.org'
        }
      });
      
      walletAdapters.push(walletConnectAdapter);
    } catch (error) {
      console.error("Error setting up WalletConnect adapter:", error);
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