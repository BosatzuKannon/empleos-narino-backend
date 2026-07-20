import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { CreateOfferService } from './services/create-offer.service';
import { GeneratePresignedUrlService } from './services/generate-presigned-url.service';
import { GetOffersByUserService } from './services/get-offers-by-user.service';
// import { GetActiveOffersService } from './services/get-active-offers.service';
// import { ApplyToJobService } from './services/apply-to-job.service';
// import { GetUserApplicationsService } from './services/get-user-applications.service';
// import { GetOfferApplicationsService } from './services/get-offer-applications.service';
// import { UpdateApplicationStatusService } from './services/update-application-status.service';
// import { UpdateOfferStatusService } from './services/update-offer-status.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [OffersController],
  providers: [
    PrismaService,
    CreateOfferService,
    GeneratePresignedUrlService,
    GetOffersByUserService,
    // GetActiveOffersService,
    // ApplyToJobService,
    // GetUserApplicationsService,
    // GetOfferApplicationsService,
    // UpdateApplicationStatusService,
    // UpdateOfferStatusService,
  ],
})
export class OffersModule {}
