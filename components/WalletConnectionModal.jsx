'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected } = useWallet();
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle', 'connecting', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const connectionTimeoutRef = useRef(null);

  // Reset status and clear any existing timeouts when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConnectionStatus('idle');
      setErrorMessage('');
    }
    
    return () => {
      // Clean up any timeouts when component unmounts or modal closes
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Track wallet connection states
  useEffect(() => {
    // Clear any existing timeout when connection state changes
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (connecting) {
      setConnectionStatus('connecting');
      
      // Set a timeout to show an error if connection takes too long (5 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === 'connecting') {
          setConnectionStatus('error');
          setErrorMessage('Connection is taking longer than expected. Please check your wallet extension for any pending approval requests or try again.');
        }
      }, 5000); // Reduced from 10-15 seconds to 5 seconds
    } else if (connected) {
      setConnectionStatus('success');
      // Auto close after successful connection with a slight delay
      const timer = setTimeout(() => onClose(), 1000); // Reduced from 1500ms to 1000ms
      return () => clearTimeout(timer);
    }
  }, [connecting, connected, onClose, connectionStatus]);

  if (!isOpen) return null;

  const handleWalletSelect = (walletName) => {
    try {
      // Reset any previous errors
      setConnectionStatus('connecting');
      setErrorMessage('');
      
      // Start new connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      connectionTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === 'connecting') {
          setConnectionStatus('error');
          setErrorMessage('Connection is taking longer than expected. Please check your wallet extension for any pending approval requests or try again.');
        }
      }, 5000);
      
      select(walletName);
    } catch (error) {
      console.error('Error selecting wallet:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Failed to connect to wallet');
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    }
  };

  const wallets = [
    { 
      name: 'Phantom', 
      detected: true, 
      logo: '/images/phantom_wallet.png'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '24rem' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect a wallet on Solana</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        
        {/* Connection Status Indicator */}
        {connectionStatus === 'connecting' && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300 flex items-center">
            <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Connecting to wallet... Please check your wallet extension</span>
          </div>
        )}
        
        {connectionStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg text-green-300 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Connection successful!</span>
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg text-red-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Connection failed</span>
            </div>
            {errorMessage && <p className="mt-1 text-sm">{errorMessage}</p>}
            <button 
              onClick={() => {
                setConnectionStatus('idle');
                setErrorMessage('');
              }}
              className="mt-2 px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )}
        
        <div className="space-y-2">
          {wallets.map((wallet) => (
            <div 
              key={wallet.name}
              onClick={() => wallet.detected && connectionStatus !== 'connecting' && handleWalletSelect(wallet.name)}
              className={`
                flex items-center gap-3 
                p-3 rounded-lg 
                ${wallet.detected 
                  ? 'cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white' 
                  : 'bg-gray-700 text-gray-400 opacity-50'}
                ${connectionStatus === 'connecting' ? 'pointer-events-none opacity-70' : ''}
              `}
            >
              <Image 
                src={wallet.logo} 
                alt={`${wallet.name} logo`} 
                width={24} 
                height={24} 
                className="rounded-full"
              />
              <div className="flex justify-between flex-1">
                <span>{wallet.name}</span>
                <span>{wallet.detected ? 'Detected' : 'Not Detected'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;