'use client';

import React, { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(() => {
    console.log("Initializing wallet adapters");
    // Create the adapter with logging
    const phantomAdapter = new PhantomWalletAdapter();
    console.log("Phantom adapter created:", phantomAdapter);
    return [phantomAdapter];
  }, []);
  
  // Specific options with logging
  const walletProviderConfig = {
    wallets,
    autoConnect: false,
    onError: (error) => {
      console.error('Wallet adapter error:', error);
    }
  };
  
  useEffect(() => {
    // Check if Phantom is actually available in the window
    if (typeof window !== 'undefined') {
      console.log("Window solana object:", window.solana);
      console.log("Is Phantom available:", window.solana?.isPhantom);
    }
  }, []);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider {...walletProviderConfig}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};