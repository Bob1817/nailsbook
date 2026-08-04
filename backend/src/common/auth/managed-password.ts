import * as crypto from 'crypto';

function encryptionKey(): Buffer {
  const secret =
    process.env.PASSWORD_VAULT_KEY ??
    process.env.ADMIN_JWT_SECRET ??
    process.env.JWT_SECRET;
  if (!secret)
    throw new Error('PASSWORD_VAULT_KEY or ADMIN_JWT_SECRET is required');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptManagedPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptManagedPassword(value: string): string {
  const [iv, authTag, encrypted] = value
    .split('.')
    .map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}
