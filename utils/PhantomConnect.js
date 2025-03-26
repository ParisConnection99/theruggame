"use server";
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { logError, logInfo } from '@/utils/logger';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import EncryptionService from '@/lib/EncryptionService';
//import { serviceRepo } from '@/services/ServiceRepository';
global.Buffer = global.Buffer || Buffer;
const RPC_ENDPOINT = clusterApiUrl('devnet');
const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint
const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';
const APP_URL = "https://theruggame.fun";

const key = '0123456789abcdef0123456789abcdef'; // 32 characters (256 bits)
const iv = 'abcdef9876543210'; // 16 characters (128 bits)

// Initialize the encryption service
const encryptionService = new EncryptionService(key, iv);
/*
- id == users id
- Shared Secret
- dapp Encryption Key Pair
- session
- timestamp
*/

// Utility functions for encryption/decryption


const buildUrl = (path, params) =>
    `https://phantom.app/ul/v1/${path}?${params.toString()}`;

class PhantomConnect {
    constructor() {
        // // Check if we're in a browser environment
        // if (typeof window === 'undefined') {
        //     return;
        // }

        // // First check the database to see if 

        // // check first
        // // Initialize with stored keypair or create new one
        // const storedPrivateKey = window.localStorage.getItem('dappEncryptionPrivateKey');
        // const storedPublicKey = window.localStorage.getItem('dappEncryptionPublicKey');

        // // make a call to see if user is connected

        // if (storedPrivateKey && storedPublicKey) {
        //     try {
        //         // Use existing keypair
        //         const existingKeypair = nacl.box.keyPair.fromSecretKey(bs58.decode(storedPrivateKey));
        //         this.dappKeyPair = existingKeypair;

        //         logInfo('Using existing keypair', {
        //             component: 'PhantomConnect',
        //             publicKey: storedPublicKey
        //         });
        //     } catch (error) {
        //         logError(error, {
        //             component: 'PhantomConnect',
        //             action: 'loading existing keypair'
        //         });
        //         // If there's an error with stored keys, remove them and generate new ones
        //         window.localStorage.removeItem('dappEncryptionPrivateKey');
        //         window.localStorage.removeItem('dappEncryptionPublicKey');
        //         this.generateNewKeypair();
        //     }
        // } else {
        //     // No existing keypair, generate new one
        //     this.generateNewKeypair();
        // }
    }

    // generateNewKeypair() {
    //     if (typeof window === 'undefined') {
    //         return;
    //     }

    //     this.dappKeyPair = nacl.box.keyPair();
    //     //window.localStorage.setItem('dappEncryptionPublicKey', bs58.encode(this.dappKeyPair.publicKey));
    //     //window.localStorage.setItem('dappEncryptionPrivateKey', bs58.encode(this.dappKeyPair.secretKey));

    //     logInfo('Generated new keypair', {
    //         component: 'PhantomConnect',
    //         publicKey: bs58.encode(this.dappKeyPair.publicKey)
    //     });
    // }

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

    convertStringToUint8Array(normalString) {
        try {
            // Step 1: Check if the input is a string
            if (typeof normalString !== 'string') {
                throw new Error('Input is not a valid string.');
            }
    
            // Step 2: Convert the string to a Uint8Array using TextEncoder
            const uint8Array = new TextEncoder().encode(normalString);
    
            console.log('Successfully converted string to Uint8Array:', uint8Array);
            return uint8Array;
        } catch (error) {
            console.error('Error converting string to Uint8Array:', error.message);
            return new Uint8Array(); // Return an empty Uint8Array in case of an error
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

            console.log('Created session now saving. ',sessionData);
            
            const response = await fetch('https://theruggame.fun/api/session', {
                method: 'POST',
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify(sessionData)
            })

            if (!response.ok) {
                const errorData = await response.json();
                logError('Session save error',{
                    component: 'Phantom connect',
                    errorData: errorData
                });
            }

            logInfo('Id - save keypair', {
                id: id,
            });
            return id;
        } catch (error) {
            console.log(`Error saving session data.`);
            throw error;
        }
    }

