/**
 * Client-side file decryption utilities using Web Crypto API
 * Decrypts files that were encrypted with AES-256-GCM
 */

/**
 * Decrypt file content using AES-256-GCM
 * @param encryptedFileBase64 - Encrypted file content in base64
 * @param symmetricKeyBase64 - 32-byte symmetric key in base64
 * @param ivBase64 - IV in base64
 * @param authTagBase64 - Auth tag in base64
 * @returns Decrypted file as Blob
 */
export async function decryptFile(
  encryptedFileBase64: string,
  symmetricKeyBase64: string,
  ivBase64: string,
  authTagBase64: string
): Promise<Blob> {
  try {
    // Convert base64 strings to ArrayBuffers
    const encryptedData = base64ToArrayBuffer(encryptedFileBase64);
    const keyData = base64ToArrayBuffer(symmetricKeyBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const authTag = base64ToArrayBuffer(authTagBase64);

    // Validate key length (must be 32 bytes for AES-256)
    if (keyData.byteLength !== 32) {
      throw new Error(`Invalid symmetric key length: expected 32 bytes, got ${keyData.byteLength}`);
    }

    // Validate IV length (must be 12 bytes for GCM)
    if (iv.byteLength !== 12) {
      throw new Error(`Invalid IV length: expected 12 bytes, got ${iv.byteLength}`);
    }

    // Validate auth tag length (must be 16 bytes for GCM)
    if (authTag.byteLength !== 16) {
      throw new Error(`Invalid auth tag length: expected 16 bytes, got ${authTag.byteLength}`);
    }

    // Import the symmetric key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // For AES-GCM in Web Crypto API, the auth tag must be appended to the ciphertext
    // The last 16 bytes (128 bits) of the combined data is the auth tag
    const ciphertextWithTag = new Uint8Array(encryptedData.byteLength + authTag.byteLength);
    ciphertextWithTag.set(new Uint8Array(encryptedData), 0);
    ciphertextWithTag.set(new Uint8Array(authTag), encryptedData.byteLength);

    // Decrypt the file
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: 128, // 128 bits = 16 bytes for GCM auth tag
      },
      cryptoKey,
      ciphertextWithTag
    );

    // Convert decrypted ArrayBuffer to Blob
    return new Blob([decryptedData]);
  } catch (error) {
    throw new Error(`Failed to decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

