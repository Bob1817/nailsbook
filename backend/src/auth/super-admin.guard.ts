import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (context.switchToHttp().getRequest().user?.roleCode !== 'super_admin') {
      throw new ForbiddenException('仅超级管理员可管理账号和角色');
    }
    return true;
  }
}
