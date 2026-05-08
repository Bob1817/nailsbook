import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TechnicianJwtAuthGuard extends AuthGuard('technician-jwt') {}
