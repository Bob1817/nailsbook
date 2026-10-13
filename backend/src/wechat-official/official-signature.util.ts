/**
 * 微信公众号（服务号）消息推送的签名校验与消息加解密。
 *
 * 参考：https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Message_encryption_and_decryption_instructions.html
 *  - 明文/兼容模式：签名参数为 token、timestamp、nonce
 *  - 安全模式：签名参数额外包含消息密文 encrypt
 *  - 加解密算法为 AES-256-CBC，密钥来自 EncodingAESKey（43 位 + 补一个 '='）
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** sha1 签名：token、timestamp、nonce（安全模式再加 encrypt）按字典序排序后拼接。 */
export function buildSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt?: string,
): string {
  const parts = encrypt
    ? [token, timestamp, nonce, encrypt]
    : [token, timestamp, nonce];
  return createHash('sha1').update(parts.sort().join('')).digest('hex');
}

export function verifySignature(input: {
  token: string;
  timestamp: string;
  nonce: string;
  signature: string;
  encrypt?: string;
}): boolean {
  if (!input.token || !input.timestamp || !input.nonce || !input.signature) {
    return false;
  }
  const expected = buildSignature(
    input.token,
    input.timestamp,
    input.nonce,
    input.encrypt,
  );
  return expected === input.signature;
}

function aesKeyFromEncodingAesKey(encodingAesKey: string): Buffer {
  if (encodingAesKey.length !== 43) {
    throw new Error('EncodingAESKey 长度必须为 43 位');
  }
  return Buffer.from(`${encodingAesKey}=`, 'base64');
}

/** PKCS#7 去填充（微信使用 32 字节块填充）。 */
function stripPkcs7(buffer: Buffer): Buffer {
  if (buffer.length === 0) {
    return buffer;
  }
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32 || pad > buffer.length) {
    return buffer;
  }
  for (let i = buffer.length - pad; i < buffer.length; i += 1) {
    if (buffer[i] !== pad) {
      return buffer;
    }
  }
  return buffer.subarray(0, buffer.length - pad);
}

export interface DecryptedMessage {
  message: string;
  appId: string;
}

/** 解密安全模式消息体：random(16) + msgLen(4) + msg + appId。 */
export function decryptMessage(
  encodingAesKey: string,
  encrypted: string,
): DecryptedMessage {
  const key = aesKeyFromEncodingAesKey(encodingAesKey);
  const iv = key.subarray(0, 16);
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);
  const content = stripPkcs7(decrypted);
  if (content.length < 20) {
    throw new Error('解密后的消息体长度异常');
  }
  const msgLength = content.readUInt32BE(16);
  const message = content.subarray(20, 20 + msgLength).toString('utf8');
  const appId = content
    .subarray(20 + msgLength)
    .toString('utf8')
    .replace(/[\u0000-\u001f]+$/g, '');
  return { message, appId };
}

/** 加密回复消息体（安全模式下回复也必须是密文）。 */
export function encryptMessage(
  encodingAesKey: string,
  message: string,
  appId: string,
): string {
  const key = aesKeyFromEncodingAesKey(encodingAesKey);
  const iv = key.subarray(0, 16);
  const messageBuffer = Buffer.from(message, 'utf8');
  const appIdBuffer = Buffer.from(appId, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

  const payload = Buffer.concat([
    randomBytes(16),
    lengthBuffer,
    messageBuffer,
    appIdBuffer,
  ]);
  const remainder = payload.length % 32;
  const padLength = remainder === 0 ? 32 : 32 - remainder;
  const padding = Buffer.alloc(padLength, padLength);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.concat([payload, padding])),
    cipher.final(),
  ]);
  return encrypted.toString('base64');
}
