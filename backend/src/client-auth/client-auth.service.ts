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
import { BindTechnicianDto } from './dto/bind-technician.dto';
import { VerificationCodeService } from '../common/verification-code/verification-code.service';
import { SmsService } from '../common/sms/sms.service';

@Injectable()
export class ClientAuthService {
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly verificationCode: VerificationCodeService,
    private readonly sms: SmsService,
  ) {}

  // 忘记密码：发送验证码（防枚举，统一返回；仅已注册账号真正发送）
  async sendResetCode(phone: string) {
    try {
      const client = await this.prisma.clientUser.findUnique({ where: { phone } });
      if (client && client.passwordHash) {
        const code = this.verificationCode.generate(phone);
        await this.sms.sendVerificationCode(phone, code, '重置密码');
      }
    } catch {
      // 频率限制等错误静默，避免暴露手机号是否注册
    }
    return { sent: true, devCode: this.verificationCode.getDevCode() };
  }

  // 忘记密码：校验验证码并重置密码
  async resetPasswordByCode(phone: string, code: string, newPassword: string) {
    this.verificationCode.validate(phone, code);
    const client = await this.prisma.clientUser.findUnique({ where: { phone } });
    if (!client || !client.passwordHash) {
      throw new BadRequestException('该手机号未注册');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.clientUser.update({
      where: { id: client.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return { success: true };
  }

  async checkPhone(phone: string) {
    const client = await this.prisma.clientUser.findUnique({
      where: { phone },
    });
    return { exists: !!client };
  }

  async registerByInvite(dto: RegisterByInviteDto) {
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clientUser.create({
        data: {
          phone: dto.phone,
          passwordHash,
        },
      });

      await tx.clientTechBinding.create({
        data: {
          clientId: created.id,
          techId: technician.id,
          inviteCode: dto.inviteCode,
          bindSource: 'invite',
          isDefault: true,
        },
      });

      // 同时在该美甲师的客户列表里创建一条记录
      await tx.customer.create({
        data: {
          technicianId: technician.id,
          clientUserId: created.id,
          name: created.nickname || dto.phone,
          phone: dto.phone,
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
      bindSource: 'invite',
    };

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
      technician: technicianPayload,
      technicians: [technicianPayload],
    };
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
      throw new UnauthorizedException('账号未设置密码，请重新注册');
    }

    const valid = await bcrypt.compare(dto.password, client.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (client.bindings.length === 0) {
      throw new UnauthorizedException(
        '该账号尚未绑定美甲师，请先通过邀请码注册/绑定',
      );
    }

    const defaultBinding =
      client.bindings.find((b) => b.isDefault) || client.bindings[0];

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

    return {
      id: client.id,
      nickname: client.nickname,
      phone: client.phone,
      avatarUrl: client.avatarUrl,
      city: client.city,
      bio: client.bio,
      status: client.status,
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
        isDefault: b.isDefault,
        bindSource: b.bindSource,
        bindId: b.id,
      })),
    };
  }

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

    const existingBinding = await this.prisma.clientTechBinding.findUnique({
      where: {
        clientId_techId: {
          clientId: clientUserId,
          techId: dto.techId,
        },
      },
    });

    if (existingBinding && existingBinding.status === 'active') {
      throw new ConflictException('您已绑定该美甲师');
    }

    return await this.prisma.$transaction(async (tx) => {
      // If set as default, unset other defaults
      if (dto.isDefault) {
        await tx.clientTechBinding.updateMany({
          where: { clientId: clientUserId },
          data: { isDefault: false },
        });
      }

      let result;
      if (existingBinding) {
        result = await tx.clientTechBinding.update({
          where: { id: existingBinding.id },
          data: {
            status: 'active',
            isDefault: dto.isDefault,
            inviteCode: dto.inviteCode,
          },
          include: { technician: true },
        });
      } else {
        result = await tx.clientTechBinding.create({
          data: {
            clientId: clientUserId,
            techId: dto.techId,
            inviteCode: dto.inviteCode,
            bindSource: 'manual',
            isDefault: dto.isDefault,
          },
          include: { technician: true },
        });
      }

      // 确保该美甲师的客户列表里有这个客户
      const clientUser = await tx.clientUser.findUnique({
        where: { id: clientUserId },
      });
      await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId: dto.techId,
            clientUserId,
          },
        },
        update: {},
        create: {
          technicianId: dto.techId,
          clientUserId,
          name: clientUser?.nickname || clientUser?.phone || '客户',
          phone: clientUser?.phone || null,
        },
      });

      return result;
    });
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

    const result = await this.prisma.$transaction(async (tx) => {
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
      data: { passwordHash, tokenVersion: { increment: 1 } },
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
      refreshToken: this.signRefreshToken(client.id, client.phone, client.tokenVersion),
    };
  }

  private parseServiceItems(serviceItems: string | null) {
    return serviceItems
      ? JSON.parse(serviceItems)
      : ClientAuthService.DEFAULT_SERVICE_ITEMS;
  }
}
