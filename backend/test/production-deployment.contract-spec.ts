const baseUrl = process.env.DEPLOYMENT_BASE_URL?.replace(/\/$/, '');
const describeDeployment = baseUrl ? describe : describe.skip;

const get = (path: string) => {
  if (!baseUrl) {
    throw new Error('DEPLOYMENT_BASE_URL is required');
  }

  return fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
};

describeDeployment('production deployment contract', () => {
  it('reports a healthy public API', async () => {
    const response = await get('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it.each([
    '/api/technician/orders/1',
    '/api/technician/works/1',
    '/api/client/orders/1',
  ])('keeps %s behind authentication', async (path) => {
    const response = await get(path);

    expect(response.status).toBe(401);
  });
});
