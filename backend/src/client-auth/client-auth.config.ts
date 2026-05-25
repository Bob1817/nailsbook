import { ConfigService } from '@nestjs/config';

export function getClientJwtSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>('CLIENT_JWT_SECRET') ??
    configService.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error('CLIENT_JWT_SECRET is required for client auth');
  }

  return secret;
}
