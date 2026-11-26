import { resolvePhoneRole } from '../common/account-role-policy';
import { recordWorkShareRegistration } from '../common/work-share-registration';
import { eraseAccountData, findAccountBlockers } from '../account-deletion/account-erasure.util';
import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientAuthService } from '../client-auth/client-auth.service';
import { TechnicianAuthService } from '../technician-auth/technician-auth.service';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { WechatOfficialAlertService } from '../wechat-official/wechat-official-alert.service';
import {
  WechatClientCompleteDto,
  WechatTechnicianCompleteDto,
} from './dto/wechat-complete.dto';
import { WechatPhoneResetDto } from './dto/wechat-phone-reset.dto';

interface Code2SessionResult {
  appId?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
}

interface PhoneResult {
  errcode?: number;
  phone_info?: { phoneNumber?: string; purePhoneNumber?: string };
}

@Injectable()
export class WechatAuthService {
  private accessToken?: { value: string; expiresAt: number };
  private accessTokenRequest?: Promise<string>;
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly clientAuth: ClientAuthService,
    private readonly technicianAuth: TechnicianAuthService,
    private readonly platformConfig: WechatPlatformConfigService,
    @Optional() private readonly dingtalkAlert?: DingtalkAlertService,
    @Optional() private readonly wechatAlert?: WechatOfficialAlertService,
  ) {}

  async login(code: string, requestedRole?: 'client' | 'technician') {
    const session = await this.exchangeCode(code);
    const appId = session.appId!;
    const identity = await this.prisma.wechatIdentity.findUnique({
      where: { appId_openId: { appId, openId: session.openid! } },
    });
    const roles = [
      identity?.clientUserId ? 'client' : null,
      identity?.technicianId ? 'technician' : null,
    ].filter(Boolean) as Array<'client' | 'technician'>;

    if (identity?.clientUserId && identity?.technicianId) throw new ConflictException('该微信存在历史账号角色冲突，请联系管理员处理');
    if (requestedRole && identity?.clientUserId) {
      return {
        authenticated: true,
        role: 'client' as const,
        ...(await this.clientAuth.loginByWechat(identity.clientUserId)),
      };
    }
    if (requestedRole && identity?.technicianId) {
      return {
        authenticated: true,
        role: 'technician' as const,
        roles,
        ...(await this.technicianAuth.loginByWechat(identity.technicianId)),
      };
    }

    return {
      authenticated: false,
      requiresBinding: true,
      roles,
      wechatSessionToken: this.jwt.sign(
        {
          appId,
          openId: session.openid,
          unionId: session.unionid,
          tokenType: 'wechat-session',
        },
        { expiresIn: '10m' },
      ),
    };
  }

  async accountStatus(phone: string) {
    const account = await resolvePhoneRole(this.prisma, phone);
    return { exists: !!account.role, role: account.role };
  }

  async verifySessionToken(token: string) {
    try {
      const payload = this.jwt.verify(token);
      if (payload.tokenType !== 'wechat-session' || !payload.openId) {
        throw new Error('invalid token type');
      }
      const credentials = await this.platformConfig.getLoginCredentials();
      if (payload.appId !== credentials.appId) {
        throw new Error('invalid app id');
      }
      return payload as { appId: string; openId: string; unionId?: string };
    } catch {
      throw new UnauthorizedException('微信登录状态已过期，请重试');
    }
  }

  async completeClient(dto: WechatClientCompleteDto) {
    const session = await this.verifySessionToken(dto.wechatSessionToken);
    let phone: string;
    if (dto.conversionToken) {
      let payload: any;
      try {
        payload = this.jwt.verify(dto.conversionToken);
      } catch {
        throw new UnauthorizedException('角色转换确认已过期，请重新授权');
      }
      if (
        payload?.tokenType !== 'tech-to-client-conversion' ||
        payload.openId !== session.openId ||
        !payload.phone
      ) {
        throw new UnauthorizedException('角色转换凭证无效，请重试');
      }
      phone = payload.phone;
    } else {
      phone = await this.exchangePhoneCode(dto.phoneCode || '');
    }
    const account = await resolvePhoneRole(this.prisma, phone);
    if (account.technician) {
      const isClientFlow = Boolean(
        dto.inviteCode ||
        dto.quickBookingTechId ||
        dto.targetRole === 'client' ||
        dto.confirmTechnicianConversion,
      );
      if (!isClientFlow) {
        const result = await this.technicianAuth.loginByWechat(account.technician.id);
        await this.linkIdentity(session, 'technician', account.technician.id);
        return { authenticated: true, role: 'technician' as const, roles: ['technician'], ...result };
      }
      if (!dto.confirmTechnicianConversion) {
        const conversionToken = this.jwt.sign(
          {
            tokenType: 'tech-to-client-conversion',
            phone,
            technicianId: account.technician.id,
            openId: session.openId,
          },
          { expiresIn: '5m' },
        );
        return {
          authenticated: false,
          needsTechnicianConversion: true,
          conversionToken,
          phone,
          message: '该手机号码已经注册了美甲师账号，是否将美甲师账号转换成客户账号？',
        };
      }
      await this.prisma.$transaction(async (tx) => {
        const blockers = await findAccountBlockers(tx, 'technician', account.technician!.id);
        if (blockers.length) {
          throw new ConflictException(`美甲师账号尚有未完结事项，暂无法注销转换：${blockers.join('；')}`);
        }
        await eraseAccountData(tx, 'technician', account.technician!.id);
      });
    }
    let client = account.client;
    const isNewClient = !client;

    let resolvedInviteCode = dto.inviteCode;
    if (!resolvedInviteCode && dto.quickBookingTechId) {
      const tech = await this.prisma.technician.findUnique({
        where: { id: dto.quickBookingTechId },
        select: { invitationCode: true, status: true },
      });
      if (tech && tech.status === 'active' && tech.invitationCode) {
        resolvedInviteCode = tech.invitationCode;
      }
    }

    if (!client) {
      if (!resolvedInviteCode && !dto.confirmTechnicianConversion) {
        // 手机号已由微信侧验证，但账号未注册：返回可识别状态，由前端提示并跳转注册
        return {
          authenticated: false,
          needsRegistration: true,
          phone,
          message: '该手机号尚未注册，请先完成注册',
        };
      }
      if (!resolvedInviteCode && dto.confirmTechnicianConversion) {
        client = await this.prisma.clientUser.create({
          data: {
            phone,
            passwordHash: '',
            managedPasswordCiphertext: null,
            status: 'active',
          },
        });
        const regPayload = { role: 'client' as const, name: null, phone: client.phone, source: '微信小程序注册' };
        this.dingtalkAlert?.notifyUserRegistration(regPayload).catch(() => {});
        this.wechatAlert?.notifyUserRegistration(regPayload).catch(() => {});
      } else {
        if (dto.quickBookingTechId) {
          await this.clientAuth.validateQuickBookingInvite(
            dto.quickBookingTechId,
            resolvedInviteCode!,
          );
        }
        const registered = await this.clientAuth.registerClientByWechatInvite(
          {
            phone,
            inviteCode: resolvedInviteCode!,
            source: dto.source === 'card' ? 'card' : 'invite',
          },
          session,
        );
        client = await this.prisma.clientUser.findUnique({
          where: { id: registered.client.id },
        });
      }
    }

    if (!client) throw new BadRequestException('客户账号创建失败');

    // 新用户同步创建 wechatIdentity
    if (isNewClient) {
      await this.prisma.wechatIdentity.create({
        data: { appId: session.appId, openId: session.openId, unionId: session.unionId, clientUserId: client.id },
      });
    }

    if (isNewClient) await recordWorkShareRegistration(this.prisma, client.id, dto);

    // 已有账号但未绑定微信 → 关联身份
    if (!isNewClient) await this.linkIdentity(session, 'client', client.id);

    // Existing accounts only authenticate here. Booking/quote actions own binding.

    return {
      authenticated: true,
      role: 'client' as const,
      isNewClient,
      ...(await this.clientAuth.loginByWechat(client.id)),
    };
  }

  async completeTechnician(dto: WechatTechnicianCompleteDto) {
    const session = await this.verifySessionToken(dto.wechatSessionToken);
    const phone = await this.exchangePhoneCode(dto.phoneCode || '');
    const account = await resolvePhoneRole(this.prisma, phone);
    if (account.client) {
      const result = await this.clientAuth.loginByWechat(account.client.id);
      await this.linkIdentity(session, 'client', account.client.id);
      return { authenticated: true, role: 'client' as const, ...result, roles: ['client'] };
    }
    let technician = account.technician;
    const isNewTechnician = !technician;

    if (!technician) {
      if (!dto.name) {
        throw new BadRequestException('请输入美甲师姓名');
      }
      // 密码可选：不填则生成随机密码，用户后续通过微信免密登录
      const password = dto.password || this.generateRandomPassword();
      const registered = await this.technicianAuth.register(
        {
          inviteKey: dto.inviteKey,
          name: dto.name,
          phone,
          password,
        },
        session,
      );
      technician = await this.prisma.technician.findUnique({
        where: { id: registered.technician.id },
      });
    }
    if (!technician) throw new BadRequestException('美甲师账号创建失败');

    if (!isNewTechnician) {
      await this.linkIdentity(session, 'technician', technician.id);
    }
    return {
      authenticated: true,
      role: 'technician' as const,
      ...(await this.technicianAuth.loginByWechat(technician.id)),
    };
  }

  /** 忘记密码（客户）：微信手机号授权验证号码归属后直接重置，无需短信验证码 */
  async resetClientPasswordByPhoneCode(dto: WechatPhoneResetDto) {
    const phone = await this.exchangePhoneCode(dto.phoneCode || '');
    if (phone !== dto.phone) {
      throw new BadRequestException('微信授权手机号与填写手机号不一致，请重新授权');
    }
    return this.clientAuth.resetPasswordByPhoneOwnership(dto.phone, dto.newPassword);
  }

  /** 忘记密码（美甲师）：微信手机号授权验证号码归属后直接重置，无需短信验证码 */
  async resetTechnicianPasswordByPhoneCode(dto: WechatPhoneResetDto) {
    const phone = await this.exchangePhoneCode(dto.phoneCode || '');
    if (phone !== dto.phone) {
      throw new BadRequestException('微信授权手机号与填写手机号不一致，请重新授权');
    }
    return this.technicianAuth.resetPasswordByPhoneOwnership(dto.phone, dto.newPassword);
  }

  /** 首次设密（美甲师）：微信手机号授权验证号码归属后设置登录密码并自动登录 */
  async setTechnicianInitialPasswordByPhoneCode(dto: WechatPhoneResetDto) {
    const phone = await this.exchangePhoneCode(dto.phoneCode || '');
    if (phone !== dto.phone) {
      throw new BadRequestException('微信授权手机号与填写手机号不一致，请重新授权');
    }
    return this.technicianAuth.setInitialPasswordByPhoneOwnership(dto.phone, dto.newPassword);
  }

  private async linkIdentity(
    session: { appId: string; openId: string; unionId?: string },
    role: 'client' | 'technician',
    accountId: number,
  ) {
    const identity = await this.prisma.wechatIdentity.findUnique({
      where: {
        appId_openId: { appId: session.appId, openId: session.openId },
      },
    });
    const linkedId =
      role === 'client' ? identity?.clientUserId : identity?.technicianId;
    const oppositeRoleId =
      role === 'client' ? identity?.technicianId : identity?.clientUserId;

    if (oppositeRoleId) {
      const isOppositeActive =
        role === 'client'
          ? await this.prisma.technician.findFirst({
              where: { id: oppositeRoleId, status: { not: 'deleted' } },
              select: { id: true },
            })
          : await this.prisma.clientUser.findFirst({
              where: { id: oppositeRoleId, status: { not: 'deleted' } },
              select: { id: true },
            });
      if (isOppositeActive) {
        throw new ConflictException('该微信已绑定其他账号');
      }
    }

    if (linkedId && linkedId !== accountId) {
      const isLinkedActive =
        role === 'client'
          ? await this.prisma.clientUser.findFirst({
              where: { id: linkedId, status: { not: 'deleted' } },
              select: { id: true },
            })
          : await this.prisma.technician.findFirst({
              where: { id: linkedId, status: { not: 'deleted' } },
              select: { id: true },
            });
      if (isLinkedActive) {
        throw new ConflictException('该微信已绑定其他账号');
      }
    }

    const accountIdentity = await this.prisma.wechatIdentity.findFirst({
      where:
        role === 'client'
          ? { clientUserId: accountId }
          : { technicianId: accountId },
    });
    if (accountIdentity && accountIdentity.openId !== session.openId) {
      throw new ConflictException('该账号已绑定其他微信');
    }

    await this.prisma.wechatIdentity.upsert({
      where: {
        appId_openId: { appId: session.appId, openId: session.openId },
      },
      create: {
        appId: session.appId,
        openId: session.openId,
        unionId: session.unionId,
        ...(role === 'client'
          ? { clientUserId: accountId, technicianId: null }
          : { technicianId: accountId, clientUserId: null }),
      },
      update: {
        unionId: session.unionId,
        ...(role === 'client'
          ? { clientUserId: accountId, technicianId: null }
          : { technicianId: accountId, clientUserId: null }),
      },
    });
  }

  /** 仅通过小程序 wx.login() 临时 code 实时换取当前手机微信 openId（不修改账号绑定关系） */
  async resolveOpenIdByCode(code: string): Promise<string | null> {
    const session = await this.exchangeCode(code);
    return session.openid ?? null;
  }

  private async exchangeCode(code: string): Promise<Code2SessionResult> {
    const credentials = await this.platformConfig.getLoginCredentials();
    const appId = credentials.appId;
    const secret = credentials.appSecret;
    const params = new URLSearchParams({
      appid: appId,
      secret,
      js_code: code,
      grant_type: 'authorization_code',
    });

    let response: Response;
    try {
      response = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`,
        { signal: AbortSignal.timeout(this.wechatTimeoutMs()) },
      );
    } catch {
      throw new BadGatewayException('微信登录服务暂时不可用');
    }
    if (!response.ok) {
      throw new BadGatewayException('微信登录服务暂时不可用');
    }
    const result = (await response.json()) as Code2SessionResult;
    if (result.errcode || !result.openid) {
      throw new UnauthorizedException('微信登录凭证无效，请重试');
    }
    return { ...result, appId };
  }

  private async exchangePhoneCode(code: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    let response: Response;
    try {
      response = await fetch(
        `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: AbortSignal.timeout(this.wechatTimeoutMs()),
        },
      );
    } catch {
      throw new BadGatewayException('微信手机号服务暂时不可用');
    }
    const result = (await response.json()) as PhoneResult;
    const phone = result.phone_info?.purePhoneNumber;
    if (!response.ok || result.errcode || !phone) {
      throw new BadRequestException('微信手机号授权无效，请重试');
    }
    return phone;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now()) {
      return this.accessToken.value;
    }
    if (this.accessTokenRequest) return this.accessTokenRequest;
    this.accessTokenRequest = this.requestAccessToken().finally(() => {
      this.accessTokenRequest = undefined;
    });
    return this.accessTokenRequest;
  }

  private async requestAccessToken(): Promise<string> {
    const credentials = await this.platformConfig.getLoginCredentials();
    const appId = credentials.appId;
    const secret = credentials.appSecret;
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: appId,
      secret,
    });
    let response: Response;
    try {
      response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`,
        { signal: AbortSignal.timeout(this.wechatTimeoutMs()) },
      );
    } catch {
      throw new BadGatewayException('微信服务暂时不可用');
    }
    const result = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
    };
    if (!response.ok || result.errcode || !result.access_token) {
      throw new BadGatewayException('微信服务暂时不可用');
    }
    this.accessToken = {
      value: result.access_token,
      expiresAt:
        Date.now() + Math.max((result.expires_in ?? 7200) - 300, 60) * 1000,
    };
    return result.access_token;
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 16; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    // 确保同时包含字母和数字以通过 IsStrongPassword 校验
    return pwd.slice(0, 14) + 'A1';
  }

  private wechatTimeoutMs() {
    const configured = Number(this.config.get('WECHAT_API_TIMEOUT_MS', 8000));
    return Number.isFinite(configured) && configured > 0 ? configured : 8000;
  }
}
