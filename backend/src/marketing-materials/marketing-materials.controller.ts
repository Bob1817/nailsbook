import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import {
  CreateMarketingMaterialDto,
  ExportMarketingMaterialDto,
  UpdateMarketingMaterialDto,
} from './dto/marketing-material.dto';
import { MarketingMaterialsService } from './marketing-materials.service';

@Controller('technician/marketing-materials')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class MarketingMaterialsController {
  constructor(private readonly materials: MarketingMaterialsService) {}

  @Get()
  list(@Req() request: { user: { technicianId: number } }) {
    return this.materials.list(request.user.technicianId);
  }

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: CreateMarketingMaterialDto,
  ) {
    return this.materials.create(request.user.technicianId, body);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMarketingMaterialDto,
  ) {
    return this.materials.update(request.user.technicianId, id, body);
  }

  @Post(':id/preview')
  preview(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.materials.preview(request.user.technicianId, id);
  }

  @Post(':id/export')
  export(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ExportMarketingMaterialDto,
  ) {
    return this.materials.export(
      request.user.technicianId,
      id,
      body.idempotencyKey,
    );
  }
}
