import CryptoJS from 'crypto-js';

// export default class EncryptionService {
//    constructor(key, iv) {
//        // Add more robust validation and logging
//        if (!key || !iv) {
//            throw new Error('Encryption key and IV are required.');
//        }

//        // Ensure consistent key and IV parsing
//        try {
//            this.key = CryptoJS.enc.Hex.parse(key);
//            this.iv = CryptoJS.enc.Hex.parse(iv);
//        } catch (parseError) {
//            console.error('Key/IV Parsing Error:', parseError);
//            throw new Error('Failed to parse encryption key or IV');
//        }
//    }

//    encrypt(data) {
//        try {
//            if (!data) {
//                throw new Error('No data provided for encryption.');
//            }

//            const encrypted = CryptoJS.AES.encrypt(data, this.key, {
//                iv: this.iv,
//                mode: CryptoJS.mode.CBC,
//                padding: CryptoJS.pad.Pkcs7,
//            });

//            const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
//            console.log('Encrypted Hex:', encryptedHex);

//            return encryptedHex;
//        } catch (error) {
//            console.error('Encryption Error Details:', error);
//            throw new Error('Encryption failed: ' + error.message);
//        }
//    }

//    decrypt(encryptedData) {
//        try {
//            if (!encryptedData) {
//                throw new Error('No encrypted data provided for decryption.');
//            }

//            // Convert the encrypted data from a hex string back to a CryptoJS WordArray
//            const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);

//            // Create a CryptoJS CipherParams object
//            const cipherParams = CryptoJS.lib.CipherParams.create({
//                ciphertext: ciphertext,
//            });

//            // Decrypt the data
//            const decrypted = CryptoJS.AES.decrypt(cipherParams, this.key, {
//                iv: this.iv,
//                mode: CryptoJS.mode.CBC,
//                padding: CryptoJS.pad.Pkcs7,
//            });

//            // Convert the decrypted data to a UTF-8 string
//            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

//            if (!decryptedString) {
//                throw new Error('Decryption resulted in an empty string.');
//            }

//            return decryptedString;
//        } catch (error) {
//            console.error('Detailed Decryption Error:', error);
//            console.error('Error Name:', error.name);
//            console.error('Error Message:', error.message);
//            throw new Error('Decryption failed: ' + error.message);
//        }
//    }
// }
import CryptoJS from 'crypto-js';

export default class EncryptionService {
    constructor(key, iv) {
        if (!key || !iv) {
            throw new Error('Encryption key and IV are required.');
        }

        try {
            this.key = CryptoJS.enc.Hex.parse(key);
            this.iv = CryptoJS.enc.Hex.parse(iv);
        } catch (parseError) {
            console.error('Key/IV Parsing Error:', parseError);
            throw new Error('Failed to parse encryption key or IV');
        }
    }

    encrypt(data) {
        try {
            if (!data) {
                throw new Error('No data provided for encryption.');
            }

            // Convert the input to a string if it's an object or array
            const dataToEncrypt = typeof data === 'object' 
                ? JSON.stringify(data) 
                : data.toString();

            const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, this.key, {
                iv: this.iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
            console.log('Encrypted Hex:', encryptedHex);

            return encryptedHex;
        } catch (error) {
            console.error('Encryption Error Details:', error);
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    decrypt(encryptedData) {
        try {
            if (!encryptedData) {
                throw new Error('No encrypted data provided for decryption.');
            }

            const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: ciphertext,
            });

            const decrypted = CryptoJS.AES.decrypt(cipherParams, this.key, {
                iv: this.iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

            if (!decryptedString) {
                throw new Error('Decryption resulted in an empty string.');
            }

            // Try to parse the decrypted string as JSON
            try {
                return JSON.parse(decryptedString);
            } catch {
                // If it's not a JSON, return the string
                return decryptedString;
            }
        } catch (error) {
            console.error('Detailed Decryption Error:', error);
            console.error('Error Name:', error.name);
            console.error('Error Message:', error.message);
            throw new Error('Decryption failed: ' + error.message);
        }
    }
}