import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminInviteKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  async list(params: { used?: 'true' | 'false'; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const where: any = {};
    if (params.used === 'true') {
      where.usedByTechnicianId = { not: null };
    } else if (params.used === 'false') {
      where.usedByTechnicianId = null;
    }

    const [items, total] = await Promise.all([
      this.prisma.technicianInviteKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          technician: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
      this.prisma.technicianInviteKey.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async create(data: { note?: string; count?: number; createdByAdminId?: number }) {
    const count = Math.min(50, Math.max(1, Number(data.count) || 1));
    const created: any[] = [];

    for (let i = 0; i < count; i++) {
      let key = this.generateKey();
      // 防止极小概率碰撞
      while (
        await this.prisma.technicianInviteKey.findUnique({ where: { key } })
      ) {
        key = this.generateKey();
      }

      const record = await this.prisma.technicianInviteKey.create({
        data: {
          key,
          note: data.note?.trim() || null,
          createdByAdminId: data.createdByAdminId,
        },
      });
      created.push(record);
    }

    return created;
  }

  async remove(id: number) {
    const record = await this.prisma.technicianInviteKey.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException('密钥不存在');
    }
    if (record.usedByTechnicianId) {
      throw new BadRequestException('密钥已被使用，无法删除');
    }
    await this.prisma.technicianInviteKey.delete({ where: { id } });
    return { success: true };
  }
}
