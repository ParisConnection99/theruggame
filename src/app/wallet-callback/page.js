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
      // Instead of dispatching an event
      localStorage.setItem('phantomPublicKey', publicKey);
      localStorage.setItem('phantomSession', session);
      localStorage.setItem('phantomSignature', signature);
      localStorage.setItem('wallet_return_reconnect', 'true');
      localStorage.setItem('wallet_return_timestamp', Date.now().toString());

      // Redirect the user to the main app page
      router.push('/');
    } else {
      // If any of the required parameters are missing, show an error
      console.error('Missing required connection details.');
      router.push('/');
    }
  }, [router]);

  return (
    <div></div>
  );
}