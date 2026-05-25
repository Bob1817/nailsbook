import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { FeatureFlagsService } from './feature-flags.service';

@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get()
  @Permissions('feature_flag:view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('feature_flag:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'feature_flag', action: 'update' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { enabled?: boolean; enabledPlans?: string; description?: string },
  ) {
    return this.service.update(id, body);
  }

  @Patch(':id/toggle')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'feature_flag', action: 'toggle' })
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggle(id);
  }
}
