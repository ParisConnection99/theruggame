import CryptoJS from 'crypto-js';

export default class EncryptionService {
   constructor(key, iv) {
       // Add more robust validation and logging
       if (!key || !iv) {
           throw new Error('Encryption key and IV are required.');
       }

       // Ensure consistent key and IV parsing
       try {
           this.key = CryptoJS.enc.Hex.parse(key);
           this.iv = CryptoJS.enc.Hex.parse(iv);
       } catch (parseError) {
           throw new Error('Failed to parse encryption key or IV');
       }
   }

   encrypt(data) {
       try {
           if (!data) {
               throw new Error('No data provided for encryption.');
           }

           if (typeof data !== 'string') {
             data = JSON.stringify(data);
           } 
           
           const encrypted = CryptoJS.AES.encrypt(data, this.key, {
               iv: this.iv,
               mode: CryptoJS.mode.CBC,
               padding: CryptoJS.pad.Pkcs7,
           });

           const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

           return encryptedHex;
       } catch (error) {
           throw new Error('Encryption failed: ' + error.message);
       }
   }

   decrypt(encryptedData) {
       try {
           if (!encryptedData) {
               throw new Error('No encrypted data provided for decryption.');
           }

           // Convert the encrypted data from a hex string back to a CryptoJS WordArray
           const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);

           // Create a CryptoJS CipherParams object
           const cipherParams = CryptoJS.lib.CipherParams.create({
               ciphertext: ciphertext,
           });

           // Decrypt the data
           const decrypted = CryptoJS.AES.decrypt(cipherParams, this.key, {
               iv: this.iv,
               mode: CryptoJS.mode.CBC,
               padding: CryptoJS.pad.Pkcs7,
           });

           // Convert the decrypted data to a UTF-8 string
           const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

           if (!decryptedString) {
               throw new Error('Decryption resulted in an empty string.');
           }

           return decryptedString;
       } catch (error) {
           throw new Error('Decryption failed: ' + error.message);
       }
   }
}