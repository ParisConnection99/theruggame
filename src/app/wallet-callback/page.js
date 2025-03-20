'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default function WalletCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      logInfo('Connecting wallet', {
        component: 'WalletCallbackPage',
        action: 'connecting wallet'
      });

      const queryParams = new URLSearchParams(window.location.search);
      const phantomEncryptionPublicKey = queryParams.get('phantom_encryption_public_key');
      const nonce = queryParams.get('nonce');
      const encryptedData = queryParams.get('data');

      if (!phantomEncryptionPublicKey || !nonce || !encryptedData) {
        throw new Error('Missing required connection parameters');
      }

      logInfo('Connection details stored', {
        component: 'WalletCallbackPage',
        phantomEncryptionPublicKey: phantomEncryptionPublicKey,
        nonce: nonce,
        encryptedData: encryptedData
      });

      // Get our dapp's keypair
      const dappPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
      
      if (!dappPrivateKey) {
        throw new Error('Encryption private key not found in localStorage');
      }

      logInfo('Stored Private Key', {
        component: 'WalletCallBackPage',
        fetchedPrivateKey: dappPrivateKey
      });

      const dappPrivateKeyBytes = bs58.decode(dappPrivateKey);

      logInfo('Decoded Stored Private Key', {
        component: 'WalletCallBackPage',
        encoded_dapp_private_key: dappPrivateKeyBytes
      });

      // Create shared secret using Phantom's public key and our private key
      const sharedSecret = nacl.box.before(
        bs58.decode(phantomEncryptionPublicKey),
        dappPrivateKeyBytes
      );

      // Store the shared secret for later use
      localStorage.setItem('phantomSharedSecret', bs58.encode(sharedSecret));

      // Decrypt the payload using the shared secret
      const decryptedData = nacl.box.open.after(
        bs58.decode(encryptedData),
        bs58.decode(nonce),
        sharedSecret
      );

      if (!decryptedData) {
        throw new Error('Failed to decrypt data');
      }

      // Parse the decrypted JSON data
      const { public_key, session } = JSON.parse(new TextDecoder().decode(decryptedData));

      if (public_key && session) {
        // Save public key
        localStorage.setItem('phantomPublicKey', public_key);
        
        // Save session directly as string
        localStorage.setItem('phantomSession', session);

        logInfo('Connection details stored', {
          component: 'WalletCallbackPage',
          publicKey: public_key,
          hasSession: !!session,
          sessionLength: session.length
        });

        // Dispatch custom event with wallet data before redirecting
        const walletEvent = new CustomEvent('wallet-callback-event', {
          detail: {
            publicKey: public_key,
            session
          }
        });

        console.log('Dispatching wallet-callback-event with public key:', public_key);

        logInfo('Dispatching wallet callback-event', {
          component: 'WalletCallBackPage',
          publicKey: public_key
        });

        window.dispatchEvent(walletEvent);

        // Add a verification log
        const savedSession = localStorage.getItem('phantomSession');
        logInfo('Verifying saved session', {
          component: 'WalletCallbackPage',
          sessionSaved: !!savedSession,
          sessionLength: savedSession?.length
        });

        // Short delay to ensure event is processed before redirecting
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        throw new Error('Missing required data in decrypted payload');
      }
    } catch (error) {
      logError(error, {
        component: 'WalletCallbackPage',
        action: 'processing wallet callback'
      });
      console.error('Error processing wallet callback:', error.message);
      router.push('/');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-blue-900">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Connecting Wallet</h1>
        <p>Please wait while we complete your connection...</p>
      </div>
    </div>
  );
}