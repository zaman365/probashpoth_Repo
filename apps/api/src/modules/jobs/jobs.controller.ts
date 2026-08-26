import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { verifyQrSchema, type VerifyQrDto } from '@probash/contracts';
import { zodBody } from '../../common/zod.pipe';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get('jobs')
  async list(
    @Query('country') country?: string,
    @Query('occupation') occupation?: string,
    @Query('employerPays') employerPays?: string,
  ) {
    return this.jobs.list({
      country: country?.toUpperCase(),
      occupationKey: occupation,
      employerPaysOnly: employerPays === 'true',
    });
  }

  @Get('jobs/:id')
  async detail(@Param('id') id: string) {
    return this.jobs.detail(id);
  }

  /** Public, unauthenticated: anyone handed a job id can check it (§14.1, §21). */
  @Get('verify/job/:publicId')
  async publicVerify(@Param('publicId') publicId: string) {
    return this.jobs.publicVerify(publicId);
  }

  @Post('verify/qr')
  async verifyQr(@Body(zodBody(verifyQrSchema)) body: VerifyQrDto) {
    return this.jobs.verifyQrToken(body.token);
  }
}
