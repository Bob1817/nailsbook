import express from 'express';
import request from 'supertest';
import { TRUSTED_PROXY_ADDRESSES } from './trusted-proxy';

describe('trusted proxy configuration', () => {
  const app = express();
  app.set('trust proxy', TRUSTED_PROXY_ADDRESSES);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));

  it.each(['203.0.113.10', '198.51.100.20'])(
    'uses forwarded client address %s behind the trusted local proxy',
    async (clientIp) => {
      await request(app)
        .get('/ip')
        .set('X-Forwarded-For', clientIp)
        .expect(200)
        .expect({ ip: clientIp });
    },
  );

  it('stops at the first untrusted address in a forwarded chain', async () => {
    await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '192.0.2.99, 203.0.113.30')
      .expect(200)
      .expect({ ip: '203.0.113.30' });
  });
});
