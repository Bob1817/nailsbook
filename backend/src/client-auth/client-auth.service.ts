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
import { buildDefaultServiceItems } from '../common/default-service-items';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class ClientAuthService {
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
      const client = await this.prisma.clientUser.findUnique({ where: { phone } });
      if (client && client.passwordHash) {
        const code = this.verificationCode.generate(phone);
        // 后台发送（带重试），不阻塞响应，也消除"是否注册"的响应耗时差异
        void this.sms.sendVerificationCode(phone, code, '重置密码').catch(() => {});
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
          nickname: dto.nickname || null,
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
          name: dto.nickname || dto.phone,
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
        serviceSchedule: this.parseServiceSchedule(b.technician.serviceSchedule),
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
        serviceSchedule: this.parseServiceSchedule(b.technician.serviceSchedule),
        isDefault: b.isDefault,
        bindSource: b.bindSource,
        bindId: b.id,
      })),
    };
  }

  /// 申请绑定美甲师（改为审批制）：校验邀请码后创建/复用 pending 绑定申请，
  /// 并向美甲师发送含客户姓名/手机/地址/时间/备注的系统消息，等待美甲师审批。
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

    const existing = await this.prisma.clientTechBinding.findUnique({
      where: {
        clientId_techId: { clientId: clientUserId, techId: dto.techId },
      },
    });
    if (existing?.status === 'active') {
      throw new ConflictException('您已绑定该美甲师');
    }
    if (existing?.status === 'pending') {
      throw new ConflictException('绑定申请审核中，请等待美甲师通过');
    }

    const note = dto.note?.trim() || null;
    const binding = existing
      ? await this.prisma.clientTechBinding.update({
          where: { id: existing.id },
          data: {
            status: 'pending',
            inviteCode: dto.inviteCode,
            bindSource: 'manual',
            note,
          },
          include: { technician: true },
        })
      : await this.prisma.clientTechBinding.create({
          data: {
            clientId: clientUserId,
            techId: dto.techId,
            inviteCode: dto.inviteCode,
            bindSource: 'manual',
            status: 'pending',
            note,
          },
          include: { technician: true },
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
      techId: dto.techId,
      senderType: 'client',
      senderId: clientUserId,
      receiverType: 'technician',
      receiverId: dto.techId,
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

  private formatClientAddress(addr: {
    province?: string | null;
    city?: string | null;
    district?: string | null;
    detailAddress?: string | null;
  } | null): string {
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
      : buildDefaultServiceItems();
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
