'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletCallback() {
  const router = useRouter();
  
  useEffect(() => {
    // Verify we have a pending connection
    const pendingConnection = localStorage.getItem('wallet_connect_pending');
    
    console.log('Processing wallet callback', pendingConnection);
    
    // Short delay to ensure localStorage is available and router is ready
    setTimeout(() => {
      // Keep the flag set - we'll clear it after reconnection attempt
      // Redirect back to main page
      router.push('/');
    }, 800);
  }, [router]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-white text-xl">
        Returning to application...
      </div>
    </div>
  );
}