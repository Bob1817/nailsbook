import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CustomServiceRequestsService } from './custom-service-requests.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { QuoteCustomServiceRequestDto } from './dto/quote-custom-service-request.dto';

@ApiTags('美甲师-定制服务')
@ApiBearerAuth()
@Controller('technician/custom-service-requests')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianCustomServiceRequestsController {
  constructor(
    private readonly customServiceRequestsService: CustomServiceRequestsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取定制服务请求列表' })
  @ApiResponse({ status: 200, description: '返回定制服务请求列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(@Req() request: { user: { technicianId: number } }) {
    return this.customServiceRequestsService.findAllForTechnician(
      request.user.technicianId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取定制服务请求详情' })
  @ApiParam({ name: 'id', type: Number, description: '定制服务请求ID' })
  @ApiResponse({ status: 200, description: '返回定制服务请求详情' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.findOneForTechnician(
      request.user.technicianId,
      id,
    );
  }

  @Patch(':id/quote')
  @ApiOperation({ summary: '报价定制服务请求' })
  @ApiParam({ name: 'id', type: Number, description: '定制服务请求ID' })
  @ApiBody({ type: QuoteCustomServiceRequestDto })
  @ApiResponse({ status: 200, description: '报价成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  quote(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QuoteCustomServiceRequestDto,
  ) {
    return this.customServiceRequestsService.quote(
      request.user.technicianId,
      id,
      dto,
    );
  }
}
