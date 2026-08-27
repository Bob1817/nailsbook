import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import {
  ContractTestApp,
  createContractTestApp,
  prepareContractSqliteDatabase,
} from './test-app';

describe('HTTP throttling contract', () => {
  let testApp: ContractTestApp;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-throttling-contract-'));
    const databaseUrl = `file:${resolve(tempDir, 'throttling-contract.db')}`;
    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await testApp?.cleanup();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('isolates the default request budget by forwarded client IP', async () => {
    const server = testApp.app.getHttpServer();
    const firstClient = '203.0.113.10';
    const secondClient = '198.51.100.20';

    for (let index = 0; index < 300; index += 1) {
      await request(server)
        .get('/api')
        .set('X-Forwarded-For', firstClient)
        .expect(200);
    }

    const limited = await request(server)
      .get('/api')
      .set('X-Forwarded-For', firstClient)
      .expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(limited.body).toMatchObject({ statusCode: 429 });
    expect(limited.body.message).toContain('秒后重试');

    await request(server)
      .get('/api')
      .set('X-Forwarded-For', secondClient)
      .expect(200);
  });
});
