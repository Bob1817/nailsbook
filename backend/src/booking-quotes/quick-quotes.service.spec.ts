import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { QuickQuotesService } from './quick-quotes.service';

describe('QuickQuotesService', () => {
  let service: QuickQuotesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      quickQuoteSnapshot: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new QuickQuotesService(mockPrisma);
  });

  describe('create', () => {
    it('should calculate sumPrice and auto-adjust OTHER fee if finalPrice > sumPrice', async () => {
      mockPrisma.quickQuoteSnapshot.create.mockImplementation((args: any) =>
        Promise.resolve({
          ...args.data,
          id: 1,
        }),
      );

      const result = await service.create({
        items: [
          { name: '基础护理', priceFen: 6000 },
          { name: '手绘设计', priceFen: 28000 },
        ],
        finalPriceFen: 40000, // 34000 + 6000
        themeCode: 'cherry-blossom',
      });

      expect(result.sumPriceFen).toBe(34000);
      expect(result.finalPriceFen).toBe(40000);
      expect(result.adjustmentType).toBe('OTHER');
      expect(result.adjustmentFen).toBe(6000);
      expect(result.remainingSeconds).toBe(7200);

      const createArg = mockPrisma.quickQuoteSnapshot.create.mock.calls[0][0];
      expect(createArg.data.isInteractive).toBe(false);
      expect(createArg.data.adjustmentType).toBe('OTHER');
      expect(createArg.data.adjustmentFen).toBe(6000);
    });

    it('should auto-adjust DISCOUNT if finalPrice < sumPrice', async () => {
      mockPrisma.quickQuoteSnapshot.create.mockImplementation((args: any) =>
        Promise.resolve({
          ...args.data,
          id: 2,
        }),
      );

      const result = await service.create({
        items: [
          { name: '基础护理', priceFen: 6000 },
          { name: '手绘设计', priceFen: 28000 },
        ],
        finalPriceFen: 30000, // 34000 - 4000
      });

      expect(result.sumPriceFen).toBe(34000);
      expect(result.finalPriceFen).toBe(30000);
      expect(result.adjustmentType).toBe('DISCOUNT');
      expect(result.adjustmentFen).toBe(4000);
    });

    it('should set adjustmentType to NONE if finalPrice equals sumPrice', async () => {
      mockPrisma.quickQuoteSnapshot.create.mockImplementation((args: any) =>
        Promise.resolve({
          ...args.data,
          id: 3,
        }),
      );

      const result = await service.create({
        items: [{ name: '单色美甲', priceFen: 18000 }],
        finalPriceFen: 18000,
      });

      expect(result.adjustmentType).toBe('NONE');
      expect(result.adjustmentFen).toBe(0);
    });
  });

  describe('getPublicDetail', () => {
    it('should throw 404 if record not found', async () => {
      mockPrisma.quickQuoteSnapshot.findUnique.mockResolvedValue(null);

      await expect(service.getPublicDetail('invalid_token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 410 Gone if expired', async () => {
      mockPrisma.quickQuoteSnapshot.findUnique.mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() - 1000), // 已过期
      });

      try {
        await service.getPublicDetail('expired_token');
        fail('Should have thrown HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.GONE);
      }
    });

    it('should return parsed quote if valid and increment view count', async () => {
      const now = new Date();
      mockPrisma.quickQuoteSnapshot.findUnique.mockResolvedValue({
        id: 10,
        quoteNo: 'QQ123',
        publicToken: 'token123',
        themeCode: 'minimal-white',
        itemsJson: JSON.stringify([{ name: '单色美甲', priceFen: 18000 }]),
        sumPriceFen: 18000,
        finalPriceFen: 18000,
        adjustmentType: 'NONE',
        adjustmentFen: 0,
        isInteractive: false,
        expiresAt: new Date(now.getTime() + 3600 * 1000), // 1小时后过期
        createdAt: now,
      });
      mockPrisma.quickQuoteSnapshot.update.mockResolvedValue({});

      const result = await service.getPublicDetail('token123');
      expect(result.quoteNo).toBe('QQ123');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('单色美甲');
      expect(result.isInteractive).toBe(false);
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(mockPrisma.quickQuoteSnapshot.update).toHaveBeenCalled();
    });
  });
});
