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
    // 已通过 TechnicianJwtAuthGuard 的美甲师均为合法用户，直接放行
    return true;
  }
}
