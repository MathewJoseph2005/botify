import { createCipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SALT = 'botify-telegram-token-salt';

function getSecretKey() {
  const secret = process.env.BOT_TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing BOT_TOKEN_ENCRYPTION_SECRET (or JWT_SECRET fallback)');
  }

  return scryptSync(secret, SALT, KEY_LENGTH);
}

export function encryptBotToken(token) {
  const iv = randomBytes(IV_LENGTH);
  const key = getSecretKey();

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Stored as base64(iv + authTag + ciphertext) for compact persistence.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}
