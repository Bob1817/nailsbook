import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TechnicianServicesService } from './technician-services.service';

@ApiTags('美甲师-服务')
@ApiBearerAuth()
@Controller('technician/services')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianServicesController {
  constructor(
    private readonly technicianServicesService: TechnicianServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取服务列表' })
  @ApiResponse({ status: 200, description: '返回服务列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  list(@Req() request: { user: { technicianId: number } }) {
    return this.technicianServicesService.list(request.user.technicianId);
  }

  @Post()
  @ApiOperation({ summary: '创建服务' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', description: '服务名称' },
        description: { type: 'string', description: '服务描述' },
        category: {
          type: 'string',
          enum: [
            'basic_care',
            'color_style',
            'extension_reinforcement',
            'removal',
          ],
          description: '服务分类',
        },
      },
      required: ['name', 'category'],
    },
  })
  @ApiResponse({ status: 200, description: '服务创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  create(
    @Req() request: { user: { technicianId: number } },
    @Body()
    body: {
      name: string;
      description?: string;
      category:
        | 'basic_care'
        | 'color_style'
        | 'extension_reinforcement'
        | 'removal';
    },
  ) {
    return this.technicianServicesService.create(
      request.user.technicianId,
      body,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新服务' })
  @ApiParam({ name: 'id', type: String, description: '服务ID' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', description: '服务名称' },
        description: { type: 'string', description: '服务描述' },
        category: {
          type: 'string',
          enum: [
            'basic_care',
            'color_style',
            'extension_reinforcement',
            'removal',
          ],
          description: '服务分类',
        },
        isActive: { type: 'boolean', description: '是否启用' },
        sortOrder: { type: 'number', description: '排序顺序' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '服务更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务不存在' })
  update(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      category?:
        | 'basic_care'
        | 'color_style'
        | 'extension_reinforcement'
        | 'removal';
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.technicianServicesService.update(
      request.user.technicianId,
      id,
      body,
    );
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '切换服务状态' })
  @ApiParam({ name: 'id', type: String, description: '服务ID' })
  @ApiResponse({ status: 200, description: '状态切换成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务不存在' })
  toggle(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    return this.technicianServicesService.toggleStatus(
      request.user.technicianId,
      id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除服务' })
  @ApiParam({ name: 'id', type: String, description: '服务ID' })
  @ApiResponse({ status: 200, description: '服务删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务不存在' })
  remove(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    return this.technicianServicesService.delete(request.user.technicianId, id);
  }
}
