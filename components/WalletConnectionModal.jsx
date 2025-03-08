'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

export const WalletConnectionModal = ({ isOpen, onClose }) => {
  const { select, connecting, connected } = useWallet();
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [phantomDetected, setPhantomDetected] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConnectionAttempted(false);
      console.log("Modal opened, connection state reset");
    }
  }, [isOpen]);

  // Check if Phantom is actually available
  useEffect(() => {
    const checkPhantomAvailability = () => {
      const isPhantomInstalled = window.solana && window.solana.isPhantom;
      console.log("Phantom installed check:", isPhantomInstalled);
      setPhantomDetected(isPhantomInstalled);
      
      // Additional details about the window.solana object
      if (window.solana) {
        console.log("Window.solana details:", {
          isPhantom: window.solana.isPhantom,
          isConnected: window.solana.isConnected,
          // Log any other properties that might be useful
        });
      }
    };
    
    if (isOpen) {
      checkPhantomAvailability();
    }
  }, [isOpen]);

  // Monitor connection states
  useEffect(() => {
    console.log("Connection state:", { connecting, connected, connectionAttempted });
    
    if (connected) {
      console.log("Connection successful!");
      onClose();
    }
  }, [connecting, connected, connectionAttempted, onClose]);

  if (!isOpen) return null;

  const handleConnectPhantom = () => {
    console.log("Connect button clicked");
    setConnectionAttempted(true);
    
    try {
      console.log("Attempting to select Phantom wallet");
      select('Phantom');
      console.log("select() function called successfully");
    } catch (error) {
      console.error("Error selecting wallet:", error);
    }
  };

  const tryDirectConnection = async () => {
    console.log("Trying direct Phantom connection");
    
    try {
      if (window.solana && window.solana.isPhantom) {
        console.log("Connecting directly to Phantom...");
        
        // Try connecting directly
        const resp = await window.solana.connect();
        console.log("Direct connection response:", resp);
        
        if (resp.publicKey) {
          console.log("Connected directly! Public key:", resp.publicKey.toString());
          // Manually close modal and update UI as needed
          onClose();
        }
      } else {
        console.log("Phantom not detected for direct connection");
      }
    } catch (err) {
      console.error("Error with direct connection:", err);
    }
  };

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
        
        {/* Phantom Detection Status */}
        <div className={`mb-4 p-3 rounded-lg ${phantomDetected ? 'bg-green-900 bg-opacity-30 border border-green-500 text-green-300' : 'bg-red-900 bg-opacity-30 border border-red-500 text-red-300'}`}>
          <div className="flex items-center">
            {phantomDetected ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Phantom wallet detected</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Phantom wallet not detected</span>
              </>
            )}
          </div>
          
          {!phantomDetected && (
            <p className="mt-1 text-sm">
              Please make sure the Phantom wallet extension is installed and enabled.
            </p>
          )}
        </div>
        
        {/* Connection Status */}
        {connecting && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg text-blue-300 flex items-center">
            <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Connecting to Phantom... Check your wallet extension</span>
          </div>
        )}
        
        {connectionAttempted && !connecting && !connected && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg text-red-300">
            <p>No response from wallet. Make sure Phantom is installed and unlocked.</p>
            <button 
              onClick={handleConnectPhantom}
              className="mt-2 px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )}
        
        <div className="space-y-2">
          {/* Standard connection through wallet adapter */}
          <div 
            onClick={handleConnectPhantom}
            className={`flex items-center gap-3 p-3 rounded-lg ${phantomDetected ? 'cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white' : 'bg-gray-700 text-gray-400 opacity-50'}`}
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
              <span>{phantomDetected ? 'Connect' : 'Not Detected'}</span>
            </div>
          </div>
          
          {/* Direct connection button as fallback */}
          {phantomDetected && (
            <button 
              onClick={tryDirectConnection}
              className="w-full mt-4 px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded text-white flex items-center justify-center"
            >
              <span>Try Direct Connection</span>
            </button>
          )}
        </div>
        
        {/* Debug information */}
        <div className="mt-4 p-3 bg-gray-800 rounded-lg text-gray-300 text-xs">
          <p>Debug Info:</p>
          <p>Phantom detected: {phantomDetected ? 'Yes' : 'No'}</p>
          <p>Connection attempted: {connectionAttempted ? 'Yes' : 'No'}</p>
          <p>Connecting state: {connecting ? 'Yes' : 'No'}</p>
          <p>Connected state: {connected ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;