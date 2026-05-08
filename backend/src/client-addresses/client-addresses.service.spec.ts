import { NotFoundException } from '@nestjs/common';
import { ClientAddressesService } from './client-addresses.service';

describe('ClientAddressesService', () => {
  let service: ClientAddressesService;
  let prisma: {
    $transaction: jest.Mock;
    clientAddress: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      clientAddress: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    service = new ClientAddressesService(prisma as never);
  });

  it('clears the previous default address before setting a new one for the same client', async () => {
    prisma.clientAddress.findFirst.mockResolvedValueOnce({
      id: 8,
      clientId: 11,
      isDefault: false,
    });
    prisma.clientAddress.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.clientAddress.update.mockResolvedValueOnce({
      id: 8,
      clientId: 11,
      isDefault: true,
    });

    const result = await service.setDefault(11, 8);

    expect(prisma.clientAddress.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 11,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
    expect(prisma.clientAddress.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { isDefault: true },
    });
    expect(result).toEqual({
      id: 8,
      clientId: 11,
      isDefault: true,
    });
  });

  it('rejects setting a default address that does not belong to the current client', async () => {
    prisma.clientAddress.findFirst.mockResolvedValueOnce(null);

    await expect(service.setDefault(11, 99)).rejects.toThrow(
      new NotFoundException('地址不存在'),
    );
    expect(prisma.clientAddress.updateMany).not.toHaveBeenCalled();
    expect(prisma.clientAddress.update).not.toHaveBeenCalled();
  });

  it('clears an existing default before creating a new default address', async () => {
    prisma.clientAddress.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.clientAddress.create.mockResolvedValueOnce({
      id: 10,
      clientId: 11,
      contactName: 'Amy',
      isDefault: true,
    });

    const result = await service.create(11, {
      contactName: 'Amy',
      isDefault: true,
    });

    expect(prisma.clientAddress.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 11,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
    expect(prisma.clientAddress.create).toHaveBeenCalledWith({
      data: {
        clientId: 11,
        contactName: 'Amy',
        contactPhone: null,
        province: null,
        city: null,
        district: null,
        detailAddress: null,
        doorInfo: null,
        latitude: null,
        longitude: null,
        isDefault: true,
      },
    });
    expect(result).toEqual({
      id: 10,
      clientId: 11,
      contactName: 'Amy',
      isDefault: true,
    });
  });

  it('updates partial fields and clears previous default when marking the address as default', async () => {
    prisma.clientAddress.findFirst.mockResolvedValueOnce({
      id: 8,
      clientId: 11,
      isDefault: false,
    });
    prisma.clientAddress.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.clientAddress.update.mockResolvedValueOnce({
      id: 8,
      clientId: 11,
      city: 'Shanghai',
      detailAddress: 'Lane 1',
      isDefault: true,
    });

    const result = await service.update(11, 8, {
      city: 'Shanghai',
      detailAddress: 'Lane 1',
      isDefault: true,
    });

    expect(prisma.clientAddress.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 11,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
    expect(prisma.clientAddress.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        city: 'Shanghai',
        detailAddress: 'Lane 1',
        isDefault: true,
      },
    });
    expect(result).toEqual({
      id: 8,
      clientId: 11,
      city: 'Shanghai',
      detailAddress: 'Lane 1',
      isDefault: true,
    });
  });

  it('rejects removing an address that does not belong to the current client', async () => {
    prisma.clientAddress.findFirst.mockResolvedValueOnce(null);

    await expect(service.remove(11, 77)).rejects.toThrow(
      new NotFoundException('地址不存在'),
    );
    expect(prisma.clientAddress.delete).not.toHaveBeenCalled();
  });
});
