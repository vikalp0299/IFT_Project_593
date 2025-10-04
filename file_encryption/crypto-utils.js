/**
 * Crypto Utilities - Secure File Encryption with Web Crypto API and IndexedDB
 * Implements the most secure method for key storage as specified
 */

class CryptoUtils {
    constructor() {
        this.dbName = 'SecureFileEncryptionDB';
        this.dbVersion = 1;
        this.storeName = 'cryptoKeys';
        this.db = null;
        this.keyPair = null;
        this.importedPublicKey = null;
    }

    /**
     * Initialize IndexedDB for key storage
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Generate a new RSA key pair using Web Crypto API
     */
    async generateKeyPair() {
        try {
            this.keyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256'
                },
                true, // extractable
                ['encrypt', 'decrypt']
            );
            return this.keyPair;
        } catch (error) {
            throw new Error(`Key generation failed: ${error.message}`);
        }
    }

    /**
     * Derive a key from password using PBKDF2
     */
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt private key with password-derived key
     */
    async encryptPrivateKey(privateKey, password) {
        try {
            // Generate random salt and IV
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Derive key from password
            const derivedKey = await this.deriveKeyFromPassword(password, salt);

            // Export private key
            const exportedKey = await window.crypto.subtle.exportKey('pkcs8', privateKey);

            // Encrypt with AES-GCM
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                derivedKey,
                exportedKey
            );

            return {
                encrypted: new Uint8Array(encrypted),
                salt: salt,
                iv: iv
            };
        } catch (error) {
            throw new Error(`Private key encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt private key with password
     */
    async decryptPrivateKey(encryptedData, password) {
        try {
            // Derive key from password
            const derivedKey = await this.deriveKeyFromPassword(password, encryptedData.salt);

            // Decrypt with AES-GCM
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: encryptedData.iv },
                derivedKey,
                encryptedData.encrypted
            );

            // Import the decrypted private key
            return await window.crypto.subtle.importKey(
                'pkcs8',
                decrypted,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['decrypt']
            );
        } catch (error) {
            throw new Error(`Private key decryption failed: ${error.message}`);
        }
    }

    /**
     * Store encrypted private key in IndexedDB
     */
    async storeEncryptedPrivateKey(encryptedPrivateKey, password) {
        try {
            await this.initDB();
            
            const encryptedData = await this.encryptPrivateKey(encryptedPrivateKey, password);
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const keyData = {
                id: 'privateKey',
                encrypted: Array.from(encryptedData.encrypted),
                salt: Array.from(encryptedData.salt),
                iv: Array.from(encryptedData.iv),
                timestamp: Date.now()
            };

            await new Promise((resolve, reject) => {
                const request = store.put(keyData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            return true;
        } catch (error) {
            throw new Error(`Failed to store private key: ${error.message}`);
        }
    }

    /**
     * Load and decrypt private key from IndexedDB
     */
    async loadEncryptedPrivateKey(password) {
        try {
            await this.initDB();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const keyData = await new Promise((resolve, reject) => {
                const request = store.get('privateKey');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!keyData) {
                throw new Error('No private key found in storage');
            }

            const encryptedData = {
                encrypted: new Uint8Array(keyData.encrypted),
                salt: new Uint8Array(keyData.salt),
                iv: new Uint8Array(keyData.iv)
            };

            const privateKey = await this.decryptPrivateKey(encryptedData, password);
            
            // Reconstruct the key pair
            const publicKey = await window.crypto.subtle.importKey(
                'spki',
                await window.crypto.subtle.exportKey('spki', this.keyPair.publicKey),
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['encrypt']
            );

            this.keyPair = { publicKey, privateKey };
            return this.keyPair;
        } catch (error) {
            throw new Error(`Failed to load private key: ${error.message}`);
        }
    }

    /**
     * Store public key in IndexedDB
     */
    async storePublicKey(publicKey) {
        try {
            await this.initDB();
            
            const exportedKey = await window.crypto.subtle.exportKey('spki', publicKey);
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const keyData = {
                id: 'publicKey',
                key: Array.from(new Uint8Array(exportedKey)),
                timestamp: Date.now()
            };

            await new Promise((resolve, reject) => {
                const request = store.put(keyData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            return true;
        } catch (error) {
            throw new Error(`Failed to store public key: ${error.message}`);
        }
    }

    /**
     * Load public key from IndexedDB
     */
    async loadPublicKey() {
        try {
            await this.initDB();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const keyData = await new Promise((resolve, reject) => {
                const request = store.get('publicKey');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!keyData) {
                throw new Error('No public key found in storage');
            }

            return await window.crypto.subtle.importKey(
                'spki',
                new Uint8Array(keyData.key),
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['encrypt']
            );
        } catch (error) {
            throw new Error(`Failed to load public key: ${error.message}`);
        }
    }

    /**
     * Import public key from file
     */
    async importPublicKeyFromFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const keyData = new Uint8Array(arrayBuffer);
            
            // Try to parse as PEM format first
            let keyBuffer;
            try {
                const pemString = new TextDecoder().decode(keyData);
                if (pemString.includes('-----BEGIN PUBLIC KEY-----')) {
                    // Extract base64 content from PEM
                    const base64Content = pemString
                        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
                        .replace(/-----END PUBLIC KEY-----/g, '')
                        .replace(/\s/g, '');
                    
                    const binaryString = atob(base64Content);
                    keyBuffer = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        keyBuffer[i] = binaryString.charCodeAt(i);
                    }
                } else {
                    keyBuffer = keyData;
                }
            } catch {
                // If PEM parsing fails, use raw data
                keyBuffer = keyData;
            }

            this.importedPublicKey = await window.crypto.subtle.importKey(
                'spki',
                keyBuffer,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['encrypt']
            );

            return this.importedPublicKey;
        } catch (error) {
            throw new Error(`Failed to import public key: ${error.message}`);
        }
    }

    /**
     * Encrypt file using public key
     */
    async encryptFile(file, publicKey = null) {
        try {
            const keyToUse = publicKey || this.keyPair?.publicKey || this.importedPublicKey;
            if (!keyToUse) {
                throw new Error('No public key available for encryption');
            }

            const fileBuffer = await file.arrayBuffer();
            const chunkSize = 190; // RSA-OAEP with 2048-bit key can encrypt ~190 bytes
            const encryptedChunks = [];

            // Encrypt file in chunks
            for (let i = 0; i < fileBuffer.byteLength; i += chunkSize) {
                const chunk = fileBuffer.slice(i, i + chunkSize);
                const encrypted = await window.crypto.subtle.encrypt(
                    { name: 'RSA-OAEP' },
                    keyToUse,
                    chunk
                );
                encryptedChunks.push(new Uint8Array(encrypted));
            }

            // Combine encrypted chunks
            const totalLength = encryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of encryptedChunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        } catch (error) {
            throw new Error(`File encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt file using private key
     */
    async decryptFile(encryptedData, privateKey = null) {
        try {
            const keyToUse = privateKey || this.keyPair?.privateKey;
            if (!keyToUse) {
                throw new Error('No private key available for decryption');
            }

            const chunkSize = 256; // RSA-OAEP with 2048-bit key produces 256-byte chunks
            const decryptedChunks = [];

            // Decrypt file in chunks
            for (let i = 0; i < encryptedData.length; i += chunkSize) {
                const chunk = encryptedData.slice(i, i + chunkSize);
                const decrypted = await window.crypto.subtle.decrypt(
                    { name: 'RSA-OAEP' },
                    keyToUse,
                    chunk
                );
                decryptedChunks.push(new Uint8Array(decrypted));
            }

            // Combine decrypted chunks
            const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of decryptedChunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        } catch (error) {
            throw new Error(`File decryption failed: ${error.message}`);
        }
    }

    /**
     * Export public key as PEM format
     */
    async exportPublicKeyAsPEM(publicKey = null) {
        try {
            const keyToUse = publicKey || this.keyPair?.publicKey;
            if (!keyToUse) {
                throw new Error('No public key available for export');
            }

            const exported = await window.crypto.subtle.exportKey('spki', keyToUse);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
            
            return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
        } catch (error) {
            throw new Error(`Failed to export public key: ${error.message}`);
        }
    }

    /**
     * Check if keys exist in storage
     */
    async keysExist() {
        try {
            await this.initDB();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const privateKeyExists = await new Promise((resolve) => {
                const request = store.get('privateKey');
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });

            const publicKeyExists = await new Promise((resolve) => {
                const request = store.get('publicKey');
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });

            return { privateKeyExists, publicKeyExists };
        } catch (error) {
            return { privateKeyExists: false, publicKeyExists: false };
        }
    }
}

// Export for use in other modules
window.CryptoUtils = CryptoUtils;
