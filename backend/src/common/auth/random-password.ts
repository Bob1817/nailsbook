import * as crypto from 'crypto';

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generateRandomPassword(length = 12): string {
  return Array.from({ length }, () =>
    PASSWORD_CHARS.charAt(crypto.randomInt(PASSWORD_CHARS.length)),
  ).join('');
}
