import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianStatusDto } from './dto/update-technician-status.dto';
import * as crypto from 'crypto';

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

  private mapTechnician<T extends { socialMedia?: string | null }>(technician: T) {
    return {
      ...technician,
      socialMedia: this.parseSocialMedia(technician.socialMedia),
    };
  }

  async findAll(page: number = 1, limit: number = 20, status?: string, search?: string) {
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
        quotes: true,
        bookings: true,
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
      throw new ConflictException('Technician with this phone number already exists');
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
    const technician = await this.findOne(id);

    return this.prisma.technician.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  private generateInvitationCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }
}
