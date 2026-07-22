import { Test, TestingModule } from '@nestjs/testing';
import { OffersController } from './offers.controller';
import { CreateOfferService } from './services/create-offer.service';
import { GetActiveOffersService } from './services/get-active-offers.service';
import { GetOffersByUserService } from './services/get-offers-by-user.service';
import { UpdateOfferStatusService } from './services/update-offer-status.service';
import { GeneratePresignedUrlService } from './services/generate-presigned-url.service';
import { ApplyToJobService } from './services/apply-to-job.service';
import { GetUserApplicationsService } from './services/get-user-applications.service';
import { GetOfferApplicationsService } from './services/get-offer-applications.service';
import { UpdateApplicationStatusService } from './services/update-application-status.service';

describe('OffersController', () => {
  let controller: OffersController;

  const mockCreateOfferService = { createOffer: jest.fn() };
  const mockGetActiveOffersService = { getActiveOffers: jest.fn() };
  const mockGetOffersByUserService = { getOffersByUser: jest.fn() };
  const mockUpdateOfferStatusService = { updateOfferStatus: jest.fn() };
  const mockGeneratePresignedUrlService = { generatePresignedUrl: jest.fn() };
  const mockApplyToJobService = { applyToJob: jest.fn() };
  const mockGetUserApplicationsService = { getUserApplications: jest.fn() };
  const mockGetOfferApplicationsService = { getOfferApplications: jest.fn() };
  const mockUpdateApplicationStatusService = {
    updateApplicationStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffersController],
      providers: [
        { provide: CreateOfferService, useValue: mockCreateOfferService },
        {
          provide: GetActiveOffersService,
          useValue: mockGetActiveOffersService,
        },
        {
          provide: GetOffersByUserService,
          useValue: mockGetOffersByUserService,
        },
        {
          provide: UpdateOfferStatusService,
          useValue: mockUpdateOfferStatusService,
        },
        {
          provide: GeneratePresignedUrlService,
          useValue: mockGeneratePresignedUrlService,
        },
        { provide: ApplyToJobService, useValue: mockApplyToJobService },
        {
          provide: GetUserApplicationsService,
          useValue: mockGetUserApplicationsService,
        },
        {
          provide: GetOfferApplicationsService,
          useValue: mockGetOfferApplicationsService,
        },
        {
          provide: UpdateApplicationStatusService,
          useValue: mockUpdateApplicationStatusService,
        },
      ],
    }).compile();

    controller = module.get<OffersController>(OffersController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});
