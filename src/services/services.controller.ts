import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreateServiceService } from './services/create-service.service';
import { GetActiveServicesService } from './services/get-active-services.service';
import { GetServicesByUserService } from './services/get-services-by-user.service';
import { GetServiceByIdService } from './services/get-service-by-id.service';
import { IncrementServiceViewsService } from './services/increment-service-views.service';
import { UpdateServiceStatusService } from './services/update-service-status.service';
import { DeleteServiceService } from './services/delete-service.service';
import { GetServiceCategoriesService } from './services/get-service-categories.service';
import { CreateServiceCategoryService } from './services/create-service-category.service';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(
    private readonly createServiceService: CreateServiceService,
    private readonly getActiveServicesService: GetActiveServicesService,
    private readonly getServicesByUserService: GetServicesByUserService,
    private readonly getServiceByIdService: GetServiceByIdService,
    private readonly incrementServiceViewsService: IncrementServiceViewsService,
    private readonly updateServiceStatusService: UpdateServiceStatusService,
    private readonly deleteServiceService: DeleteServiceService,
    private readonly getServiceCategoriesService: GetServiceCategoriesService,
    private readonly createServiceCategoryService: CreateServiceCategoryService,
  ) {}

  @Public()
  @Get('getActiveServices')
  async getActiveServices() {
    return this.getActiveServicesService.getActiveServices();
  }

  @Public()
  @Get('getServiceById/:service_id')
  async getServiceById(@Param('service_id') serviceId: string) {
    return this.getServiceByIdService.getServiceById(serviceId);
  }

  @Public()
  @Patch('incrementViews/:service_id')
  async incrementViews(@Param('service_id') serviceId: string) {
    return this.incrementServiceViewsService.incrementViews(serviceId);
  }

  @Public()
  @Patch(':service_id/view')
  async incrementServiceViews(@Param('service_id') serviceId: string) {
    return this.incrementServiceViewsService.incrementViews(serviceId);
  }

  @Public()
  @Get('categories/getAll')
  async getServiceCategories() {
    return this.getServiceCategoriesService.getServiceCategories();
  }

  @Post('createService')
  async createService(
    @Req() req: any,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.createServiceService.createService(
      req.user.userId,
      createServiceDto,
    );
  }

  @Get('getServicesByUser')
  async getServicesByUser(@Req() req: any) {
    return this.getServicesByUserService.getServicesByUser(req.user.userId);
  }

  @Patch('updateServiceStatus/:service_id')
  async updateServiceStatus(
    @Req() req: any,
    @Param('service_id') serviceId: string,
    @Body() updateServiceStatusDto: UpdateServiceStatusDto,
  ) {
    return this.updateServiceStatusService.updateServiceStatus(
      req.user.userId,
      serviceId,
      updateServiceStatusDto,
    );
  }

  @Delete('deleteService/:service_id')
  async deleteService(@Req() req: any, @Param('service_id') serviceId: string) {
    return this.deleteServiceService.deleteService(req.user.userId, serviceId);
  }

  @Post('categories/create')
  async createServiceCategory(
    @Body() createServiceCategoryDto: CreateServiceCategoryDto,
  ) {
    return this.createServiceCategoryService.createServiceCategory(
      createServiceCategoryDto,
    );
  }
}
