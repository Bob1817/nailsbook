import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ThrottlerStorageService } from '@nestjs/throttler';

/**
 * 定期清理限流器内存 Map，防止过期记录残留导致内存膨胀
 * && GC 压力增大 && CPU 飙高
 *
 * 原理：NestJS 默认 ThrottlerStorageService 用内存 Map 存限流记录，
 * 高 QPS 下每个 IP 的每条请求都写入一条，TTL 到期后标记过期但不会主动释放，
 * Map 持续增长导致频繁 GC。
 */
@Injectable()
export class ThrottlerCleanupService {
  private readonly logger = new Logger(ThrottlerCleanupService.name);

  constructor(
    @Optional() private readonly storage: ThrottlerStorageService,
  ) {}

  /** 每 2 分钟清理过期记录（2GB 服务器：更频繁释放内存） */
  @Cron('0 */2 * * * *')
  handleCleanup() {
    if (!this.storage) return;
    const map = (this.storage as any)._storage as Map<
      string,
      { totalHits: number; expiresAt: number }
    >;
    if (!map || typeof map.forEach !== 'function') return;

    const now = Date.now();
    let removed = 0;

    map.forEach((record, key) => {
      if (record.expiresAt && record.expiresAt < now) {
        map.delete(key);
        removed++;
      }
    });

    if (removed > 0) {
      this.logger.log(`清理了 ${removed} 条过期限流记录（当前 ${map.size} 条）`);
    }
  }
}
