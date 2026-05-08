import { Body, Controller, Get, Post, Put, Delete, Req, UseGuards, Param, Query } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtAuthGuard } from './client-jwt-auth.guard';
import { ClientLoginDto } from './dto/client-login.dto';
import { RegisterByInviteDto } from './dto/register-by-invite.dto';
import { BindTechnicianDto } from './dto/bind-technician.dto';
import {
  RequestClientLoginCodeDto,
  RequestClientRegisterCodeDto,
} from './dto/request-client-code.dto';

@Controller('client/auth')
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Get('find-by-invite-code')
  async findByInviteCode(@Query('code') code: string) {
    return this.clientAuthService.findTechnicianByInviteCode(code);
  }

  @Post('request-login-code')
  async requestLoginCode(@Body() body: RequestClientLoginCodeDto) {
    return this.clientAuthService.requestLoginCode(body.phone);
  }

  @Post('request-register-code')
  async requestRegisterCode(@Body() body: RequestClientRegisterCodeDto) {
    return this.clientAuthService.requestRegisterCode(body.phone, body.inviteCode);
  }

  @Post('register-by-invite')
  async registerByInvite(@Body() body: RegisterByInviteDto) {
    return this.clientAuthService.registerByInvite(body);
  }

  @Post('login')
  async login(@Body() body: ClientLoginDto) {
    return this.clientAuthService.login(body);
  }

  @Get('me')
  @UseGuards(ClientJwtAuthGuard)
  async me(@Req() request: { user: { clientUserId: number } }) {
    return this.clientAuthService.getProfile(request.user.clientUserId);
  }

  @Post('bind-technician')
  @UseGuards(ClientJwtAuthGuard)
  async bindTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: BindTechnicianDto,
  ) {
    return this.clientAuthService.bindTechnician(request.user.clientUserId, body);
  }

  @Delete('unbind-technician/:techId')
  @UseGuards(ClientJwtAuthGuard)
  async unbindTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('techId') techId: string,
  ) {
    return this.clientAuthService.unbindTechnician(request.user.clientUserId, parseInt(techId, 10));
  }

  @Post('set-default-technician/:techId')
  @UseGuards(ClientJwtAuthGuard)
  async setDefaultTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('techId') techId: string,
  ) {
    return this.clientAuthService.setDefaultTechnician(request.user.clientUserId, parseInt(techId, 10));
  }

  @Put('me')
  @UseGuards(ClientJwtAuthGuard)
  async updateProfile(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: { nickname?: string; avatarUrl?: string },
  ) {
    return this.clientAuthService.updateProfile(request.user.clientUserId, body);
  }
}
