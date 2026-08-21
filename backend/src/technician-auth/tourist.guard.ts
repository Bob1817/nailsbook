import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 装饰器：标记路由为游客可访问（跳过 TouristGuard）
 */
export const ALLOW_TOURIST = 'ALLOW_TOURIST';
export const AllowTourist = () => SetMetadata(ALLOW_TOURIST, true);

/**
 * 游客美甲师权限守卫
 *
 * - 默认拦截所有非 GET 请求（POST/PUT/PATCH/DELETE）
 * - 被 @AllowTourist() 标记的路由不受影响
 * - 读取类操作（GET）不受影响，游客可以浏览
 *
 * 使用方式：
 *   @UseGuards(TechnicianJwtAuthGuard, TouristGuard)
 *   @Controller('technician/works')
 *
 * 如果某个写入路由需要游客也能访问，加 @AllowTourist()：
 *   @AllowTourist()
 *   @Post('like')
 */
@Injectable()
export class TouristGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查路由是否标记了 @AllowTourist()
    const allowTourist = this.reflector.getAllAndOverride<boolean>(
      ALLOW_TOURIST,
      [context.getHandler(), context.getClass()],
    );
    if (allowTourist) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 非 technician 用户放行（例如 client）
    if (!user || user.userType !== 'technician') {
      return true;
    }

    // 非游客用户放行
    if (!user.isTourist) {
      return true;
    }

    // GET/HEAD/OPTIONS 等读取操作放行
    const method = request.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    throw new ForbiddenException(
      '游客模式仅支持浏览，请激活美甲师账户后操作',
    );
  }
}
