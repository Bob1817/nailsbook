import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArtistApplicationsService } from './artist-applications.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('artist-applications')
export class ArtistApplicationsController {
  constructor(private readonly service: ArtistApplicationsService) {}

  @Post()
  create(@Body() dto: CreateArtistApplicationDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { userId: number } },
  ) {
    return this.service.approve(id, request.user.userId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { userId: number } },
  ) {
    return this.service.reject(id, request.user.userId);
  }
}
