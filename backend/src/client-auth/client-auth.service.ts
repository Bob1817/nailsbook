import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { RegisterByInviteDto } from './dto/register-by-invite.dto';
import { RegisterBySmsDto } from './dto/register-by-sms.dto';
import { LoginBySmsDto } from './dto/login-by-sms.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { BindTechnicianDto } from './dto/bind-technician.dto';
import { VerificationCodeService } from '../common/verification-code/verification-code.service';
import { SmsService } from '../common/sms/sms.service';
import { buildDefaultServiceItems } from '../common/default-service-items';
import { ChatGateway } from '../chat/chat.gateway';
import type { Prisma } from '@prisma/client';

type ClientWithBindings = Prisma.ClientUserGetPayload<{
  include: { bindings: { include: { technician: true } } };
}>;

@Injectable()
export class ClientAuthService {
  private static readonly RESET_PASSWORD_CODE_PURPOSE = 'client:reset-password';
  private static readonly SMS_LOGIN_CODE_PURPOSE = 'client:sms-login';
  private static readonly SMS_REGISTER_CODE_PURPOSE = 'client:sms-register';
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly verificationCode: VerificationCodeService,
    private readonly sms: SmsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // 忘记密码：发送验证码（防枚举，统一返回；仅已注册账号真正发送）
  async sendResetCode(phone: string) {
    try {
      const client = await this.prisma.clientUser.findUnique({
        where: { phone },
      });
      if (client) {
        const code = await this.verificationCode.generate(
          phone,
          ClientAuthService.RESET_PASSWORD_CODE_PURPOSE,
        );
        // 后台发送（带重试），不阻塞响应，也消除"是否注册"的响应耗时差异
        void this.sms
          .sendVerificationCode(phone, code, '重置密码')
          .catch(() => {});
      }
    } catch {
      // 频率限制等错误静默，避免暴露手机号是否注册
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  // 忘记密码：校验验证码并重置密码
  async resetPasswordByCode(phone: string, code: string, newPassword: string) {
    await this.verificationCode.validate(
      phone,
      code,
      ClientAuthService.RESET_PASSWORD_CODE_PURPOSE,
    );
    const client = await this.prisma.clientUser.findUnique({
      where: { phone },
    });
    if (!client) {
      throw new BadRequestException('该手机号未注册');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.clientUser.update({
      where: { id: client.id },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true };
  }

  async checkPhone(phone: string) {
    const client = await this.prisma.clientUser.findUnique({
      where: { phone },
    });
    return { exists: !!client };
  }

  // ── SMS 验证码登录 / 注册（免邀请码） ──

  /** 手机号 + 短信验证码 → 注册客户（无需邀请码，无需密码） */
  async registerBySms(dto: RegisterBySmsDto) {
    // 1. 校验短信验证码
    await this.verificationCode.validate(
      dto.phone,
      dto.smsCode,
      ClientAuthService.SMS_REGISTER_CODE_PURPOSE,
    );

    // 2. 检查手机号是否已注册
    const existing = await this.prisma.clientUser.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('该手机号已被注册');
    }

    // 3. 创建用户（无密码，后续可在 app 内设置）
    const managedPassword = this.generateManagedPassword();
    const passwordHash = await bcrypt.hash(managedPassword, 10);

    const client = await this.prisma.clientUser.create({
      data: {
        phone: dto.phone,
        passwordHash,
        managedPasswordCiphertext: managedPassword, // 托管密码，供后续 SMS 登录使用
        nickname: dto.nickname || null,
        status: 'active',
      },
    });

    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(client.id, client.phone, client.tokenVersion),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      roles: ['client'],
      needsOnboarding: true, // 新用户需要选择"绑定美甲师"或"我是美甲师"
    };
  }

  /** 手机号 + 短信验证码 → 登录（无需密码，无需绑定美甲师） */
  async loginBySms(dto: LoginBySmsDto) {
    // 1. 校验短信验证码
    await this.verificationCode.validate(
      dto.phone,
      dto.smsCode,
      ClientAuthService.SMS_LOGIN_CODE_PURPOSE,
    );

    // 2. 查找用户
    const client = await this.prisma.clientUser.findUnique({
      where: { phone: dto.phone },
      include: {
        bindings: {
          where: { status: 'active' },
          include: { technician: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!client) {
      throw new UnauthorizedException('该手机号未注册');
    }
    if (client.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 3. 收集角色信息
    const roles: string[] = ['client'];
    const hasTechnicianAccount = await this.prisma.technician.findUnique({
      where: { phone: dto.phone },
      select: { id: true, status: true },
    });
    if (hasTechnicianAccount && hasTechnicianAccount.status === 'active') {
      roles.push('technician');
    }

    const needsOnboarding = client.bindings.length === 0 && !hasTechnicianAccount;

    // 4. 构建返回数据
    if (client.bindings.length > 0) {
      return {
        ...this.buildLoginResult(client),
        roles,
        needsOnboarding,
      };
    }

    // 没有绑定的纯客户登录
    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(client.id, client.phone, client.tokenVersion),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      technicians: [],
      roles,
      needsOnboarding,
    };
  }

  /** 发送 SMS 登录验证码（防枚举） */
  async sendSmsCodeForLogin(phone: string) {
    try {
      const client = await this.prisma.clientUser.findUnique({
        where: { phone },
      });
      if (client) {
        const code = await this.verificationCode.generate(
          phone,
          ClientAuthService.SMS_LOGIN_CODE_PURPOSE,
        );
        void this.sms.sendVerificationCode(phone, code, '登录').catch(() => {});
      }
    } catch {
      // 静默处理
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  /** 发送 SMS 注册验证码（防枚举，仅未注册手机号真正发送） */
  async sendSmsCodeForRegister(phone: string) {
    try {
      const existing = await this.prisma.clientUser.findUnique({
        where: { phone },
      });
      if (!existing) {
        const code = await this.verificationCode.generate(
          phone,
          ClientAuthService.SMS_REGISTER_CODE_PURPOSE,
        );
        void this.sms.sendVerificationCode(phone, code, '注册').catch(() => {});
      }
    } catch {
      // 静默处理
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  /** 已登录客户 → 激活美甲师身份（使用超管后台生成的激活密钥） */
  async activateTechnician(clientUserId: number, activationKey: string) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });
    if (!client) {
      throw new UnauthorizedException('用户不存在');
    }

    // 检查是否已是美甲师
    const existingTech = await this.prisma.technician.findUnique({
      where: { phone: client.phone },
    });
    if (existingTech && existingTech.passwordHash) {
      throw new ConflictException('该手机号已是美甲师，请直接切换身份');
    }

    // 查找激活密钥
    const keyRecord = await this.prisma.technicianInviteKey.findUnique({
      where: { key: activationKey },
      include: { technician: true },
    });

    if (!keyRecord) {
      throw new BadRequestException('激活密钥无效');
    }
    if (keyRecord.usedAt) {
      throw new BadRequestException('该密钥已被使用');
    }

    // 密码同步：优先使用客户端密码作为美甲师密码
    let passwordHash: string;
    let managedPassword: string | null = null;

    if (client.passwordHash) {
      // 客户端有密码 → 直接复用（用户记住一套密码）
      passwordHash = client.passwordHash;
      managedPassword = null;
    } else {
      // 客户端无密码（微信注册未设密码）→ 生成随机密码
      managedPassword = this.generateManagedPassword();
      passwordHash = await bcrypt.hash(managedPassword, 10);
    }

    const technician = await this.prisma.$transaction(async (tx) => {
      // 情况 A：密钥预绑定到美甲师 → 激活该账号
      if (keyRecord.usedByTechnicianId && keyRecord.technician) {
        const target = keyRecord.technician;
        if (target.passwordHash) {
          throw new BadRequestException('该美甲师账号已激活');
        }
        if (target.phone !== client.phone) {
          throw new BadRequestException(
            `该密钥绑定到手机号 ${target.phone}，与当前账户不匹配`,
          );
        }

        const t = await tx.technician.update({
          where: { id: target.id },
          data: {
            passwordHash,
            managedPasswordCiphertext: managedPassword,
            name: client.nickname || target.name || client.phone,
            status: 'active',
            invitationCode:
              target.invitationCode || (await this.allocateInvitationCodeInTx(tx)),
          },
        });
        await tx.technicianInviteKey.update({
          where: { id: keyRecord.id },
          data: { usedAt: new Date() },
        });
        return t;
      }

      // 情况 B：创建新美甲师
      if (existingTech && !existingTech.passwordHash) {
        // 更新已有的未激活美甲师
        const t = await tx.technician.update({
          where: { id: existingTech.id },
          data: {
            passwordHash,
            managedPasswordCiphertext: managedPassword,
            name: client.nickname || existingTech.name || client.phone,
            status: 'active',
            invitationCode:
              existingTech.invitationCode ||
              (await this.allocateInvitationCodeInTx(tx)),
          },
        });
        await tx.technicianInviteKey.update({
          where: { id: keyRecord.id },
          data: { usedByTechnicianId: t.id, usedAt: new Date() },
        });
        return t;
      }

      // 全新创建
      const invitationCode = await this.allocateInvitationCodeInTx(tx);
      const created = await tx.technician.create({
        data: {
          name: client.nickname || client.phone,
          phone: client.phone,
          passwordHash,
          managedPasswordCiphertext: managedPassword,
          invitationCode,
          status: 'active',
        },
      });
      await tx.technicianInviteKey.update({
        where: { id: keyRecord.id },
        data: { usedByTechnicianId: created.id, usedAt: new Date() },
      });
      return created;
    });

    // 签发美甲师 token
    const techPayload = {
      sub: technician.id,
      phone: technician.phone,
      userType: 'technician' as const,
      tv: technician.tokenVersion,
    };

    return {
      accessToken: this.jwtService.sign(techPayload),
      refreshToken: this.jwtService.sign(
        { ...techPayload, tokenType: 'refresh' },
        { expiresIn: '30d' },
      ),
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        status: technician.status,
        invitationCode: technician.invitationCode,
      },
      roles: ['client', 'technician'],
    };
  }

  // ── 辅助方法 ──

  /** 生成随机托管密码 */
  private generateManagedPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let pwd = '';
    for (let i = 0; i < 16; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }

  /** 在事务中分配唯一邀请码 */
  private async allocateInvitationCodeInTx(
    tx: any,
  ): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    while (
      await tx.technician.findUnique({ where: { invitationCode: code } })
    ) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return code;
  }

  /** 微信授权 + 邀请码注册：创建客户并自动绑定美甲师（active） */
  async registerClientByWechatInvite(
    dto: {
      phone: string;
      inviteCode: string;
      source?: 'invite' | 'card';
    },
    wechatIdentity?: { appId: string; openId: string; unionId?: string },
  ) {
    const technician = await this.findActiveTechnicianByInviteCode(
      dto.inviteCode,
      '该邀请码无效，请跟您的美甲师确认后再注册',
    );

    const existing = await this.prisma.clientUser.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('该手机号已被注册');
    }

    const registrationSource = dto.source || 'invite';

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clientUser.create({
        data: {
          phone: dto.phone,
          passwordHash: '', // 待设置密码
          managedPasswordCiphertext: null,
          status: 'active',
        },
      });

      await tx.clientTechBinding.create({
        data: {
          clientId: created.id,
          techId: technician.id,
          inviteCode: dto.inviteCode,
          bindSource: registrationSource,
          isDefault: true,
        },
      });

      await tx.customer.create({
        data: {
          technicianId: technician.id,
          clientUserId: created.id,
          name: created.nickname || dto.phone,
          phone: dto.phone,
          sourceType: registrationSource,
          sourceRef: dto.inviteCode,
        },
      });

      return created;
    });

    const technicianPayload = {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      avatarUrl: technician.avatarUrl,
      city: technician.city,
      serviceArea: technician.serviceArea,
      status: technician.status,
      homeService: technician.homeService,
      shopService: technician.shopService,
      shopAddresses: technician.shopAddresses
        ? JSON.parse(technician.shopAddresses)
        : [],
      serviceItems: this.parseServiceItems(technician.serviceItems),
      isDefault: true,
      bindSource: registrationSource,
    };

    return {
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      technician: technicianPayload,
      technicians: [technicianPayload],
    };
  }

  async registerByInvite(
    dto: RegisterByInviteDto,
    wechatIdentity?: { appId: string; openId: string; unionId?: string },
  ) {
    const existing = await this.prisma.clientUser.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('该手机号已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const registrationSource = dto.source || 'invite';

    // 有邀请码时查找对应的美甲师
    let technician = null;
    if (dto.inviteCode) {
      technician = await this.findActiveTechnicianByInviteCode(
        dto.inviteCode,
        '该邀请码无效，请跟您的美甲师确认后再注册',
      );
    }

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clientUser.create({
        data: {
          phone: dto.phone,
          passwordHash,
          nickname: dto.nickname || null,
        },
      });

      // 有邀请码时创建绑定关系
      if (technician && dto.inviteCode) {
        await tx.clientTechBinding.create({
          data: {
            clientId: created.id,
            techId: technician.id,
            inviteCode: dto.inviteCode,
            bindSource: registrationSource,
            isDefault: true,
          },
        });

        await tx.customer.create({
          data: {
            technicianId: technician.id,
            clientUserId: created.id,
            name: dto.nickname || dto.phone,
            phone: dto.phone,
            sourceType: registrationSource,
            sourceRef: dto.inviteCode,
          },
        });
      }

      if (wechatIdentity) {
        await tx.wechatIdentity.create({
          data: { ...wechatIdentity, clientUserId: created.id },
        });
      }

      return created;
    });

    // 构建返回数据
    const result: any = {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(
        client.id,
        client.phone,
        client.tokenVersion,
      ),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      roles: ['client'],
    };

    // 有绑定美甲师时返回绑定信息
    if (technician) {
      const technicianPayload = {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        avatarUrl: technician.avatarUrl,
        city: technician.city,
        serviceArea: technician.serviceArea,
        status: technician.status,
        homeService: technician.homeService,
        shopService: technician.shopService,
        shopAddresses: technician.shopAddresses
          ? JSON.parse(technician.shopAddresses)
          : [],
        serviceItems: this.parseServiceItems(technician.serviceItems),
        isDefault: true,
        bindSource: registrationSource,
      };
      result.technician = technicianPayload;
      result.technicians = [technicianPayload];
    } else {
      // 无绑定美甲师时标记需要引导
      result.needsOnboarding = true;
    }

    return result;
  }

  async login(dto: ClientLoginDto) {
    const client = await this.prisma.clientUser.findUnique({
      where: { phone: dto.phone },
      include: {
        bindings: {
          where: { status: 'active' },
          include: {
            technician: true,
          },
          orderBy: {
            isDefault: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (client.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (!client.passwordHash) {
      throw new UnauthorizedException('账号未设置密码，请通过微信登录设置密码');
    }

    const valid = await bcrypt.compare(dto.password, client.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 收集角色信息（与 loginBySms 一致）
    const roles: string[] = ['client'];
    const hasTechnicianAccount = await this.prisma.technician.findUnique({
      where: { phone: dto.phone },
      select: { id: true, status: true, passwordHash: true },
    });
    if (hasTechnicianAccount && hasTechnicianAccount.status === 'active') {
      roles.push('technician');

      // 密码同步：如果美甲师密码与客户端密码不同，用美甲师密码覆盖客户端密码
      if (
        hasTechnicianAccount.passwordHash &&
        hasTechnicianAccount.passwordHash !== client.passwordHash
      ) {
        await this.prisma.clientUser.update({
          where: { id: client.id },
          data: {
            passwordHash: hasTechnicianAccount.passwordHash,
            managedPasswordCiphertext: null,
          },
        });
      }
    }

    const needsOnboarding = client.bindings.length === 0 && !hasTechnicianAccount;

    // 构建返回数据（与 loginBySms 一致）
    if (client.bindings.length > 0) {
      return {
        ...this.buildLoginResult(client),
        roles,
        needsOnboarding,
      };
    }

    // 没有绑定的客户登录，返回 needsOnboarding 让前端引导
    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(client.id, client.phone, client.tokenVersion),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      technicians: [],
      roles,
      needsOnboarding,
    };
  }

  /** 签发密码设置短期 token（供 wechat-auth completeClient 调用） */
  createPasswordSetupToken(clientId: number): string {
    return this.jwtService.sign(
      { clientId, sub: clientId.toString(), tokenType: 'password-setup' },
      { expiresIn: '10m' },
    );
  }

  /** 微信注册/首次登录后设置密码 */
  async setupPassword(dto: SetupPasswordDto) {
    // 1. 验证 password-setup JWT
    let payload: { clientId: number; tokenType: string };
    try {
      payload = this.jwtService.verify(dto.passwordSetupToken);
    } catch {
      throw new UnauthorizedException('密码设置凭证已过期，请重新登录');
    }
    if (payload.tokenType !== 'password-setup' || !payload.clientId) {
      throw new UnauthorizedException('无效的密码设置凭证');
    }

    // 2. 查找用户
    const client = await this.prisma.clientUser.findUnique({
      where: { id: payload.clientId },
    });
    if (!client) {
      throw new UnauthorizedException('用户不存在');
    }
    if (client.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 3. 幂等：密码已存在则直接登录
    if (client.passwordHash) {
      return this.loginByWechat(client.id);
    }

    // 4. 哈希并保存密码
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.clientUser.update({
      where: { id: client.id },
      data: {
        passwordHash,
        managedPasswordCiphertext: null, // 用户自设密码后清除托管密码
      },
    });

    // 5. 登录
    return this.loginByWechat(client.id);
  }

  /** 注册后选择角色（客户/美甲师），可跳过绑定/激活 */
  async selectRole(
    clientUserId: number,
    dto: {
      role: 'client' | 'technician';
      inviteCode?: string;
      activationKey?: string;
    },
  ) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });
    if (!client) {
      throw new UnauthorizedException('用户不存在');
    }

    // 选择客户：可选绑定美甲师
    if (dto.role === 'client') {
      if (dto.inviteCode) {
        const technician = await this.findActiveTechnicianByInviteCode(
          dto.inviteCode,
          '邀请码无效或美甲师不存在',
        );
        await this.ensureActiveBinding(
          client.id,
          technician.id,
          dto.inviteCode,
          'manual',
        );
      }

      // 如果还没设置密码，返回设置密码 token
      if (!client.passwordHash) {
        return {
          authenticated: false,
          role: 'client' as const,
          needsSetupPassword: true,
          passwordSetupToken: this.createPasswordSetupToken(client.id),
          phone: client.phone,
        };
      }

      return {
        authenticated: true,
        role: 'client' as const,
        ...(await this.loginByWechat(client.id)),
      };
    }

    // 选择美甲师
    if (dto.role === 'technician') {
      let technician = await this.prisma.technician.findUnique({
        where: { phone: client.phone },
      });

      if (dto.activationKey) {
        // 使用激活密钥激活美甲师
        const activated = await this.activateTechnician(
          client.id,
          dto.activationKey,
        );
        return {
          authenticated: true,
          role: 'technician' as const,
          ...activated,
        };
      }

      // 无激活密钥 → 创建/复用美甲师账号
      if (!technician) {
        technician = await this.prisma.technician.create({
          data: {
            name: client.nickname || client.phone,
            phone: client.phone,
            passwordHash: '',
            managedPasswordCiphertext: null,
            status: 'inactive',
          },
        });
      }

      // 同步微信身份已在 completeClient 中完成 client 绑定，
      // 这里需要额外把同一微信绑定到 technician 账号，便于后续微信登录
      // 但一个微信只能绑定一个账号，所以这里仅更新 technician 的微信身份记录
      // （复用同一个 unionId/openId 的 wechatIdentity 行不可行，因为 clientUserId 已占用）
      // 暂时不在游客模式绑定微信身份，后续微信登录仍走 client 身份再切换

      const isTourist = !technician.passwordHash;
      const techPayload = {
        sub: technician.id,
        phone: technician.phone,
        userType: 'technician' as const,
        tv: technician.tokenVersion,
      };

      return {
        authenticated: true,
        role: 'technician' as const,
        accessToken: this.jwtService.sign(techPayload),
        refreshToken: this.jwtService.sign(
          { ...techPayload, tokenType: 'refresh' },
          { expiresIn: '30d' },
        ),
        technician: {
          id: technician.id,
          name: technician.name,
          phone: technician.phone,
          avatarUrl: technician.avatarUrl,
          city: technician.city,
          status: technician.status,
          homeService: technician.homeService,
          shopService: technician.shopService,
          isTourist,
        },
        roles: isTourist ? ['technician'] : ['client', 'technician'],
        isTourist,
      };
    }

    throw new BadRequestException('无效的角色选择');
  }

  /** 确保客户与美甲师之间存在 active 绑定（注册/选择角色时用） */
  private async ensureActiveBinding(
    clientId: number,
    techId: number,
    inviteCode: string,
    bindSource: string,
  ) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new UnauthorizedException('用户不存在');

    const existing = await this.prisma.clientTechBinding.findUnique({
      where: { clientId_techId: { clientId, techId } },
    });

    if (existing?.status === 'active') return;

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.clientTechBinding.update({
          where: { id: existing.id },
          data: { status: 'active', inviteCode, bindSource },
        });
      } else {
        await tx.clientTechBinding.create({
          data: {
            clientId,
            techId,
            inviteCode,
            bindSource,
            status: 'active',
            isDefault: true,
          },
        });
      }

      const customer = await tx.customer.findFirst({
        where: { technicianId: techId, clientUserId: clientId },
      });
      if (!customer) {
        await tx.customer.create({
          data: {
            technicianId: techId,
            clientUserId: clientId,
            name: client.nickname || client.phone,
            phone: client.phone,
            sourceType: bindSource,
            sourceRef: inviteCode,
          },
        });
      }
    });
  }

  async loginByWechat(clientUserId: number) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
      include: {
        bindings: {
          where: { status: 'active' },
          include: { technician: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });
    if (!client || client.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 收集角色信息
    const roles: string[] = ['client'];
    const hasTechnicianAccount = await this.prisma.technician.findUnique({
      where: { phone: client.phone },
      select: { id: true, status: true },
    });
    if (hasTechnicianAccount && hasTechnicianAccount.status === 'active') {
      roles.push('technician');
    }

    const needsOnboarding = client.bindings.length === 0 && !hasTechnicianAccount;

    if (client.bindings.length > 0) {
      return { ...this.buildLoginResult(client), roles, needsOnboarding };
    }

    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(client.id, client.phone, client.tokenVersion),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      technicians: [],
      roles,
      needsOnboarding,
    };
  }

  private buildLoginResult(client: ClientWithBindings) {
    const defaultBinding =
      client.bindings.find((b) => b.isDefault) || client.bindings[0];

    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(
        client.id,
        client.phone,
        client.tokenVersion,
      ),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        city: client.city,
        bio: client.bio,
        status: client.status,
      },
      technician: {
        id: defaultBinding.technician.id,
        name: defaultBinding.technician.name,
        phone: defaultBinding.technician.phone,
        status: defaultBinding.technician.status,
        homeService: defaultBinding.technician.homeService,
        shopService: defaultBinding.technician.shopService,
        shopAddresses: defaultBinding.technician.shopAddresses
          ? JSON.parse(defaultBinding.technician.shopAddresses)
          : [],
        serviceItems: this.parseServiceItems(
          defaultBinding.technician.serviceItems,
        ),
      },
      technicians: client.bindings.map((b) => ({
        id: b.technician.id,
        name: b.technician.name,
        phone: b.technician.phone,
        avatarUrl: b.technician.avatarUrl,
        city: b.technician.city,
        serviceArea: b.technician.serviceArea,
        status: b.technician.status,
        homeService: b.technician.homeService,
        shopService: b.technician.shopService,
        invitationCode: b.technician.invitationCode,
        socialMedia: b.technician.socialMedia
          ? JSON.parse(b.technician.socialMedia)
          : null,
        shopAddresses: b.technician.shopAddresses
          ? JSON.parse(b.technician.shopAddresses)
          : [],
        serviceItems: this.parseServiceItems(b.technician.serviceItems),
        serviceSchedule: this.parseServiceSchedule(
          b.technician.serviceSchedule,
        ),
        isDefault: b.isDefault,
        bindSource: b.bindSource,
      })),
    };
  }

  async getProfile(clientUserId: number) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
      include: {
        bindings: {
          where: { status: 'active' },
          include: {
            technician: true,
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!client) {
      throw new UnauthorizedException('客户不存在');
    }

    const defaultBinding = client.bindings.find((b) => b.isDefault);

    // 检查是否同时是美甲师
    const technicianAccount = await this.prisma.technician.findUnique({
      where: { phone: client.phone },
      select: { id: true, status: true, passwordHash: true, invitationCode: true },
    });

    return {
      id: client.id,
      nickname: client.nickname,
      phone: client.phone,
      avatarUrl: client.avatarUrl,
      city: client.city,
      bio: client.bio,
      status: client.status,
      capabilities: {
        hasBoundTechnician: client.bindings.length > 0,
        isTechnician: !!technicianAccount,
        isTechnicianActivated:
          !!technicianAccount && !!technicianAccount.passwordHash,
      },
      binding: defaultBinding
        ? {
            techId: defaultBinding.techId,
            inviteCode: defaultBinding.inviteCode,
            bindSource: defaultBinding.bindSource,
            technician: {
              id: defaultBinding.technician.id,
              name: defaultBinding.technician.name,
              phone: defaultBinding.technician.phone,
              status: defaultBinding.technician.status,
              homeService: defaultBinding.technician.homeService,
              shopService: defaultBinding.technician.shopService,
              shopAddresses: defaultBinding.technician.shopAddresses
                ? JSON.parse(defaultBinding.technician.shopAddresses)
                : [],
              serviceItems: this.parseServiceItems(
                defaultBinding.technician.serviceItems,
              ),
            },
          }
        : null,
      technicians: client.bindings.map((b) => ({
        id: b.technician.id,
        name: b.technician.name,
        phone: b.technician.phone,
        avatarUrl: b.technician.avatarUrl,
        city: b.technician.city,
        serviceArea: b.technician.serviceArea,
        status: b.technician.status,
        homeService: b.technician.homeService,
        shopService: b.technician.shopService,
        invitationCode: b.technician.invitationCode,
        socialMedia: b.technician.socialMedia
          ? JSON.parse(b.technician.socialMedia)
          : null,
        shopAddresses: b.technician.shopAddresses
          ? JSON.parse(b.technician.shopAddresses)
          : [],
        serviceItems: this.parseServiceItems(b.technician.serviceItems),
        serviceSchedule: this.parseServiceSchedule(
          b.technician.serviceSchedule,
        ),
        isDefault: b.isDefault,
        bindSource: b.bindSource,
        bindId: b.id,
      })),
    };
  }

  /// 申请绑定美甲师（改为审批制）：校验邀请码后创建 pending 申请并通知美甲师。
  async bindTechnician(clientUserId: number, dto: BindTechnicianDto) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: dto.techId },
    });
    if (!technician) {
      throw new NotFoundException('美甲师不存在');
    }
    if (technician.status !== 'active') {
      throw new UnauthorizedException('美甲师账号已被禁用');
    }
    if (
      !technician.invitationCode ||
      technician.invitationCode !== dto.inviteCode
    ) {
      throw new UnauthorizedException('邀请码无效');
    }
    return this.applyBindingPending(
      clientUserId,
      dto.techId,
      dto.inviteCode,
      dto.note?.trim() || null,
      dto.source || 'manual',
    );
  }

  /// 历史会话再次申请绑定（已有过绑定关系，无需重新输入邀请码）。
  async requestRebind(clientUserId: number, techId: number, note?: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: techId },
    });
    if (!technician || technician.status !== 'active') {
      throw new NotFoundException('美甲师不存在或已禁用');
    }
    const existing = await this.prisma.clientTechBinding.findUnique({
      where: { clientId_techId: { clientId: clientUserId, techId } },
    });
    if (!existing) {
      throw new BadRequestException('请通过邀请码绑定该美甲师');
    }
    return this.applyBindingPending(
      clientUserId,
      techId,
      existing.inviteCode,
      note?.trim() || null,
    );
  }

  /// 创建/复用 pending 绑定申请并给美甲师发送申请系统消息（含客户信息）。
  private async applyBindingPending(
    clientUserId: number,
    techId: number,
    inviteCode: string | null,
    note: string | null,
    bindSource = 'manual',
  ) {
    const existing = await this.prisma.clientTechBinding.findUnique({
      where: { clientId_techId: { clientId: clientUserId, techId } },
    });
    if (existing?.status === 'active') {
      throw new ConflictException('您已绑定该美甲师');
    }
    if (existing?.status === 'pending') {
      throw new ConflictException('绑定申请审核中，请等待美甲师通过');
    }

    const binding = existing
      ? await this.prisma.clientTechBinding.update({
          where: { id: existing.id },
          data: { status: 'pending', inviteCode, bindSource, note },
        })
      : await this.prisma.clientTechBinding.create({
          data: {
            clientId: clientUserId,
            techId,
            inviteCode,
            bindSource,
            status: 'pending',
            note,
          },
        });

    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });
    const addr = await this.prisma.clientAddress.findFirst({
      where: { clientId: clientUserId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    const lines = [
      '【绑定申请】有客户申请绑定您',
      `客户：${client?.nickname || client?.phone || '客户'}`,
      `手机：${client?.phone || '未填写'}`,
      `地址：${this.formatClientAddress(addr)}`,
      `申请时间：${this.formatDateTime(new Date())}`,
    ];
    if (note) lines.push(`备注：${note}`);
    await this.sendBindingSystemMessage({
      clientId: clientUserId,
      techId,
      senderType: 'client',
      senderId: clientUserId,
      receiverType: 'technician',
      receiverId: techId,
      content: lines.join('\n'),
      relatedId: binding.id,
    });

    return { status: 'pending', bindingId: binding.id };
  }

  /// 美甲师查看待审批的绑定申请。
  async listPendingBindingApplications(technicianId: number) {
    const apps = await this.prisma.clientTechBinding.findMany({
      where: { techId: technicianId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    const results = await Promise.all(
      apps.map(async (b) => {
        const client = await this.prisma.clientUser.findUnique({
          where: { id: b.clientId },
        });
        const addr = await this.prisma.clientAddress.findFirst({
          where: { clientId: b.clientId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
        return {
          id: b.id,
          clientId: b.clientId,
          name: client?.nickname || client?.phone || '客户',
          phone: client?.phone || null,
          address: this.formatClientAddress(addr),
          note: b.note,
          appliedAt: b.createdAt,
        };
      }),
    );
    return results;
  }

  /// 美甲师通过绑定申请：置为 active、补建客户记录、回执通知客户。
  async approveBindingApplication(technicianId: number, bindingId: number) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: { id: bindingId, techId: technicianId },
    });
    if (!binding) throw new NotFoundException('绑定申请不存在');
    if (binding.status !== 'pending') {
      throw new BadRequestException('该申请已处理');
    }

    const hasDefault = await this.prisma.clientTechBinding.findFirst({
      where: { clientId: binding.clientId, status: 'active', isDefault: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.clientTechBinding.update({
        where: { id: binding.id },
        data: { status: 'active', isDefault: !hasDefault },
      });
      const client = await tx.clientUser.findUnique({
        where: { id: binding.clientId },
      });
      await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId,
            clientUserId: binding.clientId,
          },
        },
        update: {},
        create: {
          technicianId,
          clientUserId: binding.clientId,
          name: client?.nickname || client?.phone || '客户',
          phone: client?.phone || null,
          sourceType: 'binding',
          sourceRef: String(binding.id),
        },
      });
    });

    await this.sendBindingSystemMessage({
      clientId: binding.clientId,
      techId: technicianId,
      senderType: 'technician',
      senderId: technicianId,
      receiverType: 'client',
      receiverId: binding.clientId,
      content: '美甲师已通过您的绑定申请，现在可以预约和沟通啦～',
      relatedId: binding.id,
    });
    return { status: 'active' };
  }

  /// 美甲师拒绝绑定申请：置为 rejected 并通知客户。
  async rejectBindingApplication(
    technicianId: number,
    bindingId: number,
    reason?: string,
  ) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: { id: bindingId, techId: technicianId },
    });
    if (!binding) throw new NotFoundException('绑定申请不存在');
    if (binding.status !== 'pending') {
      throw new BadRequestException('该申请已处理');
    }
    await this.prisma.clientTechBinding.update({
      where: { id: binding.id },
      data: { status: 'rejected' },
    });
    const tail = reason?.trim() ? `：${reason.trim()}` : '';
    await this.sendBindingSystemMessage({
      clientId: binding.clientId,
      techId: technicianId,
      senderType: 'technician',
      senderId: technicianId,
      receiverType: 'client',
      receiverId: binding.clientId,
      content: `美甲师暂时拒绝了您的绑定申请${tail}`,
      relatedId: binding.id,
    });
    return { status: 'rejected' };
  }

  // ── 绑定相关：系统消息 + 格式化辅助 ──

  private formatClientAddress(
    addr: {
      province?: string | null;
      city?: string | null;
      district?: string | null;
      detailAddress?: string | null;
    } | null,
  ): string {
    if (!addr) return '未填写';
    const s = [addr.province, addr.city, addr.district, addr.detailAddress]
      .filter((x) => x && x.trim())
      .join('');
    return s || '未填写';
  }

  private formatDateTime(d: Date): string {
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private async sendBindingSystemMessage(params: {
    clientId: number;
    techId: number;
    senderType: string;
    senderId: number;
    receiverType: string;
    receiverId: number;
    content: string;
    relatedId: number;
  }) {
    const preview = params.content.split('\n')[0];
    let conversationId: number | null = null;
    let message: any = null;
    await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.upsert({
        where: {
          clientId_techId: { clientId: params.clientId, techId: params.techId },
        },
        update: { lastMessage: preview, lastMessageAt: new Date() },
        create: {
          clientId: params.clientId,
          techId: params.techId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });
      conversationId = conv.id;
      message = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderType: params.senderType,
          senderId: params.senderId,
          receiverType: params.receiverType,
          receiverId: params.receiverId,
          messageType: 'system',
          content: params.content,
          relatedType: 'binding',
          relatedId: params.relatedId,
        },
      });
    });
    if (message && conversationId) {
      try {
        const conv = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        this.chatGateway.server
          .to(`conversation:${String(conversationId)}`)
          .emit('message:new', { message, conversation: conv });
      } catch (e) {
        console.error('[ClientAuthService] 绑定系统消息 WS 推送失败:', e);
      }
    }
  }

  async unbindTechnician(clientUserId: number, techId: number) {
    const binding = await this.prisma.clientTechBinding.findUnique({
      where: {
        clientId_techId: {
          clientId: clientUserId,
          techId: techId,
        },
      },
    });

    if (!binding || binding.status !== 'active') {
      throw new NotFoundException('绑定关系不存在');
    }

    // 待上门/待到店/进行中：正在进行的预约，禁止解除绑定。
    const BLOCKING_STATUSES = ['pending_home', 'pending_shop', 'in_progress'];
    // 历史状态：解除后保留，不删除、不改动。
    const TERMINAL_STATUSES = ['completed', 'cancelled', 'expired'];

    const blockingCount = await this.prisma.order.count({
      where: {
        clientUserId,
        technicianId: techId,
        status: { in: BLOCKING_STATUSES },
      },
    });
    if (blockingCount > 0) {
      throw new BadRequestException(
        '有正在进行的美甲预约，无法解除与该美甲师的绑定关系，请完成预约再试',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 其余未完结的预约（待报价/待确认等）随解除一并取消；历史记录保留。
      await tx.order.updateMany({
        where: {
          clientUserId,
          technicianId: techId,
          status: { notIn: [...BLOCKING_STATUSES, ...TERMINAL_STATUSES] },
        },
        data: { status: 'cancelled' },
      });

      const updated = await tx.clientTechBinding.update({
        where: { id: binding.id },
        data: { status: 'inactive' },
      });

      // If unbinding the default, set another as default
      if (binding.isDefault) {
        const anotherBinding = await tx.clientTechBinding.findFirst({
          where: {
            clientId: clientUserId,
            status: 'active',
            id: { not: binding.id },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (anotherBinding) {
          await tx.clientTechBinding.update({
            where: { id: anotherBinding.id },
            data: { isDefault: true },
          });
        }
      }

      return updated;
    });

    return result;
  }

  async setDefaultTechnician(clientUserId: number, techId: number) {
    const binding = await this.prisma.clientTechBinding.findUnique({
      where: {
        clientId_techId: {
          clientId: clientUserId,
          techId: techId,
        },
      },
    });

    if (!binding || binding.status !== 'active') {
      throw new NotFoundException('绑定关系不存在');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.clientTechBinding.updateMany({
        where: { clientId: clientUserId },
        data: { isDefault: false },
      });

      await tx.clientTechBinding.update({
        where: { id: binding.id },
        data: { isDefault: true },
      });
    });

    return { success: true };
  }

  async updateProfile(
    clientUserId: number,
    data: {
      nickname?: string;
      avatarUrl?: string;
      city?: string | null;
      bio?: string | null;
    },
  ) {
    const client = await this.prisma.clientUser.update({
      where: { id: clientUserId },
      data: {
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.bio !== undefined && { bio: data.bio }),
      },
    });

    // Sync nickname to Customer.name for all technicians this client is bound to
    if (data.nickname !== undefined && data.nickname) {
      await this.prisma.customer.updateMany({
        where: { clientUserId },
        data: { name: data.nickname },
      });
    }

    return this.mapClientSelf(client);
  }

  private mapClientSelf(client: {
    id: number;
    nickname: string | null;
    phone: string;
    avatarUrl: string | null;
    city: string | null;
    bio: string | null;
    status: string;
  }) {
    return {
      id: client.id,
      nickname: client.nickname,
      phone: client.phone,
      avatarUrl: client.avatarUrl,
      city: client.city,
      bio: client.bio,
      status: client.status,
    };
  }

  async changePassword(
    clientUserId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });
    if (!client) {
      throw new NotFoundException('用户不存在');
    }
    if (!client.passwordHash) {
      throw new BadRequestException('账号未设置密码');
    }
    const valid = await bcrypt.compare(oldPassword, client.passwordHash);
    if (!valid) {
      throw new BadRequestException('当前密码不正确');
    }
    const sameAsOld = await bcrypt.compare(newPassword, client.passwordHash);
    if (sameAsOld) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.clientUser.update({
      where: { id: clientUserId },
      data: {
        passwordHash,
        managedPasswordCiphertext: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true };
  }

  private async findActiveTechnicianByInviteCode(
    inviteCode: string,
    notFoundMessage: string,
  ) {
    const technician = await this.prisma.technician.findFirst({
      where: {
        invitationCode: inviteCode,
        status: 'active',
      },
    });

    if (!technician) {
      throw new NotFoundException(notFoundMessage);
    }

    return technician;
  }

  async findTechnicianByInviteCode(inviteCode: string) {
    const technician = await this.findActiveTechnicianByInviteCode(
      inviteCode,
      '邀请码无效或美甲师不存在',
    );

    return {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      avatarUrl: technician.avatarUrl,
      city: technician.city,
      serviceArea: technician.serviceArea,
      status: technician.status,
      homeService: technician.homeService,
      shopService: technician.shopService,
      shopAddresses: technician.shopAddresses
        ? JSON.parse(technician.shopAddresses)
        : [],
      serviceItems: this.parseServiceItems(technician.serviceItems),
    };
  }

  private signToken(clientUserId: number, phone: string, tokenVersion = 0) {
    return this.jwtService.sign({
      sub: clientUserId,
      phone,
      userType: 'client',
      tv: tokenVersion,
    });
  }

  private signRefreshToken(
    clientUserId: number,
    phone: string,
    tokenVersion = 0,
  ) {
    return this.jwtService.sign(
      {
        sub: clientUserId,
        phone,
        userType: 'client',
        tokenType: 'refresh',
        tv: tokenVersion,
      },
      { expiresIn: '30d' },
    );
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

    const client = await this.prisma.clientUser.findUnique({
      where: { id: payload.sub },
    });

    if (!client || client.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    if ((payload.tv ?? 0) !== client.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }

    return {
      accessToken: this.signToken(client.id, client.phone, client.tokenVersion),
      refreshToken: this.signRefreshToken(
        client.id,
        client.phone,
        client.tokenVersion,
      ),
    };
  }

  private parseServiceItems(serviceItems: string | null) {
    return serviceItems ? JSON.parse(serviceItems) : buildDefaultServiceItems();
  }

  // 解析技师工作时间方案（供客户端预约日历联动休息日/工作时段）
  private parseServiceSchedule(serviceSchedule: string | null) {
    if (!serviceSchedule) return null;
    try {
      return JSON.parse(serviceSchedule);
    } catch {
      return null;
    }
  }
}
