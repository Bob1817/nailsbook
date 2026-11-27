import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import { getClientJwtSecret } from '../client-auth/client-auth.config';
import {
  DEMO_CLIENT_PHONE,
  DEMO_FEATURE_FLAG_CODE,
  DEMO_SEED_VERSION,
  DEMO_SERVICE_ITEMS,
  DEMO_TECHNICIAN_PHONE,
  ensureDemoClientUser,
  seedDemoTenant,
  SHOWCASE_TECHNICIAN_PHONE,
} from './demo.seed';

@Injectable()
export class DemoService implements OnModuleInit {
  private readonly logger = new Logger(DemoService.name);
  private resetInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureFeatureFlag();
      const showcaseExists = await this.prisma.technician.findUnique({
        where: { phone: SHOWCASE_TECHNICIAN_PHONE },
        select: { id: true },
      });
      const demoExists = await this.prisma.technician.findUnique({
        where: { phone: DEMO_TECHNICIAN_PHONE },
        select: { id: true },
      });
      if (!showcaseExists || !demoExists) {
        await this.resetDemoData('init', true);
      }
    } catch (error) {
      this.logger.warn(
        `Demo initialization skipped/deferred: ${(error as Error).message}`,
      );
    }
  }

  private async ensureFeatureFlag() {
    await this.prisma.featureFlag.upsert({
      where: { featureCode: DEMO_FEATURE_FLAG_CODE },
      create: {
        featureCode: DEMO_FEATURE_FLAG_CODE,
        featureName: '演示与样板间模式开关',
        enabled: true,
        description: '控制官网样板间与共享 Demo 工作台是否开放（D6 一键停用开关）',
      },
      update: {},
    });
  }

  async isDemoEnabled(): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { featureCode: DEMO_FEATURE_FLAG_CODE },
      select: { enabled: true },
    });
    return flag ? flag.enabled : true;
  }

  /**
   * 一期：免登录只读样板间数据（完全隔离于真实账号，不含任何真实客户隐私）
   */
  async getShowcaseData() {
    let tech = await this.prisma.technician.findUnique({
      where: { phone: SHOWCASE_TECHNICIAN_PHONE },
      include: {
        nailWorks: {
          where: { isVisible: true, visibilityScope: 'public' },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { likes: true, favorites: true } },
          },
        },
      },
    });

    if (!tech) {
      await this.resetDemoData('init', true);
      tech = await this.prisma.technician.findUnique({
        where: { phone: SHOWCASE_TECHNICIAN_PHONE },
        include: {
          nailWorks: {
            where: { isVisible: true, visibilityScope: 'public' },
            orderBy: { sortOrder: 'asc' },
            include: {
              _count: { select: { likes: true, favorites: true } },
            },
          },
        },
      });
    }

    if (!tech) {
      throw new ServiceUnavailableException('样板间数据暂未就绪');
    }

    const demoTech = await this.prisma.technician.findUnique({
      where: { phone: DEMO_TECHNICIAN_PHONE },
      select: { id: true },
    });

    const works = tech.nailWorks.map((w) => {
      let styleTags: string[] = [];
      let images: string[] = [];
      try {
        styleTags = w.tags ? JSON.parse(w.tags) : [];
      } catch {}
      try {
        images = w.images ? JSON.parse(w.images) : [];
      } catch {}
      const durationMatch = w.designIdea?.match(/(\d+)/);
      const durationMinutes = durationMatch ? Number(durationMatch[1]) : 90;
      return {
        id: w.id,
        title: w.title,
        description: w.description,
        price: w.price ?? 198,
        durationMinutes,
        styleTags,
        coverImage: w.coverUrl || images[0] || '/images/campaign-cases/case-work-detail.webp',
        images,
        likesCount: (w._count?.likes ?? 0) + 18 + w.sortOrder * 3,
        favoritesCount: (w._count?.favorites ?? 0) + 9 + w.sortOrder * 2,
      };
    });

    let styleTags: string[] = [];
    try {
      styleTags = tech.styleTags ? JSON.parse(tech.styleTags) : [];
    } catch {}

    let serviceItems = DEMO_SERVICE_ITEMS;
    try {
      if (tech.serviceItems) {
        serviceItems = JSON.parse(tech.serviceItems);
      }
    } catch {}

    const demoEnabled = await this.isDemoEnabled();

    return {
      readOnly: true,
      seedVersion: DEMO_SEED_VERSION,
      demoEnabled,
      demoTechnicianId: demoTech?.id ?? tech.id,
      artist: {
        id: tech.id,
        name: tech.name,
        shopName: '栖木美甲工作室',
        avatarUrl: tech.avatarUrl || 'https://lunails.cn/onlynail-logo.jpg',
        coverImageUrl:
          tech.coverImageUrl || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
        city: tech.city || '上海',
        serviceArea: tech.serviceArea || '静安区 / 徐汇区（演示范围）',
        bio: tech.bio,
        servicePhilosophy: tech.servicePhilosophy,
        bookingNotes: tech.bookingNotes,
        styleTags,
        homeService: tech.homeService,
        shopService: tech.shopService,
        dailyBookingLimit: tech.dailyBookingLimit,
        appointmentBufferMinutes: tech.appointmentBufferMinutes,
      },
      works,
      serviceItems,
      appointmentStatuses: [
        {
          code: 'pending_quote',
          label: '待报价',
          summary: '顾客发送参考图后，美甲师 10 秒生成明细报价单',
          sampleAmount: 268,
        },
        {
          code: 'pending_confirm',
          label: '待确认',
          summary: '顾客收到透明价目与耗时预估，一键确认时段',
          sampleAmount: 298,
        },
        {
          code: 'confirmed',
          label: '已确认',
          summary: '系统高亮提醒顾客甲型特征与避坑禁忌（如指缘薄、需建构）',
          sampleAmount: 158,
        },
        {
          code: 'completed',
          label: '已完成',
          summary: '自动沉淀本次配色与胶号档案，复购可直接查看',
          sampleAmount: 268,
        },
      ],
    };
  }

  /**
   * 一期：只读快捷报价预览计算（无落库）
   */
  calculateShowcaseQuotePreview(input: {
    workPrice?: number;
    workDurationMinutes?: number;
    addonIds?: string[];
  }) {
    const basePrice = Math.max(0, Number(input.workPrice || 238));
    const baseDuration = Math.max(30, Number(input.workDurationMinutes || 90));
    const addonIds = Array.isArray(input.addonIds) ? input.addonIds : [];

    const selectedAddons = DEMO_SERVICE_ITEMS.filter((item) =>
      addonIds.includes(item.id),
    );
    const addonPrice = selectedAddons.reduce((sum, item) => sum + item.price, 0);
    const addonDuration = selectedAddons.reduce(
      (sum, item) => sum + item.durationMinutes,
      0,
    );

    return {
      readOnly: true,
      basePrice,
      baseDurationMinutes: baseDuration,
      addons: selectedAddons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
        durationMinutes: a.durationMinutes,
      })),
      totalPrice: basePrice + addonPrice,
      totalDurationMinutes: baseDuration + addonDuration,
      note: '此为样板间只读报价预览，不会发送给真实美甲师或产生订单',
    };
  }

  /**
   * 二期：一键免密进入共享 Demo 账号（D2：后端发放仅限 Demo 租户的临时会话）
   */
  async enterDemoWorkspace(role: 'technician' | 'client' = 'technician') {
    const enabled = await this.isDemoEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('演示环境维护中，请稍后再试');
    }

    if (role === 'client') {
      const client = await ensureDemoClientUser(this.prisma);
      const demoTech = await this.prisma.technician.findUnique({
        where: { phone: DEMO_TECHNICIAN_PHONE },
        select: { id: true, name: true },
      });
      const secret = getClientJwtSecret(this.configService);
      const token = this.jwtService.sign(
        {
          sub: client.id,
          phone: client.phone,
          userType: 'client',
          tv: client.tokenVersion,
          isDemo: true,
        },
        { secret, expiresIn: '4h' },
      );
      this.logger.log(`[DEMO LOGIN] role=client id=${client.id}`);
      return {
        accessToken: token,
        role: 'client',
        isDemo: true,
        resetScheduleText: '每日凌晨 04:00 自动重置',
        demoTechnicianId: demoTech?.id ?? null,
        user: {
          id: client.id,
          nickname: client.nickname,
          avatarUrl: client.avatarUrl,
          isDemo: true,
        },
      };
    }

    let tech = await this.prisma.technician.findUnique({
      where: { phone: DEMO_TECHNICIAN_PHONE },
    });
    if (!tech) {
      await this.resetDemoData('init', true);
      tech = await this.prisma.technician.findUnique({
        where: { phone: DEMO_TECHNICIAN_PHONE },
      });
    }
    if (!tech) {
      throw new ServiceUnavailableException('演示工作台初始化中，请稍后再试');
    }

    const techSecret =
      this.configService.get<string>('TECHNICIAN_JWT_SECRET') ??
      this.configService.get<string>('JWT_SECRET');
    const token = this.jwtService.sign(
      {
        sub: tech.id,
        phone: tech.phone,
        userType: 'technician',
        tv: tech.tokenVersion,
        isDemo: true,
      },
      { secret: techSecret, expiresIn: '4h' },
    );

    this.logger.log(`[DEMO LOGIN] role=technician id=${tech.id}`);
    return {
      accessToken: token,
      role: 'technician',
      isDemo: true,
      resetScheduleText: '每日凌晨 04:00 自动重置',
      user: {
        id: tech.id,
        name: tech.name,
        shopName: '栖木美甲工作室 · 演示版',
        avatarUrl: tech.avatarUrl,
        isDemo: true,
      },
    };
  }

  /**
   * 每日北京时间 04:00 自动重置共享 Demo 数据（D3 & DR-6）
   */
  @Cron('0 4 * * *', { timeZone: 'Asia/Shanghai' })
  async handleScheduledReset() {
    this.logger.log('Running scheduled 04:00 CST Demo data reset...');
    await this.resetDemoData('cron', false);
  }

  /**
   * 幂等重置 Demo 数据（DR-6 — DR-11）
   */
  async resetDemoData(
    trigger: 'cron' | 'manual' | 'init' = 'manual',
    includeShowcase = false,
  ) {
    if (this.resetInProgress) {
      return {
        skipped: true,
        message: '重置任务正在执行中',
      };
    }

    this.resetInProgress = true;
    const startedAt = new Date();
    let affectedTech = 0;

    try {
      const demoClient = await ensureDemoClientUser(this.prisma);

      if (includeShowcase) {
        await seedDemoTenant(this.prisma, {
          phone: SHOWCASE_TECHNICIAN_PHONE,
          name: 'Luna',
          shopName: '栖木美甲工作室',
          invitationCode: 'DEMO_SHOWCASE',
          prefix: 'SHOWCASE',
          demoClientId: demoClient.id,
        });
        affectedTech += 1;
      }

      await seedDemoTenant(this.prisma, {
        phone: DEMO_TECHNICIAN_PHONE,
        name: 'Luna（演示工作台）',
        shopName: '栖木美甲工作室 · 演示版',
        invitationCode: 'DEMO_WORKSPACE',
        prefix: 'DEMO',
        demoClientId: demoClient.id,
      });
      affectedTech += 1;

      this.cleanupDemoUploadsDir();

      const log = await this.prisma.demoResetLog.create({
        data: {
          seedVersion: DEMO_SEED_VERSION,
          trigger,
          status: 'success',
          affectedTech,
          message: `已重置 ${affectedTech} 个演示租户并清理 Demo 上传目录`,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `[DEMO RESET] trigger=${trigger} version=${DEMO_SEED_VERSION} affectedTech=${affectedTech}`,
      );
      return log;
    } catch (error) {
      const errMsg = (error as Error).message || 'Unknown demo reset error';
      this.logger.error(`[DEMO RESET FAILED] ${errMsg}`);
      await this.prisma.demoResetLog
        .create({
          data: {
            seedVersion: DEMO_SEED_VERSION,
            trigger,
            status: 'failed',
            affectedTech,
            message: errMsg,
            startedAt,
            finishedAt: new Date(),
          },
        })
        .catch(() => {});
      await this.prisma.systemErrorLog
        .create({
          data: {
            source: 'backend',
            errorType: 'demo_reset_failed',
            message: `Demo 自动/手动重置失败 (${trigger}): ${errMsg}`,
            stack: (error as Error).stack?.slice(0, 2000),
            route: '/api/admin/demo/reset',
          },
        })
        .catch(() => {});
      throw error;
    } finally {
      this.resetInProgress = false;
    }
  }

  private cleanupDemoUploadsDir() {
    const demoDir = path.resolve(process.cwd(), 'uploads', 'demo');
    if (fs.existsSync(demoDir)) {
      fs.rmSync(demoDir, { recursive: true, force: true });
    }
  }

  async getAdminDemoStatus() {
    const [enabled, recentLogs, demoTech, showcaseTech] = await Promise.all([
      this.isDemoEnabled(),
      this.prisma.demoResetLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.technician.findUnique({
        where: { phone: DEMO_TECHNICIAN_PHONE },
        select: {
          id: true,
          name: true,
          _count: { select: { nailWorks: true, customers: true, orders: true } },
        },
      }),
      this.prisma.technician.findUnique({
        where: { phone: SHOWCASE_TECHNICIAN_PHONE },
        select: {
          id: true,
          name: true,
          _count: { select: { nailWorks: true, customers: true, orders: true } },
        },
      }),
    ]);

    return {
      enabled,
      seedVersion: DEMO_SEED_VERSION,
      scheduleCron: '0 4 * * * (Asia/Shanghai)',
      demoTech,
      showcaseTech,
      recentLogs,
    };
  }

  async toggleDemoMode(enabled: boolean) {
    await this.prisma.featureFlag.upsert({
      where: { featureCode: DEMO_FEATURE_FLAG_CODE },
      create: {
        featureCode: DEMO_FEATURE_FLAG_CODE,
        featureName: '演示与样板间模式开关',
        enabled,
        description: '控制官网样板间与共享 Demo 工作台是否开放（D6 一键停用开关）',
      },
      update: { enabled },
    });
    return { enabled };
  }
}
