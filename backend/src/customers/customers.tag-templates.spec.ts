import { ConflictException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService tag templates', () => {
  function createPrisma(customTags: string | null = null) {
    return {
      technician: {
        findUnique: jest.fn().mockResolvedValue({ customTags }),
        update: jest.fn().mockResolvedValue({}),
      },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  it('creates and persists a normalized template', async () => {
    const prisma = createPrisma('[]');
    const service = new CustomersService(prisma as never);

    const created = await service.createTagTemplate(7, '  高复购  ');

    expect(created).toEqual(expect.objectContaining({ name: '高复购' }));
    expect(prisma.technician.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      data: { customTags: expect.stringContaining('高复购') },
    }));
  });

  it('rejects a duplicate template', async () => {
    const prisma = createPrisma('[{"id":"tag-1","name":"婚礼"}]');
    const service = new CustomersService(prisma as never);

    await expect(service.createTagTemplate(7, '婚礼')).rejects.toBeInstanceOf(ConflictException);
  });

  it('merges templates with tags already used by customers', async () => {
    const prisma = createPrisma('[{"id":"tag-1","name":"婚礼"}]');
    prisma.customer.findMany.mockResolvedValue([{ tags: '婚礼,高复购' }, { tags: '新客' }]);
    const service = new CustomersService(prisma as never);

    await expect(service.getDistinctTags(7)).resolves.toEqual(['婚礼', '新客', '高复购']);
  });

  it('keeps customer and work templates in separate categories', async () => {
    const prisma = createPrisma('[{"id":"customer-1","name":"高复购","type":"customer"},{"id":"work-1","name":"法式","type":"work"}]');
    const service = new CustomersService(prisma as never);

    await expect(service.getTagTemplates(7, 'customer')).resolves.toEqual([
      expect.objectContaining({ name: '高复购', type: 'customer' }),
    ]);
    await expect(service.getTagTemplates(7, 'work')).resolves.toEqual([
      expect.objectContaining({ name: '法式', type: 'work' }),
    ]);
  });

  it('allows the same name in different categories and preserves both', async () => {
    const prisma = createPrisma('[{"id":"customer-1","name":"婚礼","type":"customer"}]');
    const service = new CustomersService(prisma as never);

    await expect(service.createTagTemplate(7, '婚礼', 'work')).resolves.toEqual(
      expect.objectContaining({ name: '婚礼', type: 'work' }),
    );
    const saved = JSON.parse(prisma.technician.update.mock.calls[0][0].data.customTags);
    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '婚礼', type: 'customer' }),
      expect.objectContaining({ name: '婚礼', type: 'work' }),
    ]));
  });
});
