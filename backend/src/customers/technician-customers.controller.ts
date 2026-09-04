import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
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
import { TouristGuard } from '../technician-auth/tourist.guard';
import { CreateCustomerFollowUpDto } from './dto/create-customer-follow-up.dto';

@ApiTags('美甲师-客户')
@ApiBearerAuth()
@Controller('technician/customers')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
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

  @Get('tag-templates')
  @ApiOperation({ summary: '获取客户标签模板' })
  getTagTemplates(
    @Req() request: { user: { technicianId: number } },
    @Query('type') type?: 'customer' | 'work',
  ) {
    return this.customersService.getTagTemplates(
      request.user.technicianId,
      type === 'work' ? 'work' : 'customer',
    );
  }

  @Post('tag-templates')
  @ApiOperation({ summary: '新增客户标签模板' })
  createTagTemplate(
    @Req() request: { user: { technicianId: number } },
    @Body() body: { name: string; type?: 'customer' | 'work' },
  ) {
    return this.customersService.createTagTemplate(
      request.user.technicianId,
      body.name,
      body.type === 'work' ? 'work' : 'customer',
    );
  }

  @Delete('tag-templates/:templateId')
  @ApiOperation({ summary: '删除客户标签模板' })
  deleteTagTemplate(
    @Req() request: { user: { technicianId: number } },
    @Param('templateId') templateId: string,
  ) {
    return this.customersService.deleteTagTemplate(
      request.user.technicianId,
      templateId,
    );
  }

  @Get('follow-ups/today')
  @ApiOperation({ summary: '获取今日待跟进客户' })
  getTodayFollowUps(@Req() request: { user: { technicianId: number } }) {
    return this.customersService.getTodayFollowUps(request.user.technicianId);
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

  @Post(':id/follow-ups')
  @ApiOperation({ summary: '创建客户跟进记录' })
  createFollowUp(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: CreateCustomerFollowUpDto,
  ) {
    return this.customersService.createFollowUp(
      parseInt(id, 10),
      request.user.technicianId,
      body.content,
      body.plannedAt,
    );
  }

  @Patch(':id/follow-ups/:followUpId/complete')
  @ApiOperation({ summary: '完成客户跟进记录' })
  completeFollowUp(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Param('followUpId') followUpId: string,
  ) {
    return this.customersService.completeFollowUp(
      parseInt(id, 10),
      parseInt(followUpId, 10),
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

  @Patch(':id/name')
  @ApiOperation({ summary: '更新客户备注名（仅美甲师可见）' })
  @ApiParam({ name: 'id', type: String, description: '客户ID' })
  @ApiBody({
    schema: {
      properties: { name: { type: 'string', description: '客户备注名' } },
    },
  })
  @ApiResponse({ status: 200, description: '备注名更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '客户不存在' })
  updateName(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.customersService.updateName(
      parseInt(id, 10),
      request.user.technicianId,
      body.name,
    );
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: '归档长期未互动客户' })
  archive(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    return this.customersService.archiveCustomer(
      parseInt(id, 10),
      request.user.technicianId,
    );
  }
}
