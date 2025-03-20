'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { phantomConnect } from '@/utils/PhantomConnect';
import { logError, logInfo } from '@/utils/logger';

function WalletCallbackContent() {
    const searchParams = useSearchParams();
    
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

                // Handle the connection response
                const response = phantomConnect.handleConnectResponse(
                    data,
                    nonce,
                    phantomEncryptionPublicKey
                );

                logInfo('Wallet connected successfully', {
                    component: 'WalletCallback',
                    publicKey: response.public_key
                });

                // Redirect to home page after successful connection
                window.location.href = '/';
            } catch (error) {
                logError(error, {
                    component: 'WalletCallback',
                    action: 'wallet connection'
                });
                // Redirect to home page with error
                window.location.href = '/?error=connection_failed';
            }
        };

        handleWalletConnection();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Connecting to Wallet...</h1>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
            </div>
        </div>
    );
}

export default function WalletCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
                </div>
            </div>
        }>
            <WalletCallbackContent />
        </Suspense>
    );
}