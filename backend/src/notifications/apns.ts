import { connect } from 'node:http2';
import { sign } from 'jsonwebtoken';
import type { PushPayload } from './push.service';

let providerToken: { value: string; issuedAt: number; keyId: string; teamId: string } | undefined;

// APNs device tokens must never be sent to FCM. Credentials stay server-side.
export async function sendAPNs(tokens: string[], payload: PushPayload, sandbox: boolean): Promise<{ invalid: string[]; failures: string[] }> {
  const key = process.env.APNS_PRIVATE_KEY_BASE64;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const topic = process.env.APNS_BUNDLE_ID;
  if (!tokens.length) return { invalid: [], failures: [] };
  if (!key || !keyId || !teamId || !topic) throw new Error('APNs credentials are not configured');
  const now = Math.floor(Date.now() / 1000);
  if (!providerToken || now - providerToken.issuedAt >= 3000 || providerToken.keyId !== keyId || providerToken.teamId !== teamId) {
    providerToken = { value: sign({}, Buffer.from(key, 'base64').toString('utf8'), {
      algorithm: 'ES256', keyid: keyId, issuer: teamId,
    }), issuedAt: now, keyId, teamId };
  }
  const authorization = providerToken.value;
  const body = JSON.stringify({ ...payload.data, aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' } });
  if (Buffer.byteLength(body) > 4096) throw new Error('APNs payload exceeds 4096 bytes');
  const session = connect(sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
  // Individual streams propagate errors; avoid an unhandled session error.
  session.on('error', () => {});
  session.setTimeout(15000, () => session.destroy());
  const invalid: string[] = [];
  const failures: string[] = [];
  try {
    for (const token of tokens) {
      try {
        const status = await new Promise<number>((resolve, reject) => {
          const request = session.request({
            ':method': 'POST', ':path': `/3/device/${encodeURIComponent(token)}`,
            authorization: `bearer ${authorization}`, 'apns-topic': topic,
            'apns-push-type': 'alert', 'apns-priority': '10',
            'content-type': 'application/json',
          });
          let status = 0;
          request.on('response', headers => { status = Number(headers[':status']); });
          request.on('data', () => {});
          request.on('error', reject);
          request.on('end', () => resolve(status));
          request.on('close', () => reject(new Error('APNs connection closed before completion')));
          request.setTimeout(10000, () => request.destroy(new Error('APNs request timed out')));
          request.end(body);
        });
        if (status === 410) invalid.push(token);
        else if (status !== 200) failures.push(`APNs request failed (${status})`);
      } catch {
        // 不记录设备令牌；单个设备失败不丢弃已收集的失效令牌。
        failures.push('APNs transport failed');
      }
    }
  } finally {
    session.close();
  }
  return { invalid, failures };
}
