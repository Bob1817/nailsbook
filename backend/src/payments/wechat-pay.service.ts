import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createDecipheriv,
  createSign,
  createVerify,
  randomBytes,
} from 'crypto';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';

type WechatNotification = {
  event_type?: string;
  resource?: {
    algorithm?: string;
    ciphertext?: string;
    associated_data?: string;
    nonce?: string;
  };
};

@Injectable()
export class WechatPayService {
  constructor(private readonly platformConfig: WechatPlatformConfigService) {}

  async createJsapiPayment(input: {
    paymentNo: string;
    amountCents: number;
    description: string;
    openId: string;
  }) {
    const credentials = await this.platformConfig.getPaymentCredentials();
    const path = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: credentials.appId,
      mchid: credentials.merchantId,
      description: input.description.slice(0, 127),
      out_trade_no: input.paymentNo,
      notify_url: credentials.paymentNotifyUrl,
      amount: { total: input.amountCents, currency: 'CNY' },
      payer: { openid: input.openId },
    });
    const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authorization('POST', path, body, credentials),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Luanails-Backend/1.0',
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as {
      prepay_id?: string;
      code?: string;
      message?: string;
    };
    if (!response.ok || !result.prepay_id) {
      throw new ServiceUnavailableException(
        `微信支付下单失败：${result.message || result.code || response.status}`,
      );
    }
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString('hex');
    const packageValue = `prepay_id=${result.prepay_id}`;
    const paySign = createSign('RSA-SHA256')
      .update(
        `${credentials.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`,
      )
      .sign(credentials.merchantPrivateKey, 'base64');
    return {
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: 'RSA',
      paySign,
    };
  }

  async parsePaymentNotification(
    headers: Record<string, unknown>,
    rawBody: Buffer,
  ) {
    const credentials = await this.platformConfig.getPaymentCredentials();
    const timestamp = this.header(headers, 'wechatpay-timestamp');
    const nonce = this.header(headers, 'wechatpay-nonce');
    const signature = this.header(headers, 'wechatpay-signature');
    const serial = this.header(headers, 'wechatpay-serial');
    if (!timestamp || !nonce || !signature || !serial || !rawBody?.length) {
      throw new UnauthorizedException('微信支付回调签名信息不完整');
    }
    if (serial !== credentials.platformKeyId) {
      throw new UnauthorizedException('微信支付回调验签密钥标识不匹配');
    }
    const timestampSeconds = Number(timestamp);
    if (
      !Number.isFinite(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) > 300
    ) {
      throw new UnauthorizedException('微信支付回调时间戳无效');
    }
    const signed = `${timestamp}\n${nonce}\n${rawBody.toString('utf8')}\n`;
    const valid = createVerify('RSA-SHA256')
      .update(signed)
      .verify(credentials.platformPublicKey, signature, 'base64');
    if (!valid) throw new UnauthorizedException('微信支付回调验签失败');

    const notification = JSON.parse(
      rawBody.toString('utf8'),
    ) as WechatNotification;
    const resource = notification.resource;
    if (
      resource?.algorithm !== 'AEAD_AES_256_GCM' ||
      !resource.ciphertext ||
      !resource.nonce
    ) {
      throw new BadRequestException('微信支付回调资源格式无效');
    }
    const encrypted = Buffer.from(resource.ciphertext, 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(credentials.apiV3Key, 'utf8'),
      Buffer.from(resource.nonce, 'utf8'),
    );
    decipher.setAuthTag(encrypted.subarray(encrypted.length - 16));
    decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'));
    const plaintext = Buffer.concat([
      decipher.update(encrypted.subarray(0, encrypted.length - 16)),
      decipher.final(),
    ]).toString('utf8');
    const transaction = JSON.parse(plaintext) as {
      trade_state?: string;
      transaction_id?: string;
      out_trade_no?: string;
      appid?: string;
      mchid?: string;
      amount?: { total?: number };
    };
    if (
      notification.event_type !== 'TRANSACTION.SUCCESS' ||
      transaction.trade_state !== 'SUCCESS'
    ) {
      throw new BadRequestException('不是支付成功通知');
    }
    if (
      transaction.appid !== credentials.appId ||
      transaction.mchid !== credentials.merchantId
    ) {
      throw new UnauthorizedException('微信支付回调商户身份不匹配');
    }
    return transaction;
  }

  private authorization(
    method: string,
    path: string,
    body: string,
    credentials: Awaited<
      ReturnType<WechatPlatformConfigService['getPaymentCredentials']>
    >,
  ) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const signature = createSign('RSA-SHA256')
      .update(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`)
      .sign(credentials.merchantPrivateKey, 'base64');
    return (
      `WECHATPAY2-SHA256-RSA2048 mchid="${credentials.merchantId}",` +
      `nonce_str="${nonce}",signature="${signature}",` +
      `timestamp="${timestamp}",serial_no="${credentials.merchantSerialNo}"`
    );
  }

  private header(headers: Record<string, unknown>, name: string) {
    const value = headers[name];
    return Array.isArray(value)
      ? value[0]
      : typeof value === 'string'
        ? value
        : '';
  }
}
