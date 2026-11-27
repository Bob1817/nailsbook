import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEMO_FEATURE_FLAG_CODE } from './demo.seed';

/**
 * 后端强制 Demo 隔离与安全护栏拦截器：
 * 1. 检查演示环境总开关（demo_mode_enabled）
 * 2. 一期只读样板上下文拒绝任何写请求（403）
 * 3. 二期 Demo 会话拦截所有高危/影响真人的操作（改手机、解绑、注销、真实支付、批量删除/导出）
 * 4. 阻止 Demo 身份跨租户读取/操作非 Demo 账号数据
 */
@Injectable()
export class DemoPolicyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DemoPolicyInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path || request.url || '';
    const method: string = (request.method || 'GET').toUpperCase();
    const user = request.user as
      | {
          isDemo?: boolean;
          demoReadOnly?: boolean;
          technicianId?: number;
          clientUserId?: number;
        }
      | undefined;

    // 1. 只读样板公开路由，写请求一律拒绝
    if (
      path.startsWith('/api/demo/showcase') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
      path !== '/api/demo/showcase/quote-preview'
    ) {
      this.logger.warn(`[DEMO BLOCK] 只读样板间拒绝写请求 ${method} ${path}`);
      throw new ForbiddenException('样板间为只读演示，不可提交修改');
    }

    const isDemoSession = Boolean(user?.isDemo || user?.demoReadOnly);
    if (!isDemoSession) {
      return next.handle();
    }

    // 2. 一键停用开关检查（D6）
    const flag = await this.prisma.featureFlag.findUnique({
      where: { featureCode: DEMO_FEATURE_FLAG_CODE },
      select: { enabled: true },
    });
    if (flag && !flag.enabled) {
      throw new ServiceUnavailableException('演示环境维护中，暂不可用');
    }

    // 3. 只读令牌拦截所有写请求（POST/PUT/PATCH/DELETE）
    if (user?.demoReadOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      this.logger.warn(`[DEMO READONLY BLOCK] ${method} ${path}`);
      throw new ForbiddenException('样板间为只读演示，不可执行写操作');
    }

    // 4. 禁用清单后端强制（FR-2.5 — FR-2.10）
    const forbiddenRules: Array<{ pattern: RegExp; reason: string }> = [
      {
        pattern:
          /\/(reset-password|change-password|bind-phone|phone|wechat\/bind|wechat\/unbind)/i,
        reason: '演示账号不可修改绑定手机号、微信或密码',
      },
      {
        pattern: /\/(account-deletion|delete-account|deactivate|unbind)/i,
        reason: '演示账号不可注销或解绑',
      },
      {
        pattern: /\/(payments|checkout|refund|subscribe|subscription\/pay)/i,
        reason: '演示模式不会产生真实支付或退款',
      },
      {
        pattern: /\/(export|batch-delete|bulk-delete|bulk-remove)/i,
        reason: '演示账号禁止导出数据或批量删除',
      },
      {
        pattern: /\/(sms\/send|notifications\/broadcast)/i,
        reason: '演示账号禁止向外部发送真实通知',
      },
    ];

    for (const rule of forbiddenRules) {
      if (rule.pattern.test(path)) {
        this.logger.warn(
          `[DEMO POLICY BLOCK] tech=${user?.technicianId ?? '-'} client=${user?.clientUserId ?? '-'} ${method} ${path}`,
        );
        throw new ForbiddenException(rule.reason);
      }
    }

    // 5. 跨租户访问隔离校验（DR-2）：如果请求显式携带了 technicianId，必须属于 isDemo 租户
    const requestedTechIdRaw =
      request.params?.technicianId ??
      request.query?.technicianId ??
      request.body?.technicianId;
    if (requestedTechIdRaw !== undefined && requestedTechIdRaw !== null && requestedTechIdRaw !== '') {
      const requestedTechId = Number(requestedTechIdRaw);
      if (Number.isFinite(requestedTechId)) {
        if (user?.technicianId && requestedTechId !== user.technicianId) {
          this.logger.warn(
            `[DEMO TENANT BLOCK] tech=${user.technicianId} tried accessing tech=${requestedTechId}`,
          );
          throw new ForbiddenException('演示账号无权访问其他美甲师数据');
        }
        const targetTech = await this.prisma.technician.findUnique({
          where: { id: requestedTechId },
          select: { isDemo: true },
        });
        if (!targetTech || !targetTech.isDemo) {
          this.logger.warn(
            `[DEMO TENANT BLOCK] demo session tried accessing non-demo tech=${requestedTechId}`,
          );
          throw new ForbiddenException('演示会话仅可访问演示租户数据');
        }
      }
    }

    return next.handle();
  }
}
