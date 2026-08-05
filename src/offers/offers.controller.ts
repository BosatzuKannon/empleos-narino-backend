import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreateOfferService } from './services/create-offer.service';
import { GetActiveOffersService } from './services/get-active-offers.service';
import { GetOffersByUserService } from './services/get-offers-by-user.service';
import { UpdateOfferStatusService } from './services/update-offer-status.service';
import { GeneratePresignedUrlService } from './services/generate-presigned-url.service';
import { ApplyToJobService } from './services/apply-to-job.service';
import { GetUserApplicationsService } from './services/get-user-applications.service';
import { GetOfferApplicationsService } from './services/get-offer-applications.service';
import { UpdateApplicationStatusService } from './services/update-application-status.service';

import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(
    private readonly createOfferService: CreateOfferService,
    private readonly getActiveOffersService: GetActiveOffersService,
    private readonly getOffersByUserService: GetOffersByUserService,
    private readonly updateOfferStatusService: UpdateOfferStatusService,
    private readonly generatePresignedUrlService: GeneratePresignedUrlService,
    private readonly applyToJobService: ApplyToJobService,
    private readonly getUserApplicationsService: GetUserApplicationsService,
    private readonly getOfferApplicationsService: GetOfferApplicationsService,
    private readonly updateApplicationStatusService: UpdateApplicationStatusService,
  ) {}

  @Post('createOffer/:cognito_id')
  async createOffer(
    @Param('cognito_id') cognitoId: string,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.createOfferService.createOffer(cognitoId, createOfferDto);
  }

  @Public()
  @Get('getActiveOffers')
  async getActiveOffers() {
    return this.getActiveOffersService.getActiveOffers();
  }

  @Get('getOffersByUser/:cognito_id')
  async getOffersByUser(@Req() req: any) {
    return this.getOffersByUserService.getOffersByUser(req.user.userId);
  }

  @Put('updateOfferStatus/:offer_id/:updated_by')
  async updateOfferStatus(
    @Param('offer_id') offerId: string,
    @Param('updated_by') updatedBy: string,
    @Body() updateOfferStatusDto: UpdateOfferStatusDto,
  ) {
    return this.updateOfferStatusService.updateOfferStatus(
      offerId,
      updatedBy,
      updateOfferStatusDto,
    );
  }

  @Post('generatePresignedUrl')
  async generatePresignedUrl(@Body() dto: GeneratePresignedUrlDto) {
    return this.generatePresignedUrlService.generatePresignedUrl(dto);
  }

  @Post('applyToJob/:cognito_id')
  async applyToJob(@Req() req: any, @Body() applyToJobDto: ApplyToJobDto) {
    return this.applyToJobService.applyToJob(req.user.userId, applyToJobDto);
  }

  @Get('getUserApplications/:cognito_id')
  async getUserApplications(@Req() req: any) {
    return this.getUserApplicationsService.getUserApplications(req.user.userId);
  }

  @Get('getOfferApplications/:offer_id')
  async getOfferApplications(
    @Req() req: any,
    @Param('offer_id') offerId: string,
  ) {
    return this.getOfferApplicationsService.getOfferApplications(
      req.user.userId,
      offerId,
    );
  }

  @Put('updateApplicationStatus/:application_id')
  async updateApplicationStatus(
    @Req() req: any,
    @Param('application_id') applicationId: string,
    @Body() updateApplicationStatusDto: UpdateApplicationStatusDto,
  ) {
    return this.updateApplicationStatusService.updateApplicationStatus(
      req.user.userId,
      applicationId,
      updateApplicationStatusDto,
    );
  }
}
