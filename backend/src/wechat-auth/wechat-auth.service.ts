import { recordWorkShareRegistration } from '../common/work-share-registration';
import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientAuthService } from '../client-auth/client-auth.service';
import { TechnicianAuthService } from '../technician-auth/technician-auth.service';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import {
  WechatClientCompleteDto,
  WechatTechnicianCompleteDto,
} from './dto/wechat-complete.dto';

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

    if (requestedRole === 'client' && identity?.clientUserId) {
      return {
        authenticated: true,
        role: 'client' as const,
        ...(await this.clientAuth.loginByWechat(identity.clientUserId)),
      };
    }
    if (requestedRole === 'technician' && identity?.technicianId) {
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
    if (dto.quickBookingTechId) {
      await this.clientAuth.validateQuickBookingInvite(dto.quickBookingTechId, dto.inviteCode);
    }
    const phone = await this.exchangePhoneCode(dto.phoneCode);
    let client = await this.prisma.clientUser.findUnique({ where: { phone } });
    const isNewClient = !client;

    if (!client) {
      if (dto.inviteCode) {
        // 通过邀请码注册：自动创建客户并绑定美甲师
        const registered = await this.clientAuth.registerClientByWechatInvite(
          {
            phone,
            inviteCode: dto.inviteCode,
            source: dto.source === 'card' ? 'card' : 'invite',
          },
          session,
        );
        client = await this.prisma.clientUser.findUnique({
          where: { id: registered.client.id },
        });
      } else {
        // 微信授权注册：创建客户账号（无需邀请码）
        client = await this.prisma.clientUser.create({
          data: {
            phone,
            passwordHash: '', // 待用户设置密码
            managedPasswordCiphertext: null,
            status: 'active',
          },
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

    // 新用户且无邀请码 → 需要选择角色
    if (isNewClient && !dto.inviteCode) {
      // 签发临时客户端 JWT，以便前端 role-select 页面调用 selectRole API
      const loginResult = await this.clientAuth.loginByWechat(client.id);
      return {
        authenticated: false,
        needsRoleSelection: true,
        wechatSessionToken: dto.wechatSessionToken,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        phone: client.phone,
        message: '请选择您要使用的身份',
      };
    }

    if (dto.quickBookingTechId) {
      await this.clientAuth.bindQuickBookingInvite(client.id, dto.quickBookingTechId, dto.inviteCode!);
    }

    // 一键预约和邀请码新客注册已完成微信身份与手机号验证，不强制设置备用密码。
    if (!client.passwordHash && !dto.quickBookingTechId && !(isNewClient && dto.inviteCode)) {
      return {
        authenticated: false,
        needsSetupPassword: true,
        passwordSetupToken: this.clientAuth.createPasswordSetupToken(client.id),
        phone: client.phone,
        message: '请设置登录密码',
      };
    }

    return {
      authenticated: true,
      role: 'client' as const,
      ...(await this.clientAuth.loginByWechat(client.id)),
    };
  }

  async completeTechnician(dto: WechatTechnicianCompleteDto) {
    const session = await this.verifySessionToken(dto.wechatSessionToken);
    const phone = await this.exchangePhoneCode(dto.phoneCode);
    let technician = await this.prisma.technician.findUnique({
      where: { phone },
    });
    const isNewTechnician = !technician;

    if (!technician) {
      if (!dto.inviteKey || !dto.name || !dto.password) {
        throw new BadRequestException('新美甲师需要邀请码、姓名和备用密码');
      }
      const registered = await this.technicianAuth.register(
        {
          inviteKey: dto.inviteKey,
          name: dto.name,
          phone,
          password: dto.password,
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
    if (linkedId && linkedId !== accountId) {
      throw new ConflictException('该微信已绑定其他账号');
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
          ? { clientUserId: accountId }
          : { technicianId: accountId }),
      },
      update: {
        unionId: session.unionId,
        ...(role === 'client'
          ? { clientUserId: accountId }
          : { technicianId: accountId }),
      },
    });
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

  private wechatTimeoutMs() {
    const configured = Number(this.config.get('WECHAT_API_TIMEOUT_MS', 8000));
    return Number.isFinite(configured) && configured > 0 ? configured : 8000;
  }
}