    async connect() {
        const id = await this.saveKeyPair();

        logInfo('Id', {
            id: id,
        });

        // Everytime i call connect I need to generate a new key
        // pass an id 

        const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
            cluster: "mainnet-beta",
            //cluster: 'devnet',
            app_url: APP_URL,
            redirect_link: "https://theruggame.fun/wallet-callback",
        });

        const url = buildUrl("connect", params);

        logInfo('connect deeplink', {
            component: 'Phantom connect',
            link: url
        });

        return { deepLink: url, id: id };
    }

    async disconnect(key) {
        if (!key) {
            throw new Error('Public Key needed.');
        }

        logInfo('Starting disconnect', {
            component: 'Phantom connect',
            key: key
        });

        const response = await fetch(`${APP_URL}/api/session?key=${key}`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });

        let session;

        if (!response.ok) {
            const errorData = await response.json();
            logInfo('Fetching session data error', {
                component: 'Phantom connect',
                errorData: errorData
            });

            throw new Error('Error fetching session data.');
        }

        session = await response.json();

        logInfo('Fetched session', {
            component: 'Phantom connect',
            session: session
        });

        const decryptedSession = encryptionService.decrypt(session.session);
        const payload = {
            decryptedSession
        };

        const sharedSecret = this.getUint8ArrayFromJsonString(session.shared_secret);

        logInfo('Shared secret', {
            ss: sharedSecret
        });

        const [nonce, encryptedPayload] = this.encryptPayload(payload, sharedSecret);

        const params = new URLSearchParams({
            dapp_encryption_public_key: session.dapp_public,
            nonce: bs58.encode(nonce),
            redirect_link: 'https://theruggame.fun/disconnect-callback',
            payload: bs58.encode(encryptedPayload),
        });

        const url = buildUrl("disconnect", params);

        logInfo('URL', {
            component: 'Phantom connect',
            url: url
        });

        return url;
        
        // pass in the public key and use that to fetch the data
        // const session = window.localStorage.getItem('phantomSession');
        // const sharedSecret = window.localStorage.getItem('phantomSharedSecret');

        // if (!session || !sharedSecret) {
        //     throw new Error("Missing session or shared secret");
        // }

        // const payload = {
        //     session
        // };

        // const convertedSharedSecret = getUint8ArrayFromJsonString(sharedSecret);

        // const [nonce, encryptedPayload] = encryptPayload(payload, convertedSharedSecret);

        // logInfo('DisConnect public key', {
        //     component: 'Phantom Connect',
        //     publicKey: `${bs58.encode(this.dappKeyPair.publicKey)}`
        // });

        // const params = new URLSearchParams({
        //     dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
        //     nonce: bs58.encode(nonce),
        //     redirect_link: 'https://theruggame.fun/disconnect-callback',
        //     payload: bs58.encode(encryptedPayload),
        // });

        // const url = buildUrl("disconnect", params);

        // return url;
    }

    async signAndSendTransaction(betAmount, publicKey) {
        // const transaction = await this.createTransferTransaction(betAmount, publicKey);

        // logInfo('Created transaction:', {
        //     component: 'Phantom connect',
        //     transaction: transaction
        // });

        // const serializedTransaction = transaction.serialize({
        //     requireAllSignatures: false,
        // });

        // const session = window.localStorage.getItem('phantomSession');
        // const sharedSecret = window.localStorage.getItem('phantomSharedSecret');

        // const payload = {
        //     session,
        //     transaction: bs58.encode(serializedTransaction),
        // };

        // logInfo('Created payload', {
        //     component: 'phantom connect',
        //     transaction: transaction
        // });

        // const convertedSharedSecret = getUint8ArrayFromJsonString(sharedSecret);

        // const [nonce, encryptedPayload] = encryptPayload(payload, convertedSharedSecret);

        // const params = new URLSearchParams({
        //     dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
        //     nonce: bs58.encode(nonce),
        //     redirect_link: 'https://theruggame.fun/market-callback',
        //     payload: bs58.encode(encryptedPayload),
        // });

        // logInfo('Sending transaction.....', {});

        // const url = buildUrl("signAndSendTransaction", params);

        // try {
        //     window.location.href = url;
        // } catch (error) {
        //     logError(error, {
        //         component: 'PhantomConnect',
        //         action: 'signAndSend navigation'
        //     });
        //     throw error;
        // }
    }

    createTransferTransaction = async (amount, publicKey) => {
        if (!publicKey) throw new Error("missing public key from user");

        publicKey = new PublicKey(publicKey);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        let transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(SITE_WALLET_ADDRESS),
                lamports: Math.round(amount * LAMPORTS_PER_SOL),
            })
        );
        transaction.feePayer = publicKey;
        logInfo('Getting recent blockhash', {});
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        return transaction;
    };

    async handleConnectResponse(data, nonce, phantomEncryptionPublicKey, sessionId) {
        console.log('Session id: ', sessionId);
        const response = await fetch(`${APP_URL}/api/session?id=${sessionId}`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });

        let session;

        if (!response.ok) {
            const errorData = await response.json();
            logInfo('Fetching session data error', {
                component: 'Phantom connect',
                errorData: errorData
            });

            throw new Error('Error fetching session data.');
        }

        session = await response.json();

        logInfo('Fetched session data', {
            component: 'Phantom connect',
            session: session
        });

        const sharedSecret = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            bs58.decode(session.dapp_private)
        );

        if (sharedSecret instanceof Uint8Array)  {
            logInfo('Shared secret is an uint array', {
                data: sharedSecret
            });
        } else {
            logInfo('Shared secret is not a uint array', {
                data: sharedSecret
            });
        }
        const decryptedData = this.decryptPayload(data, nonce, sharedSecret);
        const convertedSharedSecret = JSON.stringify(sharedSecret);
        const encryptedSession = encryptionService.encrypt(decryptedData.session);
        

        const newSession = {
            ...session,
            session: encryptedSession,
            shared_secret: convertedSharedSecret,
            wallet_ca: decryptedData.public_key
        }

        logInfo('Saving the new session', {
            newSession: JSON.stringify(newSession)
        });

        const updateResponse = await fetch(`${APP_URL}/api/session`, {
            method: 'PATCH',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: session.id,
                session: newSession
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            logInfo('Updating session data error', {
                component: 'Phantom connect',
                errorData: errorData
            });

            throw new Error('Error updating session data.');
        }
        return { session: decryptedData.session, publicKey: decryptedData.public_key };
    }
}

// Export both the instance and the buildUrl function
//export const phantomConnect = typeof window !== 'undefined' ? new PhantomConnect() : null;
//const phantomConnect = new PhantomConnect();
export default PhantomConnect;
//export { buildUrl, decryptPayload, getUint8ArrayFromJsonString }; 