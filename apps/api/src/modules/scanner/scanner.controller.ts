import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { scanOfferSchema, type ScanOfferDto, type ScanResultDto } from '@probash/contracts';
import { zodBody } from '../../common/zod.pipe';
import { ScannerService } from './scanner.service';

@ApiTags('scanner')
@Controller('verify')
export class ScannerController {
  constructor(private readonly scanner: ScannerService) {}

  /**
   * Deliberately unauthenticated (§14.1): the person most at risk is often the one
   * without an account, holding a message from a broker.
   */
  @Post('offer')
  async scan(@Body(zodBody(scanOfferSchema)) dto: ScanOfferDto): Promise<ScanResultDto> {
    return this.scanner.scan(dto);
  }
}
