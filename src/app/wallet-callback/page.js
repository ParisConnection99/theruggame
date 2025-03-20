'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';
import { phantomConnect } from '@/utils/PhantomConnect';

export default function WalletCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const phantomEncryptionPublicKey = searchParams.get("phantom_encryption_public_key");
                const data = searchParams.get("data");
                const nonce = searchParams.get("nonce");

                if (!phantomEncryptionPublicKey || !data || !nonce) {
                    throw new Error("Missing required parameters");
                }

                const decryptedData = phantomConnect.handleConnectResponse(
                    data,
                    nonce,
                    phantomEncryptionPublicKey
                );

                window.dispatchEvent(new CustomEvent('wallet-callback-event', {
                    detail: decryptedData
                }));

                setTimeout(() => {
                    router.push('/');
                }, 500);

            } catch (error) {
                logError(error, {
                    component: 'WalletCallbackPage',
                    action: 'processing callback'
                });
                router.push('/?error=wallet_callback_failed');
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-white">Connecting wallet...</p>
        </div>
    );
}