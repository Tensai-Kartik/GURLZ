import crypto from 'crypto';

const Buffer = (globalThis as any).Buffer;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getEncryptionKey = (): any => {
  const keyEnv = process.env.ENCRYPTION_KEY;
  if (keyEnv) {
    return crypto.scryptSync(keyEnv, 'gurlz-salt', KEY_LENGTH);
  }
  return crypto.scryptSync('demo-encryption-key-change-in-production', 'gurlz-salt', KEY_LENGTH);
};

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]).toString('base64');
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedData, 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
