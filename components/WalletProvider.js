'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Mobile detection utility
const detectMobile = () => {
  return (
    typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);
  
  // Configure wallets based on device type
  const wallets = useMemo(() => {
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ];
    
    return adapters;
  }, []);

  // Configure wallet provider options with mobile-specific settings
  const walletProviderConfig = useMemo(() => ({
    wallets,
    autoConnect: true,
    // Special config for mobile deep linking
    onError: (error) => {
      console.error('Wallet connection error:', error);
    }
  }), [wallets]);

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