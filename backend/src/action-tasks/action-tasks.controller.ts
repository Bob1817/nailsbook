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
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { ActionTasksService } from './action-tasks.service';
import { UpdateActionTaskDto } from './dto/update-action-task.dto';
@Controller('technician/action-tasks')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class ActionTasksController {
  constructor(private readonly service: ActionTasksService) {}
  @Get('today') today(@Req() r: { user: { technicianId: number } }) {
    return this.service.today(r.user.technicianId);
  }
  @Patch(':id') update(
    @Req() r: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActionTaskDto,
  ) {
    return this.service.update(r.user.technicianId, id, dto);
  }
}
