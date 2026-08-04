import { SetMetadata } from '@nestjs/common';

export interface OperationLogOptions {
  module: string;
  action: string;
  targetType?: string;
  logResponse?: boolean;
}

export const OperationLog = (options: OperationLogOptions) =>
  SetMetadata('operationLog', options);
