import { serviceRepo } from '@/services/ServiceRepository';
import { verifyBetTransaction } from '@/utils/SolanaTransactionChecker';
import PhantomConnect from '@/utils/PhantomConnect';
import EncryptionService from '@/lib/EncryptionService';

const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const phantomConnect = new PhantomConnect();
const encryptionService = new EncryptionService(key, iv);


export async function POST(request) {
    try {
        const body = await request.json();

        const { data, nonce, key } = body;

        if (!data || !nonce || !key) {
            return new Response(JSON.stringify({ error: 'Missing parameters.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the session
        try {
            const session_data = await serviceRepo.sessionDataService.getByWallet_ca(key);
            const decryptedSharedSecret = encryptionService.decrypt(session_data.shared_secret);
            const convertedSharedSecret = phantomConnect.getUint8ArrayFromJsonString(decryptedSharedSecret);
            const signature = phantomConnect.decryptPayload(data, nonce, convertedSharedSecret);

            if (!signature) {
                return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Now we got to check the signature
            try {
                const result = await verifyBetTransaction(signature.signature);

                // Check if session exists in database
    
                if (result.success) {
                    return new Response(JSON.stringify({ result: 'Success' }), {
                        status: 201,
                        headers: { 'Content-Type': 'application/json' },
                    });
                } else {
                    return new Response(JSON.stringify({ result: 'Failure', error: result.error }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
    
            } catch (error) {
                return new Response(JSON.stringify({ error: 'Error verifying transaction' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

        } catch (error) {
            throw error;
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}