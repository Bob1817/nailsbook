import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { RegisterByInviteDto } from './dto/register-by-invite.dto';
import { BindTechnicianDto } from './dto/bind-technician.dto';

@Injectable()
export class ClientAuthService {
  private static readonly DEFAULT_SERVICE_ITEMS = [
    { id: 'svc_basic_care_1', name: '基础护理与修形', description: '指甲修剪、修形、去死皮、护理等基础服务', category: 'basic_care', isActive: true, sortOrder: 1 },
    { id: 'svc_color_style_1', name: '色彩与款式制作', description: '纯色美甲、彩绘、渐变、贴纸等款式设计服务', category: 'color_style', isActive: true, sortOrder: 2 },
    { id: 'svc_extension_1', name: '指甲延长与加固', description: '甲片延长、光疗延长、指甲加固等服务', category: 'extension_reinforcement', isActive: true, sortOrder: 3 },
    { id: 'svc_removal_1', name: '卸甲服务', description: '卸除甲油胶、卸甲片等服务', category: 'removal', isActive: true, sortOrder: 4 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async requestLoginCode(phone: string) {
    const client = await this.prisma.clientUser.findUnique({
      where: { phone },
      include: {
        bindings: {
          where: { status: 'active' },
        },
      },
    });

    if (!client) {
      throw new UnauthorizedException('该手机号码还未注册，请先注册后再登录');
    }

    if (client.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (client.bindings.length === 0) {
      throw new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定');
    }

    return this.buildCodeSentResponse();
  }

  async requestRegisterCode(phone: string, inviteCode: string) {
    void phone;

    await this.findActiveTechnicianByInviteCode(
      inviteCode,
      '该邀请码无效，请跟您的美甲师确认后再注册',
    );

    return this.buildCodeSentResponse();
  }

  async registerByInvite(dto: RegisterByInviteDto) {
    this.validateCode(dto.code);

    const technician = await this.findActiveTechnicianByInviteCode(
      dto.inviteCode,
      '该邀请码无效，请跟您的美甲师确认后再注册',
    );

    const client = await this.prisma.$transaction(async (tx) => {
      const currentClient = await tx.clientUser.upsert({
        where: { phone: dto.phone },
        update: {},
        create: {
          phone: dto.phone,
        },
      });

      if (currentClient.status !== 'active') {
        throw new UnauthorizedException('账号已被禁用');
      }

      // Check if already bound to this technician
      const existingBinding = await tx.clientTechBinding.findUnique({
        where: {
          clientId_techId: {
            clientId: currentClient.id,
            techId: technician.id,
          },
        },
      });

      if (existingBinding) {
        if (existingBinding.status !== 'active') {
          // Reactivate binding
          await tx.clientTechBinding.update({
            where: { id: existingBinding.id },
            data: { status: 'active' },
          });
        }
      } else {
        // Check if this is the first binding
        const bindingCount = await tx.clientTechBinding.count({
          where: { clientId: currentClient.id, status: 'active' },
        });

        await tx.clientTechBinding.create({
          data: {
            clientId: currentClient.id,
            techId: technician.id,
            inviteCode: dto.inviteCode,
            bindSource: 'invite',
            isDefault: bindingCount === 0, // First binding is default
          },
        });
      }

      return currentClient;
    });

    return {
      accessToken: this.signToken(client.id, client.phone),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        status: client.status,
      },
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
      },
    };
  }

  async login(dto: ClientLoginDto) {
    this.validateCode(dto.code);

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
      throw new UnauthorizedException('手机号或验证码错误');
    }

    if (client.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (client.bindings.length === 0) {
      throw new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定');
    }

    const defaultBinding = client.bindings.find((b) => b.isDefault) || client.bindings[0];

    return {
      accessToken: this.signToken(client.id, client.phone),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
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
        serviceItems: this.parseServiceItems(defaultBinding.technician.serviceItems),
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
        shopAddresses: b.technician.shopAddresses ? JSON.parse(b.technician.shopAddresses) : [],
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
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
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
              serviceItems: this.parseServiceItems(defaultBinding.technician.serviceItems),
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
        shopAddresses: b.technician.shopAddresses ? JSON.parse(b.technician.shopAddresses) : [],
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

      if (existingBinding) {
        // Reactivate
        return await tx.clientTechBinding.update({
          where: { id: existingBinding.id },
          data: {
            status: 'active',
            isDefault: dto.isDefault,
            inviteCode: dto.inviteCode,
          },
          include: { technician: true },
        });
      } else {
        return await tx.clientTechBinding.create({
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

  async updateProfile(clientUserId: number, data: { nickname?: string; avatarUrl?: string }) {
    const client = await this.prisma.clientUser.update({
      where: { id: clientUserId },
      data,
    });

    return {
      id: client.id,
      nickname: client.nickname,
      phone: client.phone,
      avatarUrl: client.avatarUrl,
      status: client.status,
    };
  }

  private validateCode(code: string) {
    const expectedCode = this.getVerificationCode();

    if (!expectedCode || code !== expectedCode) {
      throw new UnauthorizedException('手机号或验证码错误');
    }
  }

  private buildCodeSentResponse() {
    return {
      codeSent: true,
      devCode: this.getVerificationCode(),
    };
  }

  private getVerificationCode() {
    const configuredCode = this.configService.get<string>(
      'CLIENT_MVP_VERIFICATION_CODE',
    );

    if (configuredCode) {
      return configuredCode;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const allowDevFallback =
      this.configService.get<string>('ALLOW_DEV_MVP_VERIFICATION_CODE') ===
      'true';

    return nodeEnv === 'development' && allowDevFallback
      ? '123456'
      : undefined;
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
    };
  }

  private signToken(clientUserId: number, phone: string) {
    return this.jwtService.sign({
      sub: clientUserId,
      phone,
      userType: 'client',
    });
  }

  private parseServiceItems(serviceItems: string | null) {
    return serviceItems ? JSON.parse(serviceItems) : ClientAuthService.DEFAULT_SERVICE_ITEMS;
  }
}
