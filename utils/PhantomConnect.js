import nacl from 'tweetnacl';
import bs58 from 'bs58';
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
        // Initialize with stored keypair or create new one
        const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
        const storedPublicKey = localStorage.getItem('dappEncryptionPublicKey');

        if (storedPrivateKey && storedPublicKey) {
            this.dappKeyPair = {
                publicKey: bs58.decode(storedPublicKey),
                secretKey: bs58.decode(storedPrivateKey)
            };
        } else {
            this.dappKeyPair = nacl.box.keyPair();
            localStorage.setItem('dappEncryptionPublicKey', bs58.encode(this.dappKeyPair.publicKey));
            localStorage.setItem('dappEncryptionPrivateKey', bs58.encode(this.dappKeyPair.secretKey));
        }
    }

    connect() {
        const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
            cluster: "mainnet-beta",
            app_url: "https://theruggame.fun",
            redirect_link: "https://theruggame.fun/wallet-callback",
        });

        const url = buildUrl("connect", params);
        window.open(url, '_blank');
    }

    disconnect() {
        const session = localStorage.getItem('phantomSession');
        const sharedSecret = localStorage.getItem('phantomSharedSecret');

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
        window.open(url, '_blank');
    }

    handleConnectResponse(data, nonce, phantomEncryptionPublicKey) {
        const sharedSecret = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            this.dappKeyPair.secretKey
        );

        const decryptedData = decryptPayload(data, nonce, sharedSecret);
        
        // Store for later use
        localStorage.setItem('phantomSharedSecret', bs58.encode(sharedSecret));
        localStorage.setItem('phantomPublicKey', decryptedData.public_key);
        localStorage.setItem('phantomSession', decryptedData.session);

        return decryptedData;
    }
}

export const phantomConnect = new PhantomConnect();
export { decryptPayload, encryptPayload, buildUrl }; 