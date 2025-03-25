'use client';
import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';

function DisconnectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleDisconnect = async () => {
            try {
                // Get encrypted data and nonce from URL params
                const errorCode = searchParams.get('errorCode');
                const errorMessage = searchParams.get('errorMessage');

                logInfo('Disconnect callback - all params received:', {
                    component: 'DisconnectCallbackPage',
                    allParams: Object.fromEntries(searchParams.entries()),
                    searchParamsKeys: Array.from(searchParams.keys()),
                    rawURL: window.location.href
                });

                // Check if there was an error or missing data
                if (errorCode) {
                    logInfo('Disconnect error', {
                        component: 'Disconnect callback',
                        error: errorMessage,
                        errorCode: errorCode
                    });
                    throw new Error(errorCode || 'Invalid disconnect response');
                }

                // Decrypt and verify the response
                // ... (we can add decryption logic if Phantom sends encrypted response)

                // remove session data

                // If we get here, disconnect was successful
                // localStorage.removeItem('phantomPublicKey');
                // localStorage.removeItem('phantomSession');
                // localStorage.removeItem('wallet_connect_pending');
                // localStorage.removeItem('wallet_connect_timestamp');

               // window.dispatchEvent(new Event('wallet-disconnect-event'));

                logInfo('Disconnect successful', {
                    component: 'DisconnectCallbackPage'
                });

                setTimeout(() => {
                    router.push('/');
                }, 500);

            } catch (error) {
                logError(error, {
                    component: 'DisconnectCallbackPage',
                    action: 'disconnect verification'
                });
                
                // Don't clear data if disconnect wasn't authenticated
                router.push('/?error=disconnect_failed');
            }
        };

        handleDisconnect();
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-white">Processing disconnect...</p>
        </div>
    );
}

export default function DisconnectCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white">Loading...</p>
            </div>
        }>
            <DisconnectHandler />
        </Suspense>
    );
}
