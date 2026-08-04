import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { VerificationCodeService } from '../common/verification-code/verification-code.service';
import { SmsService } from '../common/sms/sms.service';
import type { Prisma } from '@prisma/client';
import { buildDefaultServiceItems } from '../common/default-service-items';

@Injectable()
export class TechnicianAuthService {
  private static readonly EDITABLE_STATUSES = ['active', 'inactive'] as const;
  private static readonly RESET_PASSWORD_CODE_PURPOSE =
    'technician:reset-password';
  private static readonly INITIAL_PASSWORD_CODE_PURPOSE =
    'technician:initial-password';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly verificationCode: VerificationCodeService,
    private readonly sms: SmsService,
  ) {}

  // 忘记密码：发送验证码（防枚举，统一返回；仅已激活账号真正发送）
  async sendResetCode(phone: string) {
    try {
      const technician = await this.findTechnicianByPhone(phone);
      if (technician && technician.passwordHash) {
        const code = await this.verificationCode.generate(
          phone,
          TechnicianAuthService.RESET_PASSWORD_CODE_PURPOSE,
        );
        // 后台发送（带重试），不阻塞响应，也消除"是否注册"的响应耗时差异
        void this.sms
          .sendVerificationCode(phone, code, '重置密码')
          .catch(() => {});
      }
    } catch {
      // 频率限制等错误也静默，避免暴露手机号是否注册
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  // 忘记密码：校验验证码并重置密码
  async resetPasswordByCode(phone: string, code: string, newPassword: string) {
    await this.verificationCode.validate(
      phone,
      code,
      TechnicianAuthService.RESET_PASSWORD_CODE_PURPOSE,
    );
    const technician = await this.findTechnicianByPhone(phone);
    if (!technician || !technician.passwordHash) {
      throw new BadRequestException('该手机号未注册');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.technician.update({
      where: { id: technician.id },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true };
  }

  private generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async checkPhone(phone: string) {
    const technician = await this.findTechnicianByPhone(phone);
    return {
      exists: !!technician,
      activated: !!(technician && technician.passwordHash),
    };
  }

  async register(
    dto: {
      inviteKey: string;
      name: string;
      phone: string;
      password: string;
    },
    wechatIdentity?: { appId: string; openId: string; unionId?: string },
  ) {
    const keyRecord = await this.prisma.technicianInviteKey.findUnique({
      where: { key: dto.inviteKey },
      include: { technician: true },
    });

    if (!keyRecord) {
      throw new BadRequestException('邀请密钥无效');
    }

    if (keyRecord.usedAt) {
      throw new BadRequestException('邀请密钥已被使用');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 情况 A：密钥已预绑定到某个美甲师账号 → 激活该账号
    if (keyRecord.usedByTechnicianId && keyRecord.technician) {
      const target = keyRecord.technician;

      if (target.passwordHash) {
        throw new BadRequestException('该账号已激活，请直接登录');
      }

      if (target.phone !== dto.phone) {
        throw new BadRequestException(
          `该密钥已绑定到手机号 ${target.phone}，请使用该手机号注册`,
        );
      }

      const activated = await this.prisma.$transaction(async (tx) => {
        const t = await tx.technician.update({
          where: { id: target.id },
          data: {
            passwordHash,
            name: dto.name.trim() || target.name,
            status: 'active',
            invitationCode:
              target.invitationCode || (await this.allocateInvitationCode(tx)),
          },
        });
        await tx.technicianInviteKey.update({
          where: { id: keyRecord.id },
          data: { usedAt: new Date() },
        });
        if (wechatIdentity) {
          await tx.wechatIdentity.create({
            data: { ...wechatIdentity, technicianId: t.id },
          });
        }
        return t;
      });

      return this.issueTokens(activated.id, activated.phone);
    }

    // 情况 B：未预绑定 → 创建新美甲师
    const existing = await this.findTechnicianByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('该手机号已被注册');
    }

    const technician = await this.prisma.$transaction(async (tx) => {
      const invitationCode = await this.allocateInvitationCode(tx);
      const created = await tx.technician.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone,
          passwordHash,
          invitationCode,
          status: 'active',
        },
      });

      await tx.technicianInviteKey.update({
        where: { id: keyRecord.id },
        data: {
          usedByTechnicianId: created.id,
          usedAt: new Date(),
        },
      });

      if (wechatIdentity) {
        await tx.wechatIdentity.create({
          data: { ...wechatIdentity, technicianId: created.id },
        });
      }

      return created;
    });

    return this.issueTokens(technician.id, technician.phone);
  }

  private async allocateInvitationCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    let code = this.generateInvitationCode();
    while (
      await tx.technician.findUnique({ where: { invitationCode: code } })
    ) {
      code = this.generateInvitationCode();
    }
    return code;
  }

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

  private async issueTokens(technicianId: number, phone: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: technician.id,
      phone,
      userType: 'technician',
      tv: technician.tokenVersion,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(
        technician.id,
        phone,
        technician.tokenVersion,
      ),
      technician: this.serializeTechnician(technician),
    };
  }

  private serializeTechnician(
    technician: Prisma.TechnicianGetPayload<{
      include: { subscription: { include: { plan: true } } };
    }>,
  ) {
    return {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      avatarUrl: technician.avatarUrl,
      city: technician.city,
      province: technician.province,
      serviceArea: technician.serviceArea,
      status: technician.status,
      invitationCode: technician.invitationCode,
      homeService: technician.homeService,
      shopService: technician.shopService,
      // 接单就绪：至少开启一种服务类型；未就绪则锁定邀请码/邀请链接
      bookingReady: technician.homeService || technician.shopService,
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
    };
  }

  async login(phone: string, password: string) {
    const technician = await this.findTechnicianByPhone(phone);

    if (!technician) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (technician.status === 'deleted') {
      throw new UnauthorizedException('账号已被删除');
    }

    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (!technician.passwordHash) {
      throw new UnauthorizedException('账号未设置密码，请联系管理员');
    }

    const valid = await bcrypt.compare(password, technician.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const result = await this.issueTokens(technician.id, technician.phone);
    return {
      ...result,
      mustChangePassword: technician.mustChangePassword,
    };
  }

  async loginByWechat(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });
    if (!technician || technician.status === 'deleted') {
      throw new UnauthorizedException('美甲师不存在');
    }
    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }
    return this.issueTokens(technician.id, technician.phone);
  }

  async changePassword(
    technicianId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    if (!technician.passwordHash) {
      throw new BadRequestException('账号未设置密码，请联系管理员');
    }

    const valid = await bcrypt.compare(oldPassword, technician.passwordHash);
    if (!valid) {
      throw new BadRequestException('当前密码不正确');
    }

    const sameAsOld = await bcrypt.compare(
      newPassword,
      technician.passwordHash,
    );
    if (sameAsOld) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { success: true };
  }

  async setPassword(technicianId: number, newPassword: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    if (!technician.mustChangePassword) {
      throw new BadRequestException('无需设置密码');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
      },
    });

    return this.issueTokens(technician.id, technician.phone);
  }

  async sendInitialPasswordCode(phone: string) {
    try {
      const technician = await this.findTechnicianByPhone(phone);
      if (technician && !technician.passwordHash) {
        const code = await this.verificationCode.generate(
          phone,
          TechnicianAuthService.INITIAL_PASSWORD_CODE_PURPOSE,
        );
        void this.sms
          .sendVerificationCode(phone, code, '首次设置密码')
          .catch(() => {});
      }
    } catch {
      // 与找回密码一致，统一响应，避免枚举美甲师手机号。
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  // 首次登录设置密码：必须校验发送到预留手机号的短信验证码。
  async setInitialPassword(phone: string, code: string, newPassword: string) {
    await this.verificationCode.validate(
      phone,
      code,
      TechnicianAuthService.INITIAL_PASSWORD_CODE_PURPOSE,
    );
    const technician = await this.findTechnicianByPhone(phone);

    if (!technician) {
      throw new BadRequestException('该手机号未注册');
    }

    if (technician.status === 'deleted') {
      throw new UnauthorizedException('账号已被删除');
    }

    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (technician.passwordHash) {
      throw new BadRequestException('该账号已设置密码，请直接登录');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.technician.update({
      where: { id: technician.id },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    return this.issueTokens(technician.id, technician.phone);
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
      province: technician.province,
      serviceArea: technician.serviceArea,
      status: technician.status,
      invitationCode: technician.invitationCode,
      lastLoginAt: technician.lastLoginAt,
      homeService: technician.homeService,
      shopService: technician.shopService,
      // 接单就绪：至少开启一种服务类型；未就绪则锁定邀请码/邀请链接
      bookingReady: technician.homeService || technician.shopService,
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
        province: true,
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
      province?: string;
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

    if (dto.province !== undefined) {
      updateData.province = dto.province.trim() || null;
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
        province: true,
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
    dto: {
      homeService?: boolean;
      shopService?: boolean;
      shopAddresses?: any[];
    },
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    // 局部更新：只写入本次提交的字段，未提交的保持不变
    const updateData: any = {};
    if (dto.homeService !== undefined) {
      updateData.homeService = dto.homeService;
    }
    if (dto.shopService !== undefined) {
      updateData.shopService = dto.shopService;
    }

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
        province: true,
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
    if ((payload.tv ?? 0) !== technician.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }

    const newPayload = {
      sub: technician.id,
      phone: technician.phone,
      userType: 'technician',
      tv: technician.tokenVersion,
    };

    return {
      accessToken: this.jwtService.sign(newPayload),
      refreshToken: this.signRefreshToken(
        technician.id,
        technician.phone,
        technician.tokenVersion,
      ),
    };
  }

  private signRefreshToken(
    technicianId: number,
    phone: string,
    tokenVersion: number,
  ) {
    return this.jwtService.sign(
      {
        sub: technicianId,
        phone,
        userType: 'technician',
        tokenType: 'refresh',
        tv: tokenVersion,
      },
      { expiresIn: '30d' },
    );
  }

  private parseServiceItems(serviceItems: string | null) {
    return serviceItems ? JSON.parse(serviceItems) : buildDefaultServiceItems();
  }
}
