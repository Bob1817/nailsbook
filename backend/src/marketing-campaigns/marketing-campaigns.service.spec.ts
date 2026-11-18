import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaignsService } from './marketing-campaigns.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

describe('MarketingCampaignsService', () => {
  let service: MarketingCampaignsService;
  let prisma: any;
  let chatGateway: any;

  beforeEach(async () => {
    prisma = {
      clientTechBinding: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          { clientId: 101 },
          { clientId: 102 },
          { clientId: 103 },
        ]),
      },
      technicianNotice: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      technicianActivity: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn().mockResolvedValue({ id: 501, clientId: 101, techId: 7 }),
        create: jest.fn().mockResolvedValue({ id: 502, clientId: 102, techId: 7 }),
        update: jest.fn().mockResolvedValue({ id: 501 }),
      },
      message: {
        create: jest.fn().mockResolvedValue({ id: 9001 }),
      },
    };

    chatGateway = {
      broadcastMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChatGateway, useValue: chatGateway },
      ],
    }).compile();

    service = module.get<MarketingCampaignsService>(MarketingCampaignsService);
  });

  describe('Notice Publishing', () => {
    it('should create and immediately dispatch notice when not scheduled', async () => {
      const mockNotice = {
        id: 1,
        technicianId: 7,
        title: '春节放假通知',
        content: '本店将于1月20日至28日放假调休。',
        status: 'draft',
        coveredCount: 3,
      };

      prisma.technicianNotice.create.mockResolvedValue(mockNotice);
      prisma.technicianNotice.findUnique.mockResolvedValue({
        ...mockNotice,
        technician: { id: 7, name: '贝贝', avatarUrl: 'avatar.jpg' },
      });
      prisma.technicianNotice.update.mockResolvedValue({
        ...mockNotice,
        status: 'published',
      });

      const result = await service.createNotice(7, {
        title: '春节放假通知',
        content: '本店将于1月20日至28日放假调休。',
      });

      expect(prisma.technicianNotice.create).toHaveBeenCalled();
      expect(prisma.clientTechBinding.findMany).toHaveBeenCalledWith({
        where: { techId: 7, status: 'active' },
        select: { clientId: true },
      });
      expect(prisma.message.create).toHaveBeenCalledTimes(3);
      expect(chatGateway.broadcastMessage).toHaveBeenCalledTimes(3);
      expect(result.status).toBe('published');
    });

    it('should mark notice as scheduled when scheduledAt is in the future', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const mockScheduledNotice = {
        id: 2,
        technicianId: 7,
        title: '定时通知',
        content: '明日提醒',
        status: 'scheduled',
        scheduledAt: new Date(future),
        coveredCount: 3,
      };

      prisma.technicianNotice.create.mockResolvedValue(mockScheduledNotice);

      const result = await service.createNotice(7, {
        title: '定时通知',
        content: '明日提醒',
        isScheduled: true,
        scheduledAt: future,
      });

      expect(result.status).toBe('scheduled');
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });

  describe('Activity Management', () => {
    it('should create and dispatch activity and recommend to hero by default', async () => {
      const mockActivity = {
        id: 10,
        technicianId: 7,
        title: '冬日美甲新品特惠',
        coverUrl: 'https://cdn.lunails.cn/activity.jpg',
        recommendToHero: true,
        contentBlocks: JSON.stringify([{ type: 'text', content: '活动详情' }]),
        status: 'draft',
      };

      prisma.technicianActivity.create.mockResolvedValue(mockActivity);
      prisma.technicianActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        technician: { id: 7, name: '贝贝', avatarUrl: 'avatar.jpg' },
      });
      prisma.technicianActivity.update.mockResolvedValue({
        ...mockActivity,
        status: 'active',
      });

      const result = await service.createActivity(7, {
        title: '冬日美甲新品特惠',
        coverUrl: 'https://cdn.lunails.cn/activity.jpg',
      });

      expect(prisma.technicianActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendToHero: true,
            status: 'draft',
          }),
        }),
      );
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageType: 'activity',
            content: '冬日美甲新品特惠',
            imageUrl: 'https://cdn.lunails.cn/activity.jpg',
          }),
        }),
      );
      expect(result.status).toBe('active');
    });

    it('should support copying a historical activity as draft', async () => {
      const historical = {
        id: 10,
        technicianId: 7,
        title: '去年圣诞特惠',
        coverUrl: 'https://cdn.lunails.cn/old.jpg',
        recommendToHero: true,
        contentBlocks: '[]',
        status: 'ended',
      };

      prisma.technicianActivity.findFirst.mockResolvedValue(historical);
      prisma.technicianActivity.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 11, ...data }),
      );

      const copied = await service.copyActivity(7, 10);
      expect(copied.title).toContain('去年圣诞特惠 (副本)');
      expect(copied.status).toBe('draft');
      expect(copied.coverUrl).toBe(historical.coverUrl);
    });

    it('should automatically take expired activities off hero during cron scan', async () => {
      const expiredAct = {
        id: 99,
        technicianId: 7,
        title: '已过期活动',
        status: 'active',
        endTime: new Date(Date.now() - 3600000),
      };

      prisma.technicianNotice.findMany.mockResolvedValue([]);
      prisma.technicianActivity.findMany.mockImplementation(({ where }: any) => {
        if (where && where.status === 'active' && where.endTime) {
          return Promise.resolve([expiredAct]);
        }
        return Promise.resolve([]);
      });
      prisma.technicianActivity.update.mockResolvedValue({
        ...expiredAct,
        status: 'ended',
        recommendToHero: false,
      });

      const res = await service.handleScheduledAndExpiredJobs();
      expect(res.expiredActivities).toBe(1);
      expect(prisma.technicianActivity.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { status: 'ended', recommendToHero: false },
      });
    });
  });
});
