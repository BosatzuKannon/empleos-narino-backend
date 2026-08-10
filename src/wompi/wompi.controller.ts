import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { WompiService } from './wompi.service';
import { GenerateCheckoutDto } from './dto/generate-checkout.dto';

@Controller('wompi')
export class WompiController {
  constructor(private readonly wompiService: WompiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-checkout')
  generateCheckout(@Req() req: any, @Body() dto: GenerateCheckoutDto) {
    return this.wompiService.generateCheckout(req.user.userId, dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  handleWebhook(
    @Body() body: any,
    @Headers('x-event-checksum') checksum?: string,
  ) {
    return this.wompiService.handleWebhook(body, checksum);
  }
}
