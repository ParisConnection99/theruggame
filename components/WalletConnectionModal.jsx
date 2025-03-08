'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

// Simplified mobile detection
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected } = useWallet();
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle', 'connecting', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Reset status when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConnectionStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Track wallet connection states
  useEffect(() => {
    if (connecting) {
      setConnectionStatus('connecting');
    } else if (connected) {
      setConnectionStatus('success');
      // Auto close after successful connection with a slight delay
      const timer = setTimeout(() => onClose(), 1000);
      return () => clearTimeout(timer);
    }
  }, [connecting, connected, onClose]);

  // Handle connection timeout
  useEffect(() => {
    let timeoutId;
    
    if (connectionStatus === 'connecting') {
      // Longer timeout (20 seconds) to give more time for connection
      timeoutId = setTimeout(() => {
        if (connectionStatus === 'connecting') {
          setConnectionStatus('error');
          setErrorMessage(isMobile 
            ? 'Connection timed out. Please ensure Phantom wallet app is installed and try again.' 
            : 'Connection is taking longer than expected. Please check Phantom extension for pending requests.');
        }
      }, 20000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connectionStatus, isMobile]);

  if (!isOpen) return null;

  const handleConnectPhantom = () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage('');
      select('Phantom');
    } catch (error) {
      console.error('Error selecting wallet:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Failed to connect to Phantom wallet');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ minWidth: '24rem' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect Phantom Wallet</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        
        {/* Mobile-specific message */}
        {isMobile && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300">
            <p>You're connecting from a mobile device. This will open your Phantom wallet app if installed.</p>
          </div>
        )}
        
        {/* Connection Status Indicator */}
        {connectionStatus === 'connecting' && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300 flex items-center">
            <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>{isMobile ? 'Opening Phantom app...' : 'Connecting to Phantom... Check your wallet extension'}</span>
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
        
        <div className="mt-4">
          {connectionStatus !== 'connecting' && (
            <div 
              onClick={handleConnectPhantom}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white"
            >
              <Image 
                src="/images/phantom_wallet.png" 
                alt="Phantom logo" 
                width={24} 
                height={24} 
                className="rounded-full"
              />
              <div className="flex justify-between flex-1">
                <span>Phantom</span>
                <span>Connect</span>
              </div>
            </div>
          )}
          
          {/* Help text for mobile users */}
          {isMobile && (
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300">
              <p className="text-sm">
                Make sure you have the Phantom wallet app installed on your device.
                If you don't have it, you can download it from the App Store or Play Store.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;