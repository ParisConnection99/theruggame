'use client';
import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorLog } from '@/utils/ErrorLog';

function DisconnectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleDisconnect = async () => {
            try {
                // Get encrypted data and nonce from URL params
                const errorCode = searchParams.get('errorCode');

                // Check if there was an error or missing data
                if (errorCode) {
                    throw new Error(errorCode || 'Invalid disconnect response');
                }

                localStorage.removeItem('session_id');

                window.dispatchEvent(new CustomEvent('disconnect-event', {
                    detail: { disconnect: 'true' }
                }));

                setTimeout(() => {
                    router.push('/');
                }, 200);

            } catch (error) {
                await errorLog("DISCONNECT_CALLBACK_ERROR",
                    error.message || 'Error object with empty message',
                    error.stack || "no stack trace available",
                    "DISCONNECT-CALLBACK",
                    "SERIOUS");

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
