import { MarketingMaterialsService } from './marketing-materials.service';

describe('MarketingMaterialsService', () => {
  const material = {
    id: 9,
    technicianId: 7,
    type: 'work_poster',
    title: '春日法式',
    content: '{"subtitle":"预约专属款式","price":199}',
    status: 'draft',
    revision: 1,
    exportCount: 0,
    freeReexportCount: 0,
    lastChargedAt: null,
    lastExportedAt: null,
  };
  const prisma: any = {
    marketingMaterial: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const subscriptions: any = {
    getCurrentForTechnician: jest.fn(),
    consumeMonthlyResource: jest.fn(),
  };
  const config: any = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  };
  let service: MarketingMaterialsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketingMaterialsService(prisma, subscriptions, config);
    prisma.marketingMaterial.findFirst.mockResolvedValue({ ...material });
    prisma.marketingMaterial.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...material, ...data, status: 'exported' }),
    );
    subscriptions.getCurrentForTechnician.mockResolvedValue({
      plan: { features: ['booking'] },
    });
    subscriptions.consumeMonthlyResource.mockResolvedValue({});
  });

  it('预览不扣额度且免费版包含平台标识', async () => {
    const result = await service.preview(7, 9);

    expect(result.charged).toBe(false);
    expect(result.platformMark).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.imageBase64.length).toBeGreaterThan(100);
    expect(subscriptions.consumeMonthlyResource).not.toHaveBeenCalled();
  });

  it('成功导出后使用幂等键扣减宣传额度', async () => {
    const result = await service.export(
      7,
      9,
      'material-9-export-1',
      new Date('2026-08-05T10:00:00Z'),
    );

    expect(result.charged).toBe(true);
    expect(subscriptions.consumeMonthlyResource).toHaveBeenCalledWith(
      7,
      'marketingExports',
      'material-9-export-1',
      1,
      { materialId: 9, revision: 1 },
    );
  });

  it('短时间重复导出使用免费重导次数', async () => {
    prisma.marketingMaterial.findFirst.mockResolvedValue({
      ...material,
      lastChargedAt: new Date('2026-08-05T09:55:00Z'),
      freeReexportCount: 0,
    });

    const result = await service.export(
      7,
      9,
      'material-9-export-2',
      new Date('2026-08-05T10:00:00Z'),
    );

    expect(result.charged).toBe(false);
    expect(subscriptions.consumeMonthlyResource).not.toHaveBeenCalled();
    expect(prisma.marketingMaterial.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({
        freeReexportCount: { increment: 1 },
      }),
    });
  });
});
