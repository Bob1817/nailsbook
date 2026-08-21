import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';

@Injectable()
export class ArtistApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistApplicationDto) {
    return this.prisma.artistApplication.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        city: dto.city,
        serviceMode: dto.serviceMode ?? null,
        experience: dto.experience ?? null,
        specialty: dto.specialty ?? null,
        wechat: dto.wechat ?? null,
        note: dto.note ?? null,
      },
    });
  }

  async checkPhone(
    phone: string,
  ): Promise<{ status: 'none' | 'pending' | 'approved' }> {
    const application = await this.prisma.artistApplication.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (!application) return { status: 'none' };
    if (application.status === 'approved') return { status: 'approved' };
    if (application.status === 'pending') return { status: 'pending' };
    // rejected → 允许重新申请
    return { status: 'none' };
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.artistApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artistApplication.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.prisma.artistApplication.findUnique({ where: { id } });
  }

  async approve(id: number, reviewedBy: number) {
    const application = await this.prisma.artistApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException('申请不存在');
    }

    const homeService =
      application.serviceMode === 'home' || application.serviceMode === 'both';
    const shopService =
      application.serviceMode === 'shop' || application.serviceMode === 'both';

    // 事务：标记通过 + 按需创建美甲师账号（按手机号去重，幂等）
    return this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.artistApplication.update({
        where: { id },
        data: { status: 'approved', reviewedBy, reviewedAt: new Date() },
      });

      const existing = await tx.technician.findUnique({
        where: { phone: application.phone },
      });

      // 已存在同手机号美甲师则不重复创建；新建时 passwordHash 留空，
      // 美甲师凭手机号首次登录时设置登录密码（与 technicians.create 一致）
      const technician =
        existing ??
        (await tx.technician.create({
          data: {
            name: application.name,
            phone: application.phone,
            city: application.city,
            homeService,
            shopService,
            invitationCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
            status: 'active',
          },
        }));

      return {
        application: updatedApplication,
        technician,
        technicianCreated: !existing,
      };
    });
  }

  async reject(id: number, reviewedBy: number) {
    return this.prisma.artistApplication.update({
      where: { id },
      data: { status: 'rejected', reviewedBy, reviewedAt: new Date() },
    });
  }
}
