import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { OperationLogInterceptor } from './operation-log.interceptor';

export interface OperationLogOptions {
  module: string;
  action: string;
  targetType?: string;
  logResponse?: boolean;
}

export const OperationLog = (options: OperationLogOptions) =>
  applyDecorators(
    SetMetadata('operationLog', options),
    UseInterceptors(OperationLogInterceptor),
  );
