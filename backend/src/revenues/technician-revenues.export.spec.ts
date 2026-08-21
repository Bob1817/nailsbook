import { TechnicianRevenuesController } from './revenues.controller';
import { RevenuesService } from './revenues.service';

describe('technician revenue export', () => {
  it('exports only the authenticated technician data and records an audit', async () => {
    const revenues = {
      exportCsv: jest.fn().mockResolvedValue('header\nrow'),
      recordExportAudit: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const subscriptions = {
      assertAnyFeature: jest.fn().mockResolvedValue(undefined),
    };
    const response = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const controller = new TechnicianRevenuesController(
      revenues as never,
      subscriptions as never,
    );

    await controller.exportCsv(
      { user: { technicianId: 42 } },
      response as never,
      '2026-08-01',
      '2026-08-31',
    );

    expect(subscriptions.assertAnyFeature).toHaveBeenCalledWith(42, [
      'basic_export',
      'full_export',
    ]);
    expect(revenues.exportCsv).toHaveBeenCalledWith(
      42,
      undefined,
      '2026-08-01',
      '2026-08-31',
    );
    expect(revenues.recordExportAudit).toHaveBeenCalledWith(42, 'header\nrow', {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    expect(response.send).toHaveBeenCalledWith('\ufeffheader\nrow');
  });

  it('records the exported row count and filters', async () => {
    const prisma = {
      dataExportAudit: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const service = new RevenuesService(prisma as never);

    await service.recordExportAudit(7, 'header\nrow-1\nrow-2', {
      startDate: '2026-08-01',
    });

    expect(prisma.dataExportAudit.create).toHaveBeenCalledWith({
      data: {
        technicianId: 7,
        exportType: 'revenues',
        format: 'csv',
        rowCount: 2,
        filters: JSON.stringify({ startDate: '2026-08-01' }),
      },
    });
  });

  it('requires full-export permission and audits a complete business export', async () => {
    const exportResult = {
      counts: { customers: 2, orders: 3, works: 4, revenues: 1 },
      filters: { startDate: null, endDate: null },
      data: { customers: [], orders: [], works: [], revenues: [] },
    };
    const revenues = {
      exportFullBusinessData: jest.fn().mockResolvedValue(exportResult),
      recordFullExportAudit: jest.fn().mockResolvedValue({ id: 2 }),
    };
    const subscriptions = {
      assertFeature: jest.fn().mockResolvedValue(undefined),
    };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new TechnicianRevenuesController(
      revenues as never,
      subscriptions as never,
    );

    await controller.exportFull(
      { user: { technicianId: 42 } },
      response as never,
    );

    expect(subscriptions.assertFeature).toHaveBeenCalledWith(42, 'full_export');
    expect(revenues.exportFullBusinessData).toHaveBeenCalledWith(
      42,
      undefined,
      undefined,
    );
    expect(revenues.recordFullExportAudit).toHaveBeenCalledWith(
      42,
      exportResult.counts,
      exportResult.filters,
    );
    expect(response.send).toHaveBeenCalledWith(
      JSON.stringify(exportResult, null, 2),
    );
  });

  it('builds a complete export using only the authenticated technician id', async () => {
    const prisma = {
      customer: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      order: { findMany: jest.fn().mockResolvedValue([{ id: 2 }]) },
      nailWork: { findMany: jest.fn().mockResolvedValue([{ id: 3 }]) },
      revenue: { findMany: jest.fn().mockResolvedValue([{ id: 4 }]) },
    };
    const service = new RevenuesService(prisma as never);

    const result = await service.exportFullBusinessData(
      7,
      '2026-08-01',
      '2026-08-31',
    );

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technicianId: 7 } }),
    );
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          technicianId: 7,
          createdAt: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31T23:59:59.999'),
          },
        },
      }),
    );
    expect(result.counts).toEqual({
      customers: 1,
      orders: 1,
      works: 1,
      revenues: 1,
    });
  });

  it('escapes commas, quotes and spreadsheet formulas in CSV values', async () => {
    const prisma = {
      revenue: {
        findMany: jest.fn().mockResolvedValue([
          {
            revenueNo: '=IMPORTXML("bad")',
            order: { orderNo: 'ORDER,1' },
            technician: { name: '阿"琳' },
            customer: { name: '+危险公式' },
            amount: 100,
            recognizedAt: new Date('2026-08-05'),
            status: 'confirmed',
          },
        ]),
      },
    };
    const service = new RevenuesService(prisma as never);

    const csv = await service.exportCsv(7);

    expect(csv).toContain("'=IMPORTXML");
    expect(csv).toContain('"ORDER,1"');
    expect(csv).toContain('"阿""琳"');
    expect(csv).toContain("'+危险公式");
  });
});
