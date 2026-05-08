import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { UpdateClientAddressDto } from './dto/update-client-address.dto';

@Injectable()
export class ClientAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clientUserId: number) {
    const addresses = await this.prisma.clientAddress.findMany({
      where: { clientId: clientUserId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return addresses;
  }

  async create(clientUserId: number, dto: CreateClientAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.clientAddress.updateMany({
          where: {
            clientId: clientUserId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.clientAddress.create({
        data: {
          clientId: clientUserId,
          contactName: dto.contactName ?? null,
          contactPhone: dto.contactPhone ?? null,
          province: dto.province ?? null,
          city: dto.city ?? null,
          district: dto.district ?? null,
          detailAddress: dto.detailAddress ?? null,
          doorInfo: dto.doorInfo ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async update(clientUserId: number, id: number, dto: UpdateClientAddressDto) {
    await this.findOwnedAddress(clientUserId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.clientAddress.updateMany({
          where: {
            clientId: clientUserId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.clientAddress.update({
        where: { id },
        data: {
          ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
          ...(dto.province !== undefined ? { province: dto.province } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.district !== undefined ? { district: dto.district } : {}),
          ...(dto.detailAddress !== undefined
            ? { detailAddress: dto.detailAddress }
            : {}),
          ...(dto.doorInfo !== undefined ? { doorInfo: dto.doorInfo } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(clientUserId: number, id: number) {
    await this.findOwnedAddress(clientUserId, id);
    return this.prisma.clientAddress.delete({
      where: { id },
    });
  }

  async setDefault(clientUserId: number, id: number) {
    await this.findOwnedAddress(clientUserId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.clientAddress.updateMany({
        where: {
          clientId: clientUserId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      return tx.clientAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  private async findOwnedAddress(clientUserId: number, id: number) {
    const address = await this.prisma.clientAddress.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }

    return address;
  }
}
