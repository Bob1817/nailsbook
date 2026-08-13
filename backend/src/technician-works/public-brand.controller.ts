import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicBrandService } from './public-brand.service';

type PublicQuery = {
  page?: string;
  pageSize?: string;
  imageSize?: string;
  source?: string;
  campaign?: string;
  content?: string;
};

@ApiTags('公开-品牌主页')
@Controller('public/brands')
@Throttle({ default: { ttl: 60_000, limit: 30 } })
export class PublicBrandController {
  constructor(private readonly service: PublicBrandService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: '获取公开品牌资料' })
  profile(@Param('id', ParseIntPipe) id: number, @Query() query: PublicQuery) {
    return this.service.profile(id, query);
  }

  @Get(':id/services')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: '获取公开服务和价格' })
  services(@Param('id', ParseIntPipe) id: number, @Query() query: PublicQuery) {
    return this.service.services(id, query);
  }

  @Get(':id/works')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: '获取公开作品列表' })
  works(@Param('id', ParseIntPipe) id: number, @Query() query: PublicQuery) {
    return this.service.works(id, query);
  }

  @Get(':id/works/:workId')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: '获取公开作品详情' })
  workDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @Query() query: PublicQuery,
  ) {
    return this.service.workDetail(id, workId, query);
  }

  @Get(':id/availability')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  @ApiOperation({ summary: '获取可预约情况摘要' })
  availability(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PublicQuery,
  ) {
    return this.service.availability(id, query);
  }
}
