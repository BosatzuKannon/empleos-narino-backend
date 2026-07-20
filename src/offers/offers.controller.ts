import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { CreateOfferService } from './services/create-offer.service';
// import { GetActiveOffersService } from './services/get-active-offers.service';
import { GetOffersByUserService } from './services/get-offers-by-user.service';
// import { UpdateOfferStatusService } from './services/update-offer-status.service';
import { GeneratePresignedUrlService } from './services/generate-presigned-url.service';
// import { ApplyToJobService } from './services/apply-to-job.service';
// import { GetUserApplicationsService } from './services/get-user-applications.service';
// import { GetOfferApplicationsService } from './services/get-offer-applications.service';
// import { UpdateApplicationStatusService } from './services/update-application-status.service';

import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly createOfferService: CreateOfferService,
    // private readonly getActiveOffersService: GetActiveOffersService,
    private readonly getOffersByUserService: GetOffersByUserService,
    // private readonly updateOfferStatusService: UpdateOfferStatusService,
    private readonly generatePresignedUrlService: GeneratePresignedUrlService,
    // private readonly applyToJobService: ApplyToJobService,
    // private readonly getUserApplicationsService: GetUserApplicationsService,
    // private readonly getOfferApplicationsService: GetOfferApplicationsService,
    // private readonly updateApplicationStatusService: UpdateApplicationStatusService,
  ) {}

  @Post('createOffer/:cognito_id')
  async createOffer(
    @Param('cognito_id') cognitoId: string,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.createOfferService.createOffer(cognitoId, createOfferDto);
  }

  @Get('getActiveOffers')
  async getActiveOffers() {
    // return this.getActiveOffersService.getActiveOffers();
  }

  @Get('getOffersByUser/:cognito_id')
  async getOffersByUser(@Param('cognito_id') cognitoId: string) {
    return this.getOffersByUserService.getOffersByUser(cognitoId);
  }

  @Put('updateOfferStatus/:offer_id/:updated_by')
  async updateOfferStatus(
    @Param('offer_id') offerId: string,
    @Param('updated_by') updatedBy: string,
    @Body() updateOfferStatusDto: UpdateOfferStatusDto,
  ) {
    // return this.updateOfferStatusService.updateOfferStatus(
    //   offerId,
    //   updatedBy,
    //   updateOfferStatusDto,
    // );
  }

  @Post('generatePresignedUrl')
  async generatePresignedUrl(@Body() dto: GeneratePresignedUrlDto) {
    return this.generatePresignedUrlService.generatePresignedUrl(dto);
  }

  @Post('applyToJob/:cognito_id')
  async applyToJob(
    @Param('cognito_id') cognitoId: string,
    @Body() applyToJobDto: ApplyToJobDto,
  ) {
    // return this.applyToJobService.applyToJob(cognitoId, applyToJobDto);
  }

  @Get('getUserApplications/:cognito_id')
  async getUserApplications(@Param('cognito_id') cognitoId: string) {
    // return this.getUserApplicationsService.getUserApplications(cognitoId);
  }

  @Get('getOfferApplications/:offer_id')
  async getOfferApplications(@Param('offer_id') offerId: string) {
    // return this.getOfferApplicationsService.getOfferApplications(offerId);
  }

  @Put('updateApplicationStatus/:cognito_id/:offer_id')
  async updateApplicationStatus(
    @Param('cognito_id') cognitoId: string, // ID del candidato
    @Param('offer_id') offerId: string,
    @Body() updateApplicationStatusDto: UpdateApplicationStatusDto,
  ) {
    // return this.updateApplicationStatusService.updateApplicationStatus(
    //   cognitoId,
    //   offerId,
    //   updateApplicationStatusDto,
    // );
  }
}
