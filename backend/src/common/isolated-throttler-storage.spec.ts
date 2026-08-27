import { IsolatedThrottlerStorage } from './isolated-throttler-storage';

describe('IsolatedThrottlerStorage', () => {
  afterEach(() => jest.useRealTimers());

  it('keeps a normal caller independent across repeated attacker block/unblock cycles', async () => {
    jest.useFakeTimers().setSystemTime(0);
    const storage = new IsolatedThrottlerStorage();
    let blocked = 0;
    for (let second = 0; second < 600; second++) {
      jest.setSystemTime(second * 1000);
      for (let request = 0; request < 7; request++) {
        if ((await storage.increment('A', 60000, 300, 60000, 'default')).isBlocked) blocked++;
      }
      for (let request = 0; request < 2; request++) {
        expect((await storage.increment('B', 60000, 300, 60000, 'default')).isBlocked).toBe(false);
      }
    }
    expect(blocked).toBeGreaterThan(0);
  });

  it('does not extend a block on retries and isolates named policies', async () => {
    jest.useFakeTimers().setSystemTime(0);
    const storage = new IsolatedThrottlerStorage();
    await storage.increment('A', 1000, 1, 2000, 'login');
    expect((await storage.increment('A', 1000, 1, 2000, 'login')).isBlocked).toBe(true);
    expect((await storage.increment('A', 1000, 1, 2000, 'upload')).isBlocked).toBe(false);
    jest.setSystemTime(1500);
    expect((await storage.increment('A', 1000, 1, 2000, 'login')).timeToBlockExpire).toBe(1);
    jest.setSystemTime(2000);
    expect((await storage.increment('A', 1000, 1, 2000, 'login')).isBlocked).toBe(false);
  });
});
