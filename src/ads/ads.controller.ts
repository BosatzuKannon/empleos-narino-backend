import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../common/guards/jwt-auth.guard';
import { AdsService } from './ads.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';

@UseGuards(JwtAuthGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Public()
  @Get('active')
  async getActiveAds() {
    return this.adsService.findActive();
  }

  @Get()
  async getAllAds(@Req() req: AuthenticatedRequest) {
    return this.adsService.findAll(req.user.email);
  }

  @Post()
  async createAd(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAdvertisementDto,
  ) {
    return this.adsService.create(req.user.email, dto);
  }

  @Put(':id')
  async updateAd(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdvertisementDto,
  ) {
    return this.adsService.update(req.user.email, id, dto);
  }

  @Delete(':id')
  async deleteAd(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.adsService.remove(req.user.email, id);
  }
}
