// WalletContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletContext = createContext();

export function WalletProvider({ children }) {
    const { connected, publicKey, disconnect } = useWallet();
    const [isEffectivelyConnected, setIsEffectivelyConnected] = useState(false);

    // Update isEffectivelyConnected when connected changes
    useEffect(() => {
        setIsEffectivelyConnected(connected);
    }, [connected]);

    // Handle manual disconnection
    const handleDisconnect = async () => {
        await disconnect();
        setIsEffectivelyConnected(false);
    };

    return (
        <WalletContext.Provider
            value={{
                isEffectivelyConnected,
                handleDisconnect,
                publicKey,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWalletContext() {
    return useContext(WalletContext);
}