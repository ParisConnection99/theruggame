// app/wallet-callback/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Parse query parameters from the URL
    const queryParams = new URLSearchParams(window.location.search);
    const publicKey = queryParams.get('publicKey');
    const session = queryParams.get('session');
    const signature = queryParams.get('signature');

    if (publicKey && session && signature) {
      // Store the connection details in localStorage
      localStorage.setItem('phantomPublicKey', publicKey);
      localStorage.setItem('phantomSession', session);
      localStorage.setItem('phantomSignature', signature);

      // Redirect the user to the main app page
      router.push('/');
    } else {
      // If any of the required parameters are missing, show an error
      console.error('Missing required connection details.');
      router.push('/');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Phantom Wallet...</h1>
        <p className="text-gray-400">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
}