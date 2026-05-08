import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TechnicianJwtAuthGuard } from './technician-jwt-auth.guard';
import { TechnicianAuthService } from './technician-auth.service';
import { TechnicianLoginDto } from './dto/technician-login.dto';
import { RequestTechnicianCodeDto } from './dto/request-technician-code.dto';
import { UpdateTechnicianProfileDto } from './dto/update-technician-profile.dto';
import { UpdateTechnicianSelfStatusDto } from './dto/update-technician-status.dto';
import { UpdateTechnicianServiceTypeDto } from './dto/update-service-type.dto';

@Controller('technician/auth')
export class TechnicianAuthController {
  constructor(private readonly technicianAuthService: TechnicianAuthService) {}

  @Post('login')
  async login(@Body() body: TechnicianLoginDto) {
    return this.technicianAuthService.login(body.phone, body.password);
  }

  @Post('request-code')
  async requestCode(@Body() body: RequestTechnicianCodeDto) {
    return this.technicianAuthService.requestCode(body.phone);
  }

  @Get('me')
  @UseGuards(TechnicianJwtAuthGuard)
  async me(@Req() request: { user: { technicianId: number } }) {
    return this.technicianAuthService.getProfile(request.user.technicianId);
  }

  @Patch('status')
  @UseGuards(TechnicianJwtAuthGuard)
  async updateStatus(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianSelfStatusDto
  ) {
    return this.technicianAuthService.updateStatus(request.user.technicianId, body.status);
  }

  @Patch('profile')
  @UseGuards(TechnicianJwtAuthGuard)
  async updateProfile(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianProfileDto
  ) {
    return this.technicianAuthService.updateProfile(request.user.technicianId, body);
  }

  @Patch('service-type')
  @UseGuards(TechnicianJwtAuthGuard)
  async updateServiceType(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianServiceTypeDto
  ) {
    console.log('updateServiceType called with body:', JSON.stringify(body, null, 2));
    return this.technicianAuthService.updateServiceType(request.user.technicianId, body);
  }
}
