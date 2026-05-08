import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customer.view')
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
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(parseInt(id, 10));
  }
}
