import {
  createCipheriv,
  createSign,
  generateKeyPairSync,
  randomBytes,
} from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { WechatPayService } from './wechat-pay.service';

describe('WechatPayService payment notification', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const privateKey = keys.privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const apiV3Key = '12345678901234567890123456789012';
  const credentials = {
    appId: 'wx-app',
    merchantId: 'mch-1',
    merchantSerialNo: 'merchant-serial',
    merchantPrivateKey: privateKey,
    apiV3Key,
    verifierMode: 'platform_public_key',
    platformKeyId: 'PUB_KEY_ID_1',
    platformPublicKey: publicKey,
    paymentNotifyUrl: 'https://api.example.com/api/payments/wechat/notify',
  };
  const service = new WechatPayService({
    getPaymentCredentials: jest.fn().mockResolvedValue(credentials),
  } as any);

  function notification() {
    const transaction = JSON.stringify({
      trade_state: 'SUCCESS',
      transaction_id: 'wx-trade-1',
      out_trade_no: 'PAY1',
      appid: 'wx-app',
      mchid: 'mch-1',
      amount: { total: 5000 },
    });
    const nonce = randomBytes(12).toString('base64url').slice(0, 12);
    const associatedData = 'transaction';
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(apiV3Key),
      Buffer.from(nonce),
    );
    cipher.setAAD(Buffer.from(associatedData));
    const ciphertext = Buffer.concat([
      cipher.update(transaction, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString('base64');
    const rawBody = Buffer.from(
      JSON.stringify({
        event_type: 'TRANSACTION.SUCCESS',
        resource: {
          algorithm: 'AEAD_AES_256_GCM',
          ciphertext,
          associated_data: associatedData,
          nonce,
        },
      }),
    );
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signatureNonce = 'callback-nonce';
    const signature = createSign('RSA-SHA256')
      .update(`${timestamp}\n${signatureNonce}\n${rawBody.toString()}\n`)
      .sign(privateKey, 'base64');
    return {
      rawBody,
      headers: {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': signatureNonce,
        'wechatpay-signature': signature,
        'wechatpay-serial': 'PUB_KEY_ID_1',
      },
    };
  }

  it('验签并解密支付成功通知', async () => {
    const input = notification();
    await expect(
      service.parsePaymentNotification(input.headers, input.rawBody),
    ).resolves.toMatchObject({
      out_trade_no: 'PAY1',
      transaction_id: 'wx-trade-1',
    });
  });

  it('拒绝被篡改的通知正文', async () => {
    const input = notification();
    input.rawBody = Buffer.concat([input.rawBody, Buffer.from(' ')]);
    await expect(
      service.parsePaymentNotification(input.headers, input.rawBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
