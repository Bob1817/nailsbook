import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
    }>('operationLog', context.getHandler());

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    return next.handle().pipe(
      tap((response) => {
        if (user && user.userId) {
          let targetId: number | undefined;
          if (params.id) {
            targetId = parseInt(params.id, 10);
          } else if (response && response.id) {
            targetId = response.id;
          }

          this.prisma.operationLog
            .create({
              data: {
                adminUserId: user.userId,
                module: options.module,
                action: options.action,
                targetType: options.targetType,
                targetId,
                beforeData: undefined,
                afterData: response ? JSON.stringify(response) : undefined,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
              },
            })
            .catch(() => {});
        }
      }),
    );
  }
}
