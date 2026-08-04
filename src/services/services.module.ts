import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { CreateServiceService } from './services/create-service.service';
import { GetActiveServicesService } from './services/get-active-services.service';
import { GetServicesByUserService } from './services/get-services-by-user.service';
import { GetServiceByIdService } from './services/get-service-by-id.service';
import { IncrementServiceViewsService } from './services/increment-service-views.service';
import { UpdateServiceStatusService } from './services/update-service-status.service';
import { DeleteServiceService } from './services/delete-service.service';
import { GetServiceCategoriesService } from './services/get-service-categories.service';
import { CreateServiceCategoryService } from './services/create-service-category.service';
import { PrismaService } from '../prisma.service';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [PushNotificationsModule],
  controllers: [ServicesController],
  providers: [
    PrismaService,
    CreateServiceService,
    GetActiveServicesService,
    GetServicesByUserService,
    GetServiceByIdService,
    IncrementServiceViewsService,
    UpdateServiceStatusService,
    DeleteServiceService,
    GetServiceCategoriesService,
    CreateServiceCategoryService,
  ],
})
export class ServicesModule {}
