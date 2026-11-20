import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TechnicianOptionalJwtAuthGuard extends AuthGuard('technician-jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
    }>();
    if (!request.headers?.authorization) return null as TUser;
    if (err || !user) return null as TUser;
    return user as TUser;
  }
}
