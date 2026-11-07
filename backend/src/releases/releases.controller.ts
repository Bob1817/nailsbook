import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { ReleasesService } from './releases.service';
import { ReleaseQueryDto, SaveReleaseDto } from './releases.dto';
@Controller('admin/releases')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminReleasesController {
  constructor(private readonly service:ReleasesService) {}
  @Get() @Permissions('feature_flag:view') list() { return this.service.list(); }
  @Post() @Permissions('feature_flag:update') @OperationLog({module:'release',action:'create'})
  create(@Body() dto:SaveReleaseDto) { return this.service.save(dto); }
  @Put(':id') @Permissions('feature_flag:update') @OperationLog({module:'release',action:'update'})
  update(@Param('id',ParseIntPipe) id:number,@Body() dto:SaveReleaseDto) { return this.service.save(dto,id); }
}
@Controller('public/releases')
export class PublicReleasesController {
  constructor(private readonly service:ReleasesService) {}
  @Get() list(@Query() query:ReleaseQueryDto) { return this.service.publicList(query.role,query.version); }
}
