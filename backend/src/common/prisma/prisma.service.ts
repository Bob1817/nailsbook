import { BadRequestException, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function buildSqliteSafeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  if (!rawUrl.startsWith('file:')) return rawUrl;
  if (/[?&]connection_limit=/.test(rawUrl)) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}connection_limit=1`;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = buildSqliteSafeDatabaseUrl(process.env.DATABASE_URL);
    super({
      ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
      transactionOptions: {
        maxWait: 10000,
        timeout: 15000,
      },
    });
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        // SQLite trigger RAISE errors are surfaced by Prisma 5 as P2003,
        // without the trigger message. Confirm the actual capacity before
        // translating, so genuine foreign-key failures retain their meaning.
        if (error?.code === 'P2003' && params.model === 'ClientTechBinding') {
          const existing = params.args?.where
            ? await this.clientTechBinding.findUnique({ where: params.args.where }) : null;
          const clientId = params.args?.data?.clientId ?? params.args?.create?.clientId ?? existing?.clientId;
          if (clientId && await this.clientTechBinding.count({ where: {
            clientId, status: { in: ['active', 'pending'] }, ...(existing ? { id: { not: existing.id } } : {}),
          } }) >= 5) {
            throw new BadRequestException({ code: 'BINDING_CAPACITY_REACHED', message: '最多绑定 5 位美甲师（含待确认申请），请先在我的美甲师中管理已有关系' });
          }
        }
        if (error?.code === 'P2003' && params.model === 'NailWork') {
          if (params.args?.data?.heroSlot != null) {
            throw new BadRequestException('仅可推荐公开可见、审核通过、未归档且有封面的作品');
          }
          if (params.args?.data?.isFeatured === true) {
            const existing = params.args?.where ? await this.nailWork.findUnique({ where: params.args.where }) : null;
            const techId = params.args.data.techId ?? existing?.techId;
            if (techId && await this.nailWork.count({ where: { techId, isFeatured: true } }) >= 6) {
              throw new BadRequestException('个人主页最多精选 6 个作品，请先取消一个精选作品');
            }
          }
        }
        throw error;
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    // SQLite 并发写保护：单连接排队 + busy_timeout 防 SQLITE_BUSY + WAL/NORMAL 降低写锁与落盘开销
    await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.$queryRawUnsafe('PRAGMA synchronous = NORMAL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
