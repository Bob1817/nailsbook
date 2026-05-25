import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';

@ApiTags('美甲师-客户')
@ApiBearerAuth()
@Controller('technician/customers')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: '获取客户列表' })
  @ApiQuery({
    name: 'search',
    type: String,
    description: '搜索关键词',
    required: false,
  })
  @ApiQuery({
    name: 'tags',
    type: String,
    description: '标签筛选',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回客户列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    return this.customersService.findAll(
      1,
      100,
      request.user.technicianId,
      search,
      tags,
    );
  }

  @Get('tags')
  @ApiOperation({ summary: '获取客户标签列表' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  getTags(@Req() request: { user: { technicianId: number } }) {
    return this.customersService.getDistinctTags(request.user.technicianId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户详情' })
  @ApiParam({ name: 'id', type: String, description: '客户ID' })
  @ApiResponse({ status: 200, description: '返回客户详情' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '客户不存在' })
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    return this.customersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
  }

  @Patch(':id/tags')
  @ApiOperation({ summary: '更新客户标签' })
  @ApiParam({ name: 'id', type: String, description: '客户ID' })
  @ApiBody({
    schema: {
      properties: { tags: { type: 'string', description: '客户标签' } },
    },
  })
  @ApiResponse({ status: 200, description: '标签更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '客户不存在' })
  updateTags(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { tags: string },
  ) {
    return this.customersService.updateTags(
      parseInt(id, 10),
      request.user.technicianId,
      body.tags,
    );
  }
}
