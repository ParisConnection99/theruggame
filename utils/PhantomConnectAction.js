"use server";

import PhantomConnect from '@/utils/PhantomConnect';

export async function handlePhantomConnect() {
    const phantomConnect = new PhantomConnect();

     console.log('INitialised phantom connect ready to connect.');

    try {
        const result = await phantomConnect.connect();
        return result;
    } catch (error) {
        console.error('Error in PhantomConnect:', error);
        throw new Error('Failed to handle Phantom Connect');
    }
}

export async function handlePhantomConnectionResponse(data, nonce, phantomEncryptionPublicKey, sessionId) {
    const phantom = new PhantomConnect();

    try {
        const result = await phantom.handleConnectResponse(data, nonce, phantomEncryptionPublicKey, sessionId);
        return result;
    } catch (error) {
        console.error('Error in PhantomConnect:', error);
        throw new Error('Failed to handle Phantom Connect');
    }
}

export async function handlePhantomDisconnection(key) {
    const phantomConnect = new PhantomConnect();

    try {
        await phantomConnect.disconnect(key);
    } catch (error) {
        console.error('Error disconnecting phantom');
        throw error;
    }
}