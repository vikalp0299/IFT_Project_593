/**
 * Crypto Service - Secure Key Generation and Management
 * Based on file_encryption crypto-utils.js with user registration integration
 */

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface EncryptedPrivateKey {
  encrypted: Uint8Array;
  salt: Uint8Array;
  iv: Uint8Array;
}

interface StoredKeyData {
  id: string;
  encrypted: number[];
  salt: number[];
  iv: number[];
  timestamp: number;
  organizationName: string;
  userId: string;
}

class CryptoService {
  private dbName = 'UserCryptoKeysDB';
  private dbVersion = 1;
  private storeName = 'userKeys';
  private db: IDBDatabase | null = null;
  private keyPair: KeyPair | null = null;

  /**
   * Initialize IndexedDB for key storage
   */
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Generate a new RSA key pair using Web Crypto API
   */
  public async generateKeyPair(): Promise<KeyPair> {
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
      throw new Error(`Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive a key from password using PBKDF2
   */
  private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
  private async encryptPrivateKey(privateKey: CryptoKey, password: string): Promise<EncryptedPrivateKey> {
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
      throw new Error(`Private key encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export public key as PEM format
   */
  public async exportPublicKeyAsPem(publicKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey);
      const exportedAsString = this.arrayBufferToBase64(exported);
      
      // Format Base64 string with line breaks every 64 characters (standard PEM format)
      const formattedBase64 = exportedAsString.match(/.{1,64}/g)?.join('\n') || exportedAsString;
      
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${formattedBase64}\n-----END PUBLIC KEY-----`;
      
      return pemKey;
    } catch (error) {
      throw new Error(`Public key export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Store encrypted private key in IndexedDB with user context
   */
  public async storeEncryptedPrivateKey(
    privateKey: CryptoKey, 
    password: string, 
    organizationName: string, 
    userId: string
  ): Promise<boolean> {
    try {
      await this.initDB();
      
      const encryptedData = await this.encryptPrivateKey(privateKey, password);
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const keyData: StoredKeyData = {
        id: `${userId}_${organizationName}_privateKey`,
        encrypted: Array.from(encryptedData.encrypted),
        salt: Array.from(encryptedData.salt),
        iv: Array.from(encryptedData.iv),
        timestamp: Date.now(),
        organizationName: organizationName,
        userId: userId
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(keyData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Private key stored securely for organization:', organizationName);
      return true;
    } catch (error) {
      console.error('❌ Failed to store private key:', error);
      throw new Error(`Failed to store private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate keys for user registration
   */
  async generateKeysForRegistration(
    password: string, 
    organizationName: string, 
    tempUserId: string = 'temp_user_id'
  ): Promise<{ publicKeyPem: string; keyGenerated: boolean; keyPair: KeyPair }> {
    try {
      console.log('🔑 Generating RSA key pair for registration...');
      
      // Generate key pair
      const keyPair = await this.generateKeyPair();
      
      // Export public key as PEM
      const publicKeyPem = await this.exportPublicKeyAsPem(keyPair.publicKey);
      
      // Store private key securely with temp ID (will be updated after registration)
      await this.storeEncryptedPrivateKey(keyPair.privateKey, password, organizationName, tempUserId);
      
      console.log('✅ Key pair generated and stored successfully');
      
      return {
        publicKeyPem,
        keyGenerated: true,
        keyPair
      };
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      throw new Error(`Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update stored private key with actual user ID after registration
   */
  async updateStoredKeyUserId(
    tempUserId: string,
    actualUserId: string,
    organizationName: string,
    password: string
  ): Promise<boolean> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return false;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Get the temp key data
      const tempKeyData = await new Promise<StoredKeyData | undefined>((resolve, reject) => {
        const request = store.get(`${tempUserId}_${organizationName}_privateKey`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!tempKeyData) {
        console.warn('No temp key data found for update');
        return false;
      }

      // Delete temp key
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(`${tempUserId}_${organizationName}_privateKey`);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Create new key data with actual user ID
      const actualKeyData: StoredKeyData = {
        ...tempKeyData,
        id: `${actualUserId}_${organizationName}_privateKey`,
        userId: actualUserId
      };

      // Store with actual user ID
      await new Promise<void>((resolve, reject) => {
        const request = store.put(actualKeyData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Private key updated with actual user ID');
      return true;
    } catch (error) {
      console.error('❌ Failed to update key user ID:', error);
      return false;
    }
  }

  /**
   * Check if user has keys for a specific organization
   */
  async hasKeysForOrganization(userId: string, organizationName: string): Promise<boolean> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return false;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const keyData = await new Promise<StoredKeyData | undefined>((resolve, reject) => {
        const request = store.get(`${userId}_${organizationName}_privateKey`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return !!keyData;
    } catch (error) {
      console.error('Error checking keys:', error);
      return false;
    }
  }

  /**
   * Get user's keys across all organizations
   */
  async getUserKeys(userId: string): Promise<{ organizationName: string; hasKey: boolean }[]> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return [];
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const allKeys = await new Promise<StoredKeyData[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Filter keys for the specific user
      const userKeys = allKeys.filter(key => key.userId === userId);
      
      return userKeys.map(key => ({
        organizationName: key.organizationName,
        hasKey: true
      }));
    } catch (error) {
      console.error('Error getting user keys:', error);
      return [];
    }
  }

  /**
   * Load and decrypt private key from IndexedDB
   */
  async loadEncryptedPrivateKey(
    password: string, 
    organizationName: string, 
    userId: string
  ): Promise<CryptoKey | null> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const keyData = await new Promise<StoredKeyData | undefined>((resolve, reject) => {
        const request = store.get(`${userId}_${organizationName}_privateKey`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!keyData) {
        throw new Error('No private key found in storage');
      }

      // Convert stored arrays back to Uint8Array
      const encryptedData = {
        encrypted: new Uint8Array(keyData.encrypted),
        salt: new Uint8Array(keyData.salt),
        iv: new Uint8Array(keyData.iv)
      };

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
      console.error('❌ Failed to load private key:', error);
      return null;
    }
  }

  /**
   * Delete private key for specific organization
   */
  async deletePrivateKey(userId: string, organizationName: string): Promise<boolean> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return false;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(`${userId}_${organizationName}_privateKey`);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Private key deleted for organization:', organizationName);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete private key:', error);
      return false;
    }
  }

  /**
   * Clear all keys for a user (useful for logout or account deletion)
   */
  async clearAllUserKeys(userId: string): Promise<boolean> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return false;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const allKeys = await new Promise<StoredKeyData[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Delete all keys for this user
      const userKeys = allKeys.filter(key => key.userId === userId);
      
      for (const key of userKeys) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(key.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      console.log('✅ All private keys cleared for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear user keys:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
export default cryptoService;
