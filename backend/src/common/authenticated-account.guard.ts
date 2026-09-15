import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** 允许有效的客户或美甲师登录态访问。 */
@Injectable()
export class AuthenticatedAccountGuard extends AuthGuard([
  'client-jwt',
  'technician-jwt',
]) {}
