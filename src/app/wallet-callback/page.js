'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
//import { handlePhantomConnectionResponse } from '@/utils/PhantomConnectAction';
import { logError, logInfo } from '@/utils/logger';
import { useRouter } from 'next/navigation';

function WalletCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // const handleConnectResponse = async (data, nonce, phantomEncryptionPublicKey, sessionId) => {
    //     try {
    //         const response = await handlePhantomConnectionResponse(data, nonce, phantomEncryptionPublicKey, sessionId);
    //         return response;
    //     } catch (error) {
    //         console.error('Error handling connect response: ',error);
    //     }
    // };
    
    useEffect(() => {
        const handleWalletConnection = async () => {
            try {
                // Get query parameters
                const data = searchParams.get('data');
                const nonce = searchParams.get('nonce');
                const phantomEncryptionPublicKey = searchParams.get('phantom_encryption_public_key');

                if (!data || !nonce || !phantomEncryptionPublicKey) {
                    throw new Error('Missing required parameters');
                }

                const sessionId = localStorage.getItem('session_id');
                if (!sessionId) {
                    throw new Error('Session ID is missing');
                }
                // Handle the connection response
                // const { session, publicKey } = await handleConnectResponse(
                //     data,
                //     nonce,
                //     phantomEncryptionPublicKey,
                //     sessionId
                // );

                // // // Dispatch event to notify header
                // window.dispatchEvent(new CustomEvent('wallet-callback-event', {
                //     detail: { publicKey: publicKey, session: session }
                // }));

                // await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay


                // Redirect to home page after successful connection
                router.push('/');
            } catch (error) {
                logError(error, {
                    component: 'WalletCallback',
                    action: 'wallet connection'
                });
                // Redirect to home page with error
                router.push('/?error=connection_failed');
            }
        };

        handleWalletConnection();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Connecting to Wallet...</h1>
            </div>
        </div>
    );
}

export default function WalletCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
                </div>
            </div>
        }>
            <WalletCallbackContent />
        </Suspense>
    );
}