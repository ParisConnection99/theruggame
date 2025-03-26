// lib/EncryptionService.js
import CryptoJS from 'crypto-js';

// export default class EncryptionService {
//   constructor() {
//     // **CRITICAL: NEVER hardcode your key and IV.  Use environment variables.**
//     this.encryptionKey = process.env.ENCRYPTION_KEY;
//     this.encryptionIV = process.env.ENCRYPTION_IV;

//     if (!this.encryptionKey || !this.encryptionIV) {
//       throw new Error('Encryption key and IV must be set in environment variables.');
//     }

//     // Convert the key and IV from hex strings to CryptoJS WordArrays
//     this.key = CryptoJS.enc.Hex.parse(this.encryptionKey);
//     this.iv = CryptoJS.enc.Hex.parse(this.encryptionIV);
//   }

//   encrypt(data) {
//     if (!data) {
//       return null; // Or throw an error, depending on your needs
//     }

//     try {
//       const encrypted = CryptoJS.AES.encrypt(data, this.key, {
//         iv: this.iv,
//         mode: CryptoJS.mode.CBC, // Use CBC mode (Cipher Block Chaining)
//         padding: CryptoJS.pad.Pkcs7, // Use PKCS7 padding
//       });

//       // Return the encrypted data as a hex string
//       return encrypted.ciphertext.toString(CryptoJS.enc.Hex);

//     } catch (error) {
//       console.error('Encryption error:', error);
//       throw new Error('Encryption failed'); // Re-throw for handling in calling function
//     }
//   }

//   // decrypt(encryptedData) {
//   //   if (!encryptedData) {
//   //     return null; // Or throw an error
//   //   }

//   //   try {
//   //     // Convert the encrypted data from a hex string back to a CryptoJS WordArray
//   //     const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);

//   //     // Create a CryptoJS CipherParams object (needed for decryption)
//   //     const cipherParams = CryptoJS.lib.CipherParams.create({
//   //       ciphertext: ciphertext,
//   //     });

//   //     const decrypted = CryptoJS.AES.decrypt(cipherParams, this.key, {
//   //       iv: this.iv,
//   //       mode: CryptoJS.mode.CBC,
//   //       padding: CryptoJS.pad.Pkcs7,
//   //     });

//   //     // Return the decrypted data as a UTF-8 string
//   //     return decrypted.toString(CryptoJS.enc.Utf8);

//   //   } catch (error) {
//   //     console.error('Decryption error:', error);
//   //     throw new Error('Decryption failed'); // Re-throw
//   //   }
//   // }
//   decrypt(encryptedData) {
//     if (!encryptedData) {
//         console.error('No encrypted data provided for decryption.');
//         return null; // Or throw an error
//     }

//     try {
//         console.log('Encrypted Data:', encryptedData);

//         // Convert the encrypted data from a hex string back to a CryptoJS WordArray
//         const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);

//         // Create a CryptoJS CipherParams object (needed for decryption)
//         const cipherParams = CryptoJS.lib.CipherParams.create({
//             ciphertext: ciphertext,
//         });

//         console.log('CipherParams:', cipherParams);

//         const decrypted = CryptoJS.AES.decrypt(cipherParams, this.key, {
//             iv: this.iv,
//             mode: CryptoJS.mode.CBC,
//             padding: CryptoJS.pad.Pkcs7,
//         });

//         // Convert the decrypted data to a UTF-8 string
//         const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

//         if (!decryptedString) {
//             throw new Error('Decryption resulted in an empty string.');
//         }

//         return decryptedString;

//     } catch (error) {
//         console.error('Decryption error:', error);
//         throw new Error('Decryption failed'); // Re-throw for handling in calling function
//     }
// }

//   generateKey() {
//     // Generate a 256-bit (32-byte) random key
//     const key = crypto.randomBytes(32);
//     return key.toString('hex');
//   }

//   generateIV() {
//       // Generate a 128-bit (16-byte) random IV
//       const iv = crypto.randomBytes(16);
//       return iv.toString('hex');
//   }
// }
export default class EncryptionService {
  constructor(key, iv) {
      if (!key || !iv) {
          throw new Error('Encryption key and IV are required.');
      }

      console.log('Initializing EncryptionService with Key:', process.env.ENCRYPTION_KEY);
      console.log('Initializing EncryptionService with IV:', process.env.ENCRYPTION_IV);

      // Convert key and IV to CryptoJS WordArray
      this.key = CryptoJS.enc.Hex.parse(key);
      this.iv = CryptoJS.enc.Hex.parse(iv);
  }

  encrypt(data) {
      try {
          if (!data) {
              throw new Error('No data provided for encryption.');
          }

          // Encrypt the data
          const encrypted = CryptoJS.AES.encrypt(data, this.key, {
              iv: this.iv,
              mode: CryptoJS.mode.CBC,
              padding: CryptoJS.pad.Pkcs7,
          });

          // Return the encrypted data as a hex string
          return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
      } catch (error) {
          console.error('Encryption error:', error);
          throw new Error('Encryption failed.');
      }
  }

  decrypt(encryptedData) {
      try {
          if (!encryptedData) {
              throw new Error('No encrypted data provided for decryption.');
          }

          // Convert the encrypted data from a hex string back to a CryptoJS WordArray
          const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);

          // Create a CryptoJS CipherParams object (needed for decryption)
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
          console.error('Decryption error:', error);
          throw new Error('Decryption failed.');
      }
  }
}