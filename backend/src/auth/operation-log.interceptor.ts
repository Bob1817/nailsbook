import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<{
      module: string;
      action: string;
      targetType?: string;
      logResponse?: boolean;
    }>('operationLog', context.getHandler());

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user?.userId) return next.handle();

    // Persist intent before executing the mutation: an unavailable audit store
    // must not silently allow an unrecorded privileged operation.
    return defer(() => this.prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        module: options.module,
        action: options.action,
        targetType: options.targetType,
        targetId: params.id ? parseInt(params.id, 10) : undefined,
        afterData: JSON.stringify({ outcome: 'started' }),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    })).pipe(concatMap((log) => next.handle().pipe(
      concatMap(async (response) => {
        await this.prisma.operationLog.update({
          where: { id: log.id },
          data: {
            targetId: params.id ? parseInt(params.id, 10) : response?.id,
            afterData: JSON.stringify({
              outcome: 'succeeded',
              ...(options.logResponse !== false ? { response } : {}),
            }),
          },
        });
        return response;
      }),
      catchError((error) => {
        // The persisted intent remains even if updating the outcome fails.
        return defer(() => this.prisma.operationLog.update({
          where: { id: log.id },
          data: { afterData: JSON.stringify({ outcome: 'failed_or_unconfirmed' }) },
        })).pipe(concatMap(() => throwError(() => error)));
      }),
    )));
  }
}
