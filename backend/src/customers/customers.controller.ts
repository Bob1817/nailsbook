import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@ApiTags('管理员-客户')
@ApiBearerAuth()
@Controller('admin/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customer.view')
  @ApiOperation({ summary: '获取客户列表' })
  @ApiQuery({
    name: 'page',
    type: String,
    description: '页码',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    description: '每页数量',
    required: false,
  })
  @ApiQuery({
    name: 'technicianId',
    type: String,
    description: '美甲师ID',
    required: false,
  })
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
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('technicianId') technicianId?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    return this.customersService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      technicianId ? parseInt(technicianId, 10) : undefined,
      search,
      tags,
    );
  }

  @Get(':id')
  @Permissions('customer.view')
  @ApiOperation({ summary: '获取客户详情' })
  @ApiParam({ name: 'id', type: String, description: '客户ID' })
  @ApiResponse({ status: 200, description: '返回客户详情' })
  @ApiResponse({ status: 404, description: '客户不存在' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(parseInt(id, 10));
  }
}
