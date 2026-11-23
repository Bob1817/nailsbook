import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SystemErrorsService } from '../../system-errors/system-errors.service';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  constructor(private readonly systemErrorsService?: SystemErrorsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    // 仅记录并告警 500 级严重异常或未捕获的运行时错误，不干扰 400/401/403/404 等正常业务拒绝
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      const errorMsg =
        typeof message === 'object' && message !== null
          ? JSON.stringify(message)
          : String(message);

      this.logger.error(
        `[500 Server Error] ${request.method} ${request.url} - ${errorMsg}`,
        stack,
      );

      if (this.systemErrorsService) {
        this.systemErrorsService
          .recordError(
            {
              source: 'backend',
              errorType: 'http_500',
              message: errorMsg,
              stack,
              route: request.url,
              method: request.method,
              statusCode: status,
              userRole: (request as any).user?.role || undefined,
              userId:
                (request as any).user?.id ||
                (request as any).user?.technicianId ||
                (request as any).user?.clientUserId ||
                undefined,
              deviceInfo: request.headers['user-agent']
                ? JSON.stringify({ userAgent: request.headers['user-agent'] })
                : undefined,
            },
            request.ip,
          )
          .catch(() => {});
      }
    }

    if (!response.headersSent) {
      if (exception instanceof HttpException) {
        response.status(status).json(exception.getResponse());
      } else {
        response.status(status).json({
          statusCode: status,
          message: '服务器遇到异常，已自动记录并通知管理员处理',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }
}
