import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from './technician-jwt-auth.guard';
import { TechnicianAuthService } from './technician-auth.service';
import { TechnicianLoginDto } from './dto/technician-login.dto';
import { RequestTechnicianCodeDto } from './dto/request-technician-code.dto';
import { UpdateTechnicianProfileDto } from './dto/update-technician-profile.dto';
import { UpdateTechnicianSelfStatusDto } from './dto/update-technician-status.dto';
import { UpdateTechnicianServiceTypeDto } from './dto/update-service-type.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';

@ApiTags('美甲师-认证')
@ApiBearerAuth()
@Controller('technician/auth')
export class TechnicianAuthController {
  constructor(private readonly technicianAuthService: TechnicianAuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '美甲师登录' })
  @ApiBody({ type: TechnicianLoginDto })
  @ApiResponse({ status: 200, description: '登录成功，返回token' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  async login(@Body() body: TechnicianLoginDto) {
    return this.technicianAuthService.login(body.phone, body.password);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '刷新令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '返回新的访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.technicianAuthService.refreshAccessToken(body.refreshToken);
  }

  @Post('request-code')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '请求验证码' })
  @ApiBody({ type: RequestTechnicianCodeDto })
  @ApiResponse({ status: 200, description: '验证码已发送' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  async requestCode(@Body() body: RequestTechnicianCodeDto) {
    return this.technicianAuthService.requestCode(body.phone);
  }

  @Get('me')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '获取当前美甲师信息' })
  @ApiResponse({ status: 200, description: '返回美甲师资料' })
  @ApiResponse({ status: 401, description: '未授权' })
  async me(@Req() request: { user: { technicianId: number } }) {
    return this.technicianAuthService.getProfile(request.user.technicianId);
  }

  @Patch('status')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新美甲师状态' })
  @ApiBody({ type: UpdateTechnicianSelfStatusDto })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateStatus(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianSelfStatusDto,
  ) {
    return this.technicianAuthService.updateStatus(
      request.user.technicianId,
      body.status,
    );
  }

  @Patch('profile')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新美甲师资料' })
  @ApiBody({ type: UpdateTechnicianProfileDto })
  @ApiResponse({ status: 200, description: '资料更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateProfile(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianProfileDto,
  ) {
    return this.technicianAuthService.updateProfile(
      request.user.technicianId,
      body,
    );
  }

  @Patch('service-type')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新服务类型' })
  @ApiBody({ type: UpdateTechnicianServiceTypeDto })
  @ApiResponse({ status: 200, description: '服务类型更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateServiceType(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianServiceTypeDto,
  ) {
    console.log(
      'updateServiceType called with body:',
      JSON.stringify(body, null, 2),
    );
    return this.technicianAuthService.updateServiceType(
      request.user.technicianId,
      body,
    );
  }
}
