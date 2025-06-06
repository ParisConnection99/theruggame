"use server";
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { logError, logInfo } from '@/utils/logger';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import EncryptionService from '@/lib/EncryptionService';
import { createMemoInstruction } from '@solana/spl-memo';

global.Buffer = global.Buffer || Buffer;
// const RPC_ENDPOINT = clusterApiUrl('devnet');
// const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint
const QUICKNODE_RPC_ENDPOINT = process.env.QUICKNODE_RPC_ENDPOINT || 
  "https://few-dry-firefly.solana-mainnet.quiknode.pro/b33411d44f2ef89fb9aa9e2f929b6541debb9fc6/";

const SITE_WALLET_ADDRESS = 'FbhQc9Ri9spE17wnavuuuY1dGDwErAGyTYGJUTwsFvv1';
const APP_URL = "https://theruggame.fun";

const key = process.env.ENCRYPTION_KEY; // 32 characters (256 bits)
const iv = process.env.ENCRYPTION_IV; // 16 characters (128 bits)

// Initialize the encryption service
const encryptionService = new EncryptionService(key, iv);


const buildUrl = (path, params) =>
    `https://phantom.app/ul/v1/${path}?${params.toString()}`;

class PhantomConnect {
    decryptPayload = (data, nonce, sharedSecret) => {
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

    encryptPayload = (payload, sharedSecret) => {
        if (!sharedSecret) throw new Error("missing shared secret");

        const nonce = nacl.randomBytes(24);
        const encryptedPayload = nacl.box.after(
            Buffer.from(JSON.stringify(payload)),
            nonce,
            sharedSecret
        );

        return [nonce, encryptedPayload];
    };

    getUint8ArrayFromJsonString = (jsonString) => {
        try {
            // Parse the JSON string into an object (or an array of numbers)
            const storedSecretArray = JSON.parse(jsonString);

            // Convert the array of numbers into a Uint8Array
            const uint8Array = new Uint8Array(storedSecretArray);

            return uint8Array;
        } catch (error) {
            console.error('Error converting stored data to Uint8Array:', error.message);
            return new Uint8Array();  // Return an empty Uint8Array in case of an error
        }
    }

    async saveKeyPair() {
        this.dappKeyPair = nacl.box.keyPair();
        const id = uuidv4();

        const sessionData = {
            id: id,
            dapp_private: bs58.encode(this.dappKeyPair.secretKey),
            dapp_public: bs58.encode(this.dappKeyPair.publicKey),
            shared_secret: "",
            session: "",
            wallet_ca: ""
        }

        try {

            console.log('Created session now saving. ', sessionData);

            const response = await fetch('https://theruggame.fun/api/session', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sessionData)
            })

            if (!response.ok) {
                const errorData = await response.json();
            }
            return id;
        } catch (error) {
            console.log(`Error saving session data.`);
            throw error;
        }
    }

    async connect() {
        const id = await this.saveKeyPair();

        const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
            cluster: "mainnet-beta",
            //cluster: 'devnet',
            app_url: APP_URL,
            redirect_link: "https://theruggame.fun/wallet-callback",
        });

        const url = buildUrl("connect", params);

        return { deepLink: url, id: id };
    }

    async disconnect(key) {
        if (!key) {
            throw new Error('Public Key needed.');
        }

        const response = await fetch(`${APP_URL}/api/session?key=${key}`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });

        let session_data;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error('Error fetching session data.');
        }

        session_data = await response.json();

        const session = encryptionService.decrypt(session_data.session);
        const payload = {
            session
        };

        const decryptedSharedSecret = encryptionService.decrypt(session_data.shared_secret);
        const convertedSharedSecret = this.getUint8ArrayFromJsonString(decryptedSharedSecret);
        const [nonce, encryptedPayload] = this.encryptPayload(payload, convertedSharedSecret);

        const params = new URLSearchParams({
            dapp_encryption_public_key: session_data.dapp_public,
            nonce: bs58.encode(nonce),
            redirect_link: 'https://theruggame.fun/disconnect-callback',
            payload: bs58.encode(encryptedPayload),
        });

        const url = buildUrl("disconnect", params);

        return url;
    }

    async removeSessionData(key) {
        if (!key) {
            throw new Error('Public key needed to remove data.');
        }

        const deleteResponse = await fetch(`${APP_URL}/api/session?wallet_ca=${key}`, {
            method: 'DELETE',
            headers: { "Content-Type": "application/json" }
        });

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(`Error delete session data: ${errorData}`);
        }
    }

    async signAndSendTransaction(betAmount, publicKey, key) {
        const transaction = await this.createTransferTransaction(betAmount, publicKey, key);

        if (!publicKey) {
            throw new Error('Public Key needed to create transaction.');
        }

        console.log('Sign and send transaction: ',publicKey);

        const response = await fetch(`${APP_URL}/api/session?key=${publicKey}`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });

        let session_data;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error('Error fetching session data.');
        }

        session_data = await response.json();

        const session = encryptionService.decrypt(session_data.session);

        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
        });

        const payload = {
            session,
            transaction: bs58.encode(serializedTransaction),
        };

        const decryptedSharedSecret = encryptionService.decrypt(session_data.shared_secret);
        const convertedSharedSecret = this.getUint8ArrayFromJsonString(decryptedSharedSecret);
        const [nonce, encryptedPayload] = this.encryptPayload(payload, convertedSharedSecret);

        const params = new URLSearchParams({
            dapp_encryption_public_key: session_data.dapp_public,
            nonce: bs58.encode(nonce),
            redirect_link: 'https://theruggame.fun/market-callback',
            payload: bs58.encode(encryptedPayload),
        });

        const url = buildUrl("signAndSendTransaction", params);

        return url;
    }

    createTransferTransaction = async (amount, publicKey, nonce) => {
        if (!publicKey) throw new Error("missing public key from user");

        publicKey = new PublicKey(publicKey);

        //const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const connection = new Connection(QUICKNODE_RPC_ENDPOINT, {
          commitment: "confirmed",
          confirmTransactionInitialTimeout: 60000, // 60 seconds
          disableRetryOnRateLimit: false
        });

        let transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(SITE_WALLET_ADDRESS),
                lamports: Math.round(amount * LAMPORTS_PER_SOL),
            })
        );

        transaction.add(
            createMemoInstruction(`${nonce}`, [publicKey])
        );

        transaction.feePayer = publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        return transaction;
    };

    async handleConnectResponse(data, nonce, phantomEncryptionPublicKey, sessionId) {
        const response = await fetch(`${APP_URL}/api/session?id=${sessionId}`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });

        let session_data;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error('Error fetching session data.');
        }

        session_data = await response.json();

        const sharedSecret = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            bs58.decode(session_data.dapp_private)
        );

        const decryptedData = this.decryptPayload(data, nonce, sharedSecret);
        const convertedSharedSecret = Array.from(sharedSecret);
        const encryptedSession = encryptionService.encrypt(decryptedData.session);

        const sharedSecretJsonString = JSON.stringify(convertedSharedSecret);
        const encryptedSharedSecret = encryptionService.encrypt(sharedSecretJsonString);

        const newSession = {
            ...session_data,
            session: encryptedSession,
            shared_secret: encryptedSharedSecret,
            wallet_ca: decryptedData.public_key
        }

        const updateResponse = await fetch(`${APP_URL}/api/session`, {
            method: 'PATCH',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: session_data.id,
                session: newSession
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error('Error updating session data.');
        }
        return { publicKey: decryptedData.public_key };
    }
}

export default PhantomConnect;