'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';
import UserService from '@/services/UserService';
import { supabase } from '@/lib/supabaseClient';

const userService = new UserService(supabase);

export default function WalletCallbackPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const [status, setStatus] = useState('Connecting to Phantom Wallet...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function handleWalletCallback() {
      try {
        // Parse query parameters from the URL
        const queryParams = new URLSearchParams(window.location.search);
        const publicKey = queryParams.get('publicKey');
        const session = queryParams.get('session');
        const signature = queryParams.get('signature');

        if (!publicKey || !session || !signature) {
          throw new Error('Missing required connection details');
        }

        // Store the connection details in localStorage
        localStorage.setItem('phantomPublicKey', publicKey);
        localStorage.setItem('phantomSession', session);
        localStorage.setItem('phantomSignature', signature);
        localStorage.setItem('wallet_return_reconnect', 'true');
        localStorage.setItem('wallet_return_timestamp', Date.now().toString());

        // Check if auth is available
        if (!auth) {
          throw new Error('Authentication service unavailable');
        }

        setStatus('Checking user account...');
        
        // Check if user exists in Supabase
        const user = await userService.getUserByWallet(publicKey);
        
        if (!user) {
          setStatus('Creating new user...');
          // Create new user if doesn't exist
          await userService.createUser({
            wallet_ca: publicKey,
            username: publicKey.slice(0, 6)
          });
        }

        // Get Firebase custom token
        setStatus('Authenticating with Firebase...');
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(`Authentication error: ${data.error}`);
        }

        // Sign in with Firebase using the custom token
        await signInWithCustomToken(auth, data.token);
        setStatus('Authentication successful! Redirecting...');

        // Short delay before redirect to ensure state is updated
        setTimeout(() => {
          router.push('/');
        }, 1000);
        
      } catch (error) {
        console.error('Wallet callback error:', error);
        setError(error.message || 'Failed to connect wallet');
        
        // Still set the flag to trigger the header component's reconnection logic
        // This way the header can show proper error messages
        localStorage.setItem('wallet_return_reconnect', 'true');
        localStorage.setItem('wallet_return_timestamp', Date.now().toString());
        
        // Redirect after a delay to show the error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    }

    handleWalletCallback();
  }, [router, auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl max-w-md">
        <h1 className="text-2xl font-bold mb-4">{status}</h1>
        {error ? (
          <p className="text-red-400 mt-2">{error}</p>
        ) : (
          <p className="text-gray-400">Please wait while we complete the connection.</p>
        )}
      </div>
    </div>
  );
}