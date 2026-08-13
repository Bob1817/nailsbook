import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { BrandProfilesService } from './brand-profiles.service';
import { UpdateBrandProfileDto } from './dto/update-brand-profile.dto';

@ApiTags('美甲师-品牌主页')
@ApiBearerAuth()
@Controller('technician/brand-profile')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianBrandProfileController {
  constructor(private readonly service: BrandProfilesService) {}

  @Get()
  get(@Req() request: { user: { technicianId: number } }) {
    return this.service.getForOwner(request.user.technicianId);
  }

  @Put()
  update(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: UpdateBrandProfileDto,
  ) {
    return this.service.update(request.user.technicianId, dto);
  }
}

@ApiTags('公开-品牌主页')
@Controller('public/brand-profiles')
export class PublicBrandProfileController {
  constructor(private readonly service: BrandProfilesService) {}

  @Get(':technicianId')
  get(@Param('technicianId', ParseIntPipe) technicianId: number) {
    return this.service.getPublic(technicianId);
  }
}
