import { Injectable } from '@nestjs/common';

/**
 * Serializes booking slot mutations per technician for the current
 * single-process SQLite deployment.
 */
@Injectable()
export class BookingMutexService {
  private readonly tails = new Map<number, Promise<void>>();

  async runExclusive<T>(technicianId: number, task: () => Promise<T>) {
    const previous = this.tails.get(technicianId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => current);
    this.tails.set(technicianId, tail);

    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (this.tails.get(technicianId) === tail) {
        this.tails.delete(technicianId);
      }
    }
  }
}
