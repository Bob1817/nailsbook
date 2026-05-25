import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { VerificationCodeService } from '../common/verification-code/verification-code.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class TechnicianAuthService {
  private static readonly DEFAULT_SERVICE_ITEMS = [
    {
      id: 'svc_basic_care_1',
      name: '基础护理与修形',
      description: '指甲修剪、修形、去死皮、护理等基础服务',
      category: 'basic_care',
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'svc_color_style_1',
      name: '色彩与款式制作',
      description: '纯色美甲、彩绘、渐变、贴纸等款式设计服务',
      category: 'color_style',
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'svc_extension_1',
      name: '指甲延长与加固',
      description: '甲片延长、光疗延长、指甲加固等服务',
      category: 'extension_reinforcement',
      isActive: true,
      sortOrder: 3,
    },
    {
      id: 'svc_removal_1',
      name: '卸甲服务',
      description: '卸除甲油胶、卸甲片等服务',
      category: 'removal',
      isActive: true,
      sortOrder: 4,
    },
  ];
  private static readonly EDITABLE_STATUSES = ['active', 'inactive'] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  private buildDefaultBusinessHours() {
    return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
      weekday,
      start: '10:00',
      end: '21:00',
      closed: false,
    }));
  }

  private normalizeShopAddresses(addresses: any[] = []) {
    return addresses.map((shop) => ({
      ...shop,
      enabled: shop.enabled ?? true,
      businessHours:
        Array.isArray(shop.businessHours) && shop.businessHours.length > 0
          ? shop.businessHours
          : this.buildDefaultBusinessHours(),
    }));
  }

  private parseShopAddresses(shopAddresses?: string | null) {
    if (!shopAddresses) {
      return [];
    }

    try {
      const parsed = JSON.parse(shopAddresses);
      return this.normalizeShopAddresses(Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  }

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

  async requestCode(phone: string) {
    const technician = await this.findTechnicianByPhone(phone);

    if (!technician || !technician.invitationCode) {
      throw new UnauthorizedException('该账号未被邀请，无法登录');
    }

    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }

    this.verificationCodeService.generate(phone);
    return { codeSent: true };
  }

  async login(phone: string, password: string) {
    type TechnicianWithSubscription = Prisma.TechnicianGetPayload<{
      include: {
        subscription: {
          include: {
            plan: true;
          };
        };
      };
    }>;

    const technician = (await this.findTechnicianByPhone(phone, {
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    })) as TechnicianWithSubscription | null;

    if (!technician) {
      throw new UnauthorizedException('手机号或验证码错误');
    }

    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (!technician.invitationCode || technician.invitationCode !== password) {
      throw new UnauthorizedException('手机号或验证码错误');
    }

    await this.prisma.technician.update({
      where: { id: technician.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: technician.id,
      phone: technician.phone,
      userType: 'technician',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(technician.id, technician.phone),
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        avatarUrl: technician.avatarUrl,
        city: technician.city,
        serviceArea: technician.serviceArea,
        status: technician.status,
        invitationCode: technician.invitationCode,
        homeService: technician.homeService,
        shopService: technician.shopService,
        shopAddresses: this.parseShopAddresses(technician.shopAddresses),
        socialMedia: this.parseSocialMedia(technician.socialMedia),
        serviceItems: this.parseServiceItems(technician.serviceItems),
        subscription: technician.subscription
          ? {
              status: technician.subscription.status,
              startedAt: technician.subscription.startedAt,
              expiredAt: technician.subscription.expiredAt,
              planName: technician.subscription.plan.name,
              planCode: technician.subscription.plan.code,
            }
          : null,
      },
    };
  }

  async getProfile(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    return {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      avatarUrl: technician.avatarUrl,
      city: technician.city,
      serviceArea: technician.serviceArea,
      status: technician.status,
      invitationCode: technician.invitationCode,
      lastLoginAt: technician.lastLoginAt,
      homeService: technician.homeService,
      shopService: technician.shopService,
      shopAddresses: this.parseShopAddresses(technician.shopAddresses),
      socialMedia: this.parseSocialMedia(technician.socialMedia),
      serviceItems: this.parseServiceItems(technician.serviceItems),
      serviceSchedule: technician.serviceSchedule
        ? JSON.parse(technician.serviceSchedule)
        : null,
      customTags: technician.customTags
        ? JSON.parse(technician.customTags)
        : [],
      subscription: technician.subscription
        ? {
            status: technician.subscription.status,
            startedAt: technician.subscription.startedAt,
            expiredAt: technician.subscription.expiredAt,
            planName: technician.subscription.plan.name,
            planCode: technician.subscription.plan.code,
          }
        : null,
    };
  }

  async updateStatus(
    technicianId: number,
    status: (typeof TechnicianAuthService.EDITABLE_STATUSES)[number],
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    return this.prisma.technician.update({
      where: { id: technicianId },
      data: { status },
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
        city: true,
        serviceArea: true,
        status: true,
        socialMedia: true,
      },
    });
  }

  async updateProfile(
    technicianId: number,
    dto: {
      name?: string;
      city?: string;
      serviceArea?: string;
      avatarUrl?: string;
      socialMedia?: Record<string, string>;
      serviceSchedule?: any;
      customTags?: any[];
    },
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    const updateData: Prisma.TechnicianUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.city !== undefined) {
      updateData.city = dto.city.trim() || null;
    }

    if (dto.serviceArea !== undefined) {
      updateData.serviceArea = dto.serviceArea.trim() || null;
    }

    if (dto.avatarUrl !== undefined) {
      updateData.avatarUrl = dto.avatarUrl.trim() || null;
    }

    if (dto.socialMedia !== undefined) {
      const normalizedSocialMedia = Object.fromEntries(
        Object.entries(dto.socialMedia).filter(
          ([key, value]) => key && typeof value === 'string' && value.trim(),
        ),
      );
      updateData.socialMedia = Object.keys(normalizedSocialMedia).length
        ? JSON.stringify(normalizedSocialMedia)
        : null;
    }

    if (dto.serviceSchedule !== undefined) {
      updateData.serviceSchedule = dto.serviceSchedule
        ? JSON.stringify(dto.serviceSchedule)
        : null;
    }

    if (dto.customTags !== undefined) {
      updateData.customTags = dto.customTags.length
        ? JSON.stringify(dto.customTags)
        : null;
    }

    const updated = await this.prisma.technician.update({
      where: { id: technicianId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
        city: true,
        serviceArea: true,
        status: true,
        invitationCode: true,
        homeService: true,
        shopService: true,
        shopAddresses: true,
        socialMedia: true,
        serviceItems: true,
        serviceSchedule: true,
        customTags: true,
      },
    });

    return {
      ...updated,
      shopAddresses: this.parseShopAddresses(updated.shopAddresses),
      socialMedia: this.parseSocialMedia(updated.socialMedia),
      serviceItems: this.parseServiceItems(updated.serviceItems),
      serviceSchedule: updated.serviceSchedule
        ? JSON.parse(updated.serviceSchedule)
        : null,
      customTags: updated.customTags ? JSON.parse(updated.customTags) : [],
    };
  }

  private async findTechnicianByPhone(
    phone: string,
    args: {
      include?: {
        subscription: {
          include: {
            plan: true;
          };
        };
      };
    } = {},
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { phone },
      include: args.include,
    });

    if (technician) {
      return technician;
    }

    const canonicalPhone = this.toCanonicalPhone(phone);
    if (!canonicalPhone || canonicalPhone === phone) {
      return null;
    }

    return this.prisma.technician.findUnique({
      where: { phone: canonicalPhone },
      include: args.include,
    });
  }

  private toCanonicalPhone(phone: string) {
    return /^1\d{10}$/.test(phone) ? `+86${phone}` : null;
  }

  async updateServiceType(
    technicianId: number,
    dto: { homeService: boolean; shopService: boolean; shopAddresses?: any[] },
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    const updateData: any = {
      homeService: dto.homeService,
      shopService: dto.shopService,
    };

    if (dto.shopAddresses !== undefined) {
      updateData.shopAddresses = JSON.stringify(
        this.normalizeShopAddresses(dto.shopAddresses),
      );
    }

    const updated = await this.prisma.technician.update({
      where: { id: technicianId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
        city: true,
        serviceArea: true,
        status: true,
        homeService: true,
        shopService: true,
        shopAddresses: true,
        socialMedia: true,
      },
    });

    return {
      ...updated,
      shopAddresses: this.parseShopAddresses(updated.shopAddresses),
      socialMedia: this.parseSocialMedia(updated.socialMedia),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('无效的令牌类型');
    }

    const technician = await this.prisma.technician.findUnique({
      where: { id: payload.sub },
    });

    if (!technician || technician.status === 'suspended') {
      throw new UnauthorizedException('美甲师不存在或已被禁用');
    }

    const newPayload = {
      sub: technician.id,
      phone: technician.phone,
      userType: 'technician',
    };

    return {
      accessToken: this.jwtService.sign(newPayload),
      refreshToken: this.signRefreshToken(technician.id, technician.phone),
    };
  }

  private signRefreshToken(technicianId: number, phone: string) {
    return this.jwtService.sign(
      {
        sub: technicianId,
        phone,
        userType: 'technician',
        tokenType: 'refresh',
      },
      { expiresIn: '30d' },
    );
  }

  private parseServiceItems(serviceItems: string | null) {
    return serviceItems
      ? JSON.parse(serviceItems)
      : TechnicianAuthService.DEFAULT_SERVICE_ITEMS;
  }
}
