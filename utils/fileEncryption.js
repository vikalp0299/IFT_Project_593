import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * File Encryption Utilities
 * Handles symmetric encryption for files and RSA encryption for symmetric keys
 */

/**
 * Generate a random symmetric key for file encryption
 * @returns {Buffer} 32-byte (256-bit) key for AES-256
 */
export function generateSymmetricKey() {
  return crypto.randomBytes(32);
}

/**
 * Encrypt file content using AES-256-GCM
 * @param {Buffer} fileContent - File content to encrypt
 * @param {Buffer} symmetricKey - 32-byte symmetric key
 * @returns {Object} Encrypted data with IV, auth tag, and ciphertext
 */
export function encryptFile(fileContent, symmetricKey) {
  if (!Buffer.isBuffer(symmetricKey) || symmetricKey.length !== 32) {
    throw new Error('Symmetric key must be a 32-byte Buffer');
  }

  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(fileContent),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: 'AES-256-GCM'
  };
}

/**
 * Decrypt file content using AES-256-GCM
 * @param {Buffer} encryptedData - Encrypted file content
 * @param {Buffer} symmetricKey - 32-byte symmetric key
 * @param {string} ivBase64 - IV in base64
 * @param {string} authTagBase64 - Auth tag in base64
 * @returns {Buffer} Decrypted file content
 */
export function decryptFile(encryptedData, symmetricKey, ivBase64, authTagBase64) {
  if (!Buffer.isBuffer(symmetricKey) || symmetricKey.length !== 32) {
    throw new Error('Symmetric key must be a 32-byte Buffer');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);

  return decrypted;
}

/**
 * Encrypt symmetric key using RSA-OAEP with department's public key
 * @param {Buffer} symmetricKey - 32-byte symmetric key to encrypt
 * @param {string} publicKeyPem - Public key in PEM format
 * @returns {string} Encrypted symmetric key in base64
 */
export function encryptSymmetricKey(symmetricKey, publicKeyPem) {
  if (!Buffer.isBuffer(symmetricKey) || symmetricKey.length !== 32) {
    throw new Error('Symmetric key must be a 32-byte Buffer');
  }

  if (!publicKeyPem || typeof publicKeyPem !== 'string') {
    throw new Error('Public key PEM is required');
  }

  try {
    // Import public key
    const publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
      type: 'spki'
    });

    // Encrypt symmetric key using RSA-OAEP
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      symmetricKey
    );

    return encrypted.toString('base64');
  } catch (error) {
    throw new Error(`Failed to encrypt symmetric key: ${error.message}`);
  }
}

/**
 * Decrypt symmetric key using RSA-OAEP with department's private key
 * @param {string} encryptedKeyBase64 - Encrypted symmetric key in base64
 * @param {string} privateKeyPem - Private key in PEM format
 * @returns {Buffer} Decrypted 32-byte symmetric key
 */
export function decryptSymmetricKey(encryptedKeyBase64, privateKeyPem) {
  if (!encryptedKeyBase64 || typeof encryptedKeyBase64 !== 'string') {
    throw new Error('Encrypted key in base64 is required');
  }

  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('Private key PEM is required');
  }

  try {
    // Import private key
    const privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      format: 'pem',
      type: 'pkcs8'
    });

    // Decrypt symmetric key
    const encryptedBuffer = Buffer.from(encryptedKeyBase64, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedBuffer
    );

    if (decrypted.length !== 32) {
      throw new Error('Decrypted key length is invalid');
    }

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt symmetric key: ${error.message}`);
  }
}

/**
 * Encrypt file from disk and return encrypted data
 * @param {string} filePath - Path to file to encrypt
 * @param {Buffer} symmetricKey - 32-byte symmetric key
 * @returns {Promise<Object>} Encrypted file data
 */
export async function encryptFileFromDisk(filePath, symmetricKey) {
  try {
    const fileContent = await fs.readFile(filePath);
    return encryptFile(fileContent, symmetricKey);
  } catch (error) {
    throw new Error(`Failed to read and encrypt file: ${error.message}`);
  }
}

/**
 * Write encrypted file to disk
 * @param {Buffer} encryptedData - Encrypted file content
 * @param {string} outputPath - Path to write encrypted file
 * @returns {Promise<void>}
 */
export async function writeEncryptedFile(encryptedData, outputPath) {
  try {
    await fs.writeFile(outputPath, encryptedData);
  } catch (error) {
    throw new Error(`Failed to write encrypted file: ${error.message}`);
  }
}

/**
 * Read and decrypt file from disk
 * @param {string} encryptedFilePath - Path to encrypted file
 * @param {Buffer} symmetricKey - 32-byte symmetric key
 * @param {string} ivBase64 - IV in base64
 * @param {string} authTagBase64 - Auth tag in base64
 * @returns {Promise<Buffer>} Decrypted file content
 */
export async function decryptFileFromDisk(encryptedFilePath, symmetricKey, ivBase64, authTagBase64) {
  try {
    const encryptedData = await fs.readFile(encryptedFilePath);
    return decryptFile(encryptedData, symmetricKey, ivBase64, authTagBase64);
  } catch (error) {
    throw new Error(`Failed to read and decrypt file: ${error.message}`);
  }
}

