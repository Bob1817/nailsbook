import { ThrottlerStorage } from '@nestjs/throttler';

/** Per-key fixed windows; unblocking one caller never changes another caller's expiry. */
export class IsolatedThrottlerStorage implements ThrottlerStorage {
  private readonly entries = new Map<string, { hits: number; expiresAt: number; blockedUntil: number }>();
  private nextSweep = 0;

  async increment(key: string, ttl: number, limit: number, blockDuration: number, name: string) {
    const now = Date.now();
    if (now >= this.nextSweep) {
      for (const [id, entry] of this.entries) {
        if (Math.max(entry.expiresAt, entry.blockedUntil) <= now) this.entries.delete(id);
      }
      this.nextSweep = now + 60000;
    }
    const id = JSON.stringify([name, key]);
    let entry = this.entries.get(id);
    if (!entry || (entry.blockedUntil > 0 ? entry.blockedUntil <= now : entry.expiresAt <= now)) {
      entry = { hits: 0, expiresAt: now + ttl, blockedUntil: 0 };
      this.entries.set(id, entry);
    }
    if (entry.blockedUntil <= now) {
      entry.hits++;
      if (entry.hits > limit) entry.blockedUntil = now + blockDuration;
    }
    return {
      totalHits: entry.hits,
      timeToExpire: Math.max(0, Math.ceil((entry.expiresAt - now) / 1000)),
      isBlocked: entry.blockedUntil > now,
      timeToBlockExpire: Math.max(0, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }
}
