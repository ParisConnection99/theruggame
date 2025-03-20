'use client';

import React from 'react';
import { buildUrl } from '@/utils/PhantomConnect';
import { logInfo, logError } from '@/utils/logger';

export default function MobileWallet({ 
    onConnectionStatusChange, 
    onError, 
    onCloseMenu 
}) {
    const handleMobileWalletConnection = async () => {
        try {
            onConnectionStatusChange('connecting');
            window.localStorage.setItem('wallet_connect_pending', 'true');
            window.localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

            const params = new URLSearchParams({
                dapp_encryption_public_key: window.localStorage.getItem('dappEncryptionPublicKey'),
                cluster: "mainnet-beta",
                app_url: 'https://theruggame.fun',
                redirect_link: 'https://theruggame.fun/wallet-callback'
            });

            const url = buildUrl("connect", params);

            logInfo('Connect deeplink created', {
                component: 'MobileWallet',
                url: url
            });

            window.location.href = url;

        } catch (error) {
            logError(error, {
                component: 'MobileWallet',
                action: 'Error during mobile wallet connection'
            });
            onConnectionStatusChange('error');
            onError(error.message || 'Connection failed, please try again');
        }
    };

    return (
        <div
            onClick={() => {
                handleMobileWalletConnection();
                onCloseMenu();
            }}
            className="text-white text-md hover:scale-105 hover:underline cursor-pointer relative"
        >
            CONNECT WALLET
        </div>
    );
} 