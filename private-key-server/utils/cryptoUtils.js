import crypto from 'crypto';
import { config } from '../config.js';

const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.PRIVATE_KEY_ENCRYPTION_KEY || config.jwtSecret)
  .digest();

export const encryptSecret = (plaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: 'AES-256-GCM',
    fingerprint: crypto.createHash('sha256').update(ciphertext).digest('hex'),
  };
};

export const decryptSecret = ({ ciphertext, iv, authTag }) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
};

export const redactValue = (value, visible = 4) => {
  if (!value) return '';
  const tail = value.slice(-visible);
  return `${'*'.repeat(Math.max(value.length - visible, 0))}${tail}`;
};

