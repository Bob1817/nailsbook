import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token as string | undefined;

    if (!token) {
      throw new WsException('Missing auth token');
    }

    const bearer = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Try client JWT first
    const clientSecret = this.configService.get<string>(
      'CLIENT_JWT_SECRET',
      this.configService.get<string>('JWT_SECRET', ''),
    );
    try {
      const payload = jwt.verify(bearer, clientSecret) as any;
      if (payload.userType === 'client') {
        (client as any).userId = payload.sub;
        (client as any).userType = 'client';
        return true;
      }
    } catch {}

    // Try technician JWT
    const techSecret = this.configService.get<string>(
      'TECHNICIAN_JWT_SECRET',
      this.configService.get<string>('JWT_SECRET', ''),
    );
    try {
      const payload = jwt.verify(bearer, techSecret) as any;
      if (payload.userType === 'technician') {
        (client as any).userId = payload.sub;
        (client as any).userType = 'technician';
        return true;
      }
    } catch {}

    throw new WsException('Invalid auth token');
  }
}
