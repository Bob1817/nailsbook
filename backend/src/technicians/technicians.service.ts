import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { UpdateTechnicianStatusDto } from './dto/update-technician-status.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TechniciansService {
  constructor(private prisma: PrismaService) {}

  private parseSocialMedia(socialMedia?: string | null) {
    if (!socialMedia) {
      return {};
    }

    try {
      const parsed = JSON.parse(socialMedia);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private mapTechnician<T extends { socialMedia?: string | null }>(
    technician: T,
  ) {
    return {
      ...technician,
      socialMedia: this.parseSocialMedia(technician.socialMedia),
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
  ) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [technicians, total] = await Promise.all([
      this.prisma.technician.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.technician.count({ where }),
    ]);

    return {
      data: technicians.map((technician) => this.mapTechnician(technician)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        customers: true,
        orders: true,
        revenues: true,
        subscription: true,
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.mapTechnician(technician);
  }

  async create(dto: CreateTechnicianDto) {
    const existing = await this.prisma.technician.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException(
        'Technician with this phone number already exists',
      );
    }

    const invitationCode = this.generateInvitationCode();

    const technician = await this.prisma.technician.create({
      data: {
        ...dto,
        invitationCode,
        status: 'inactive',
      },
    });

    return technician;
  }

  async updateStatus(id: number, dto: UpdateTechnicianStatusDto) {
    return this.prisma.technician.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  async update(id: number, dto: UpdateTechnicianDto) {
    const existing = await this.prisma.technician.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technician not found');

    if (dto.phone && dto.phone !== existing.phone) {
      const phoneInUse = await this.prisma.technician.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneInUse) {
        throw new ConflictException('该手机号已被其他美甲师使用');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl || null;
    if (dto.city !== undefined) data.city = dto.city || null;
    if (dto.serviceArea !== undefined) data.serviceArea = dto.serviceArea || null;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.technician.update({
      where: { id },
      data,
      include: { subscription: true, inviteKey: true },
    });

    return this.mapTechnician(updated);
  }

  async resetPassword(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    if (!technician.passwordHash) {
      throw new BadRequestException('该账号尚未激活，请生成邀请密钥让美甲师注册激活');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { passwordHash },
    });

    // 临时密码仅在本次响应返回一次，由管理员转交给美甲师
    return { tempPassword };
  }

  private generateTempPassword(): string {
    // 10 位，至少含大小写字母与数字，满足强密码规则（≥8 位、含字母和数字）
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const pick = (s: string) => s[crypto.randomInt(s.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(digits)];
    while (chars.length < 10) chars.push(pick(all));
    // 洗牌
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  async generateInviteKey(technicianId: number, note?: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: { inviteKey: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');

    if (technician.passwordHash) {
      throw new BadRequestException('该账号已激活，无需邀请密钥');
    }

    // 若已有未使用的密钥，直接返回
    if (technician.inviteKey && !technician.inviteKey.usedAt) {
      return technician.inviteKey;
    }

    // 生成新密钥并预绑定到该美甲师
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    let attempt = 0;
    do {
      key = '';
      for (let i = 0; i < 16; i++) key += chars[Math.floor(Math.random() * chars.length)];
      attempt++;
    } while (
      (await this.prisma.technicianInviteKey.findUnique({ where: { key } })) &&
      attempt < 10
    );

    return this.prisma.technicianInviteKey.create({
      data: {
        key,
        note: note?.trim() || `美甲师 ${technician.name} (${technician.phone}) 激活密钥`,
        usedByTechnicianId: technicianId,
        // usedAt 不设，留作"已分配未使用"状态
      },
    });
  }

  private generateInvitationCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }
}
