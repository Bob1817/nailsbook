import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface RegisterTokenInput {
  role: 'client' | 'technician';
  clientUserId?: number;
  technicianId?: number;
  token: string;
  platform: string;
}

/**
 * 服务端推送（FCM）。客户端在登录时上报设备 token，
 * 新消息 / 新预约等事件触发离线推送。
 *
 * 凭证来源（任一，按优先级）：
 *  - FIREBASE_SERVICE_ACCOUNT_BASE64 service account JSON 的 base64（推荐，env_file 无引号转义问题）
 *  - FIREBASE_SERVICE_ACCOUNT        service account JSON 字符串
 *  - GOOGLE_APPLICATION_CREDENTIALS  service account 文件路径（firebase-admin 默认读取）
 * 未配置时静默降级：仍存 token，但不发送推送（不影响主流程）。
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (getApps().length > 0) {
      this.enabled = true;
      return;
    }
    try {
      const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      const raw =
        process.env.FIREBASE_SERVICE_ACCOUNT ??
        (b64 ? Buffer.from(b64, 'base64').toString('utf8') : undefined);
      if (raw) {
        initializeApp({ credential: cert(JSON.parse(raw)) });
        this.enabled = true;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({ credential: applicationDefault() });
        this.enabled = true;
      } else {
        this.logger.warn(
          '未配置 Firebase 凭证（FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS），推送已禁用',
        );
      }
    } catch (e) {
      this.logger.error('Firebase 初始化失败，推送已禁用', e as Error);
    }
  }

  /** 上报 / 更新设备 token（token 唯一，重复上报即换绑当前用户）。 */
  async registerToken(input: RegisterTokenInput) {
    const owner =
      input.role === 'client'
        ? { clientUserId: input.clientUserId ?? null, technicianId: null }
        : { technicianId: input.technicianId ?? null, clientUserId: null };

    await this.prisma.deviceToken.upsert({
      where: { token: input.token },
      create: {
        token: input.token,
        platform: input.platform,
        role: input.role,
        ...owner,
      },
      update: {
        platform: input.platform,
        role: input.role,
        ...owner,
      },
    });
  }

  async sendToTechnician(technicianId: number, payload: PushPayload) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { technicianId, role: 'technician' },
      select: { token: true },
    });
    await this.send(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToClient(clientUserId: number, payload: PushPayload) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { clientUserId, role: 'client' },
      select: { token: true },
    });
    await this.send(
      tokens.map((t) => t.token),
      payload,
    );
  }

  /** 发送并清理失效 token。best-effort，绝不抛出以免影响主流程。 */
  private async send(tokens: string[], payload: PushPayload) {
    if (!this.enabled || tokens.length === 0) return;
    try {
      const res = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
      });
      const invalid: string[] = [];
      res.responses.forEach((r, i) => {
        if (
          !r.success &&
          (r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalid.push(tokens[i]);
        }
      });
      if (invalid.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: invalid } },
        });
      }
    } catch (e) {
      this.logger.error('推送发送失败', e as Error);
    }
  }
}
