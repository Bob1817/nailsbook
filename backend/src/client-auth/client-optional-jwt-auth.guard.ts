import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ClientOptionalJwtAuthGuard extends AuthGuard('client-jwt') {
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
    return super.handleRequest(err, user, info, context, status) as TUser;
  }
}
