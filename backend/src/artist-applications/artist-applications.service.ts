import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';

@Injectable()
export class ArtistApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistApplicationDto) {
    // One SQLite write statement keeps the duplicate check atomic across workers.
    // Public responses never expose an existing applicant's id or review status.
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "ArtistApplication"
        ("name", "phone", "city", "serviceMode", "experience", "specialty",
         "wechat", "note", "followedMp", "status", "createdAt", "updatedAt")
      SELECT ${dto.name}, ${dto.phone}, ${dto.city}, ${dto.serviceMode ?? null},
        ${dto.experience ?? null}, ${dto.specialty ?? null}, ${dto.wechat ?? null},
        ${dto.note ?? null}, ${dto.followedMp ?? false}, 'pending', ${now}, ${now}
      WHERE NOT EXISTS (
        SELECT 1 FROM "ArtistApplication"
        WHERE "phone" = ${dto.phone} AND "status" IN ('pending', 'approved')
      )
    `;
    return { received: true };
  }

  async checkPhone(_phone: string): Promise<{ status: 'none' }> {
    // Legacy clients can proceed to create(), which handles duplicates atomically.
    // Never disclose registration or review status by unauthenticated phone lookup.
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

    // Recognize known legacy labels; never silently approve unknown service modes.
    const legacyModes: Record<string, string> = {
      '到店服务': 'shop', '上门服务': 'home', '两者皆可': 'both',
    };
    const rawMode = application.serviceMode?.trim() || '';
    const mode = legacyModes[rawMode] || rawMode;
    if (!['home', 'shop', 'both'].includes(mode)) {
      throw new BadRequestException('服务方式不明确，请联系申请人确认；可拒绝此申请后请其重新选择到店、上门或两者均可');
    }
    const homeService = mode === 'home' || mode === 'both';
    const shopService = mode === 'shop' || mode === 'both';

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
