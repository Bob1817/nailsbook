import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformCampaignsService } from './platform-campaigns.service';

describe('PlatformCampaignsService', () => {
  let service: PlatformCampaignsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      platformCampaign: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformCampaignsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlatformCampaignsService>(PlatformCampaignsService);
  });

  describe('computeEffectiveStatus', () => {
    it('should return draft if status is draft', () => {
      expect(service.computeEffectiveStatus({ status: 'draft' })).toBe('draft');
    });

    it('should return offline if status is offline', () => {
      expect(service.computeEffectiveStatus({ status: 'offline' })).toBe('offline');
    });

    it('should return scheduled if start time is in future', () => {
      const future = new Date(Date.now() + 86400000);
      expect(
        service.computeEffectiveStatus({
          status: 'active',
          startTime: future,
        }),
      ).toBe('scheduled');
    });

    it('should return ended if end time is in past', () => {
      const past = new Date(Date.now() - 86400000);
      expect(
        service.computeEffectiveStatus({
          status: 'active',
          endTime: past,
        }),
      ).toBe('ended');
    });

    it('should return active if within valid time range', () => {
      const past = new Date(Date.now() - 3600000);
      const future = new Date(Date.now() + 86400000);
      expect(
        service.computeEffectiveStatus({
          status: 'active',
          startTime: past,
          endTime: future,
        }),
      ).toBe('active');
    });
  });

  describe('create', () => {
    it('should throw BadRequestException if title is empty', async () => {
      await expect(service.create({ title: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create campaign and parse locations', async () => {
      const mockCampaign = {
        id: 1,
        title: '标杆美甲师扶持活动',
        summary: '全套配置代录',
        coverUrl: 'https://cdn.example.com/cover.png',
        badgeText: '官方扶持',
        content: '<p>欢迎报名标杆美甲师</p>',
        targetAudience: 'technician',
        displayLocations: JSON.stringify(['technician_home_hero']),
        actionType: 'page',
        actionUrl: '/pages/technician/apply/index',
        status: 'draft',
        sortOrder: 10,
        viewCount: 0,
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.platformCampaign.create.mockResolvedValue(mockCampaign);
      prisma.platformCampaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.create({
        title: '标杆美甲师扶持活动',
        summary: '全套配置代录',
        coverUrl: 'https://cdn.example.com/cover.png',
        badgeText: '官方扶持',
        content: '<p>欢迎报名标杆美甲师</p>',
        targetAudience: 'technician',
        displayLocations: ['technician_home_hero'],
        actionType: 'page',
        actionUrl: '/pages/technician/apply/index',
      });

      expect(result.id).toBe(1);
      expect(result.title).toBe('标杆美甲师扶持活动');
      expect(result.displayLocations).toEqual(['technician_home_hero']);
      expect(result.effectiveStatus).toBe('draft');
    });
  });

  describe('listAdmin', () => {
    it('should return paginated list and counts', async () => {
      prisma.platformCampaign.count.mockResolvedValue(1);
      prisma.platformCampaign.findMany.mockResolvedValue([
        {
          id: 1,
          title: '活动1',
          displayLocations: '["client_home_hero"]',
          status: 'active',
          createdAt: new Date(),
        },
      ]);
      prisma.platformCampaign.groupBy.mockResolvedValue([
        { status: 'active', _count: { id: 1 } },
      ]);

      const res = await service.listAdmin({ page: 1, pageSize: 10 });
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].displayLocations).toEqual(['client_home_hero']);
    });
  });

  describe('setStatus & delete', () => {
    it('should update status to offline', async () => {
      const mockCampaign = {
        id: 1,
        title: '测试',
        displayLocations: '[]',
        status: 'active',
      };
      prisma.platformCampaign.findUnique.mockResolvedValue(mockCampaign);
      prisma.platformCampaign.update.mockResolvedValue({
        ...mockCampaign,
        status: 'offline',
      });

      const updated = await service.setStatus(1, 'offline');
      expect(prisma.platformCampaign.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'offline' },
      });
    });

    it('should delete campaign', async () => {
      prisma.platformCampaign.findUnique.mockResolvedValue({
        id: 1,
        title: '待删',
      });
      prisma.platformCampaign.delete.mockResolvedValue({ id: 1 });

      const res = await service.delete(1);
      expect(res.success).toBe(true);
    });
  });
});
