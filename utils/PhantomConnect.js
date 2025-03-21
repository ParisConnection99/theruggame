import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { logError, logInfo } from '@/utils/logger';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Utility functions for encryption/decryption
const decryptPayload = (data, nonce, sharedSecret) => {
    if (!sharedSecret) throw new Error("missing shared secret");

    const decryptedData = nacl.box.open.after(
        bs58.decode(data),
        bs58.decode(nonce),
        sharedSecret
    );
    if (!decryptedData) {
        throw new Error("Unable to decrypt data");
    }
    return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
};

const encryptPayload = (payload, sharedSecret) => {
    if (!sharedSecret) throw new Error("missing shared secret");

    const nonce = nacl.randomBytes(24);
    const encryptedPayload = nacl.box.after(
        Buffer.from(JSON.stringify(payload)),
        nonce,
        sharedSecret
    );

    return [nonce, encryptedPayload];
};

const buildUrl = (path, params) =>
    `https://phantom.app/ul/v1/${path}?${params.toString()}`;

class PhantomConnect {
    constructor() {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            return;
        }

        // Initialize with stored keypair or create new one
        const storedPrivateKey = window.localStorage.getItem('dappEncryptionPrivateKey');
        const storedPublicKey = window.localStorage.getItem('dappEncryptionPublicKey');

        if (storedPrivateKey && storedPublicKey) {
            try {
                // Use existing keypair
                const existingKeypair = nacl.box.keyPair.fromSecretKey(bs58.decode(storedPrivateKey));
                this.dappKeyPair = existingKeypair;
                
                logInfo('Using existing keypair', {
                    component: 'PhantomConnect',
                    publicKey: storedPublicKey
                });
            } catch (error) {
                logError(error, {
                    component: 'PhantomConnect',
                    action: 'loading existing keypair'
                });
                // If there's an error with stored keys, remove them and generate new ones
                window.localStorage.removeItem('dappEncryptionPrivateKey');
                window.localStorage.removeItem('dappEncryptionPublicKey');
                this.generateNewKeypair();
            }
        } else {
            // No existing keypair, generate new one
            this.generateNewKeypair();
        }
    }

    generateNewKeypair() {
        if (typeof window === 'undefined') {
            return;
        }

        this.dappKeyPair = nacl.box.keyPair();
        window.localStorage.setItem('dappEncryptionPublicKey', bs58.encode(this.dappKeyPair.publicKey));
        window.localStorage.setItem('dappEncryptionPrivateKey', bs58.encode(this.dappKeyPair.secretKey));
        
        logInfo('Generated new keypair', {
            component: 'PhantomConnect',
            publicKey: bs58.encode(this.dappKeyPair.publicKey)
        });
    }

    connect() {
        const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
            cluster: "mainnet-beta",
            app_url: "https://theruggame.fun",
            redirect_link: "https://theruggame.fun/wallet-callback",
        });

        const url = buildUrl("connect", params);
        try {
            window.location.href = url;
        } catch (error) {
            logError(error, {
                component: 'PhantomConnect',
                action: 'connect navigation'
            });
            throw error;
        }
    }

    disconnect() {
        const session = window.localStorage.getItem('phantomSession');
        const sharedSecret = window.localStorage.getItem('phantomSharedSecret');

        if (!session || !sharedSecret) {
            throw new Error("Missing session or shared secret");
        }

        const payload = {
            session
        };

        const [nonce, encryptedPayload] = encryptPayload(payload, bs58.decode(sharedSecret));

        const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
            nonce: bs58.encode(nonce),
            redirect_link: 'https://theruggame.fun/disconnect-callback',
            payload: bs58.encode(encryptedPayload),
        });

        const url = buildUrl("disconnect", params);
        try {
            window.location.href = url;
        } catch (error) {
            logError(error, {
                component: 'PhantomConnect',
                action: 'disconnect navigation'
            });
            throw error;
        }
    }

    handleConnectResponse(data, nonce, phantomEncryptionPublicKey) {
        const sharedSecret = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            this.dappKeyPair.secretKey
        );

        const decryptedData = decryptPayload(data, nonce, sharedSecret);
        
        // Store for later use
        window.localStorage.setItem('phantomSharedSecret', bs58.encode(sharedSecret));
        window.localStorage.setItem('phantomPublicKey', decryptedData.public_key);
        window.localStorage.setItem('phantomSession', decryptedData.session);

        logInfo('Decrypted Data', {
            session: decryptedData.session,
            publicKey: decryptedData.public_key
        });

        return { session: decryptedData.session, publicKey: decryptedData.public_key };
    }
}

// Export both the instance and the buildUrl function
export const phantomConnect = typeof window !== 'undefined' ? new PhantomConnect() : null;
export { buildUrl }; 