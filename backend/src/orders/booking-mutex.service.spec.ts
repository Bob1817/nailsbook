import { BookingMutexService } from './booking-mutex.service';

describe('BookingMutexService', () => {
  it('同一美甲师的档期写入按提交顺序串行执行', async () => {
    const mutex = new BookingMutexService();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    let markFirstStarted: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });

    const first = mutex.runExclusive(7, async () => {
      events.push('first:start');
      markFirstStarted();
      await firstGate;
      events.push('first:end');
    });
    const second = mutex.runExclusive(7, async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await firstStarted;
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);

    expect(events).toEqual([
      'first:start',
      'first:end',
      'second:start',
      'second:end',
    ]);
  });

  it('不同美甲师的档期写入可以并行执行', async () => {
    const mutex = new BookingMutexService();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = mutex.runExclusive(7, async () => {
      events.push('tech7:start');
      await firstGate;
    });
    const second = mutex.runExclusive(8, async () => {
      events.push('tech8:start');
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['tech7:start', 'tech8:start']);
    releaseFirst();
    await Promise.all([first, second]);
  });
});
