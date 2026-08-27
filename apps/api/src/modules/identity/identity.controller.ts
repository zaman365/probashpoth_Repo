import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
  type RequestOtpDto,
  type SessionDto,
  type UpdateProfileDto,
  type WorkerProfileDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('auth/request-otp')
  async requestOtp(@Body(zodBody(requestOtpSchema)) dto: RequestOtpDto) {
    return this.identity.requestOtp(dto);
  }

  @Post('auth/verify-otp')
  async verifyOtp(@Body(zodBody(verifyOtpSchema)) dto: unknown): Promise<SessionDto> {
    return this.identity.verifyOtp(dto as Parameters<IdentityService['verifyOtp']>[0]);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async me(@CurrentSubject() subject: Subject): Promise<WorkerProfileDto> {
    const profile = await this.identity.getProfile(subject.userId);
    return profile as unknown as WorkerProfileDto;
  }

  @Patch('me/profile')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async updateProfile(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(updateProfileSchema)) patch: UpdateProfileDto,
  ): Promise<WorkerProfileDto> {
    const profile = await this.identity.updateProfile(subject.userId, patch);
    return profile as unknown as WorkerProfileDto;
  }

  @Get('me/skill-passport')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async skillPassport(@CurrentSubject() subject: Subject) {
    return this.identity.skillPassport(subject.userId);
  }

  @Get('me/sessions')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async sessions(@CurrentSubject() subject: Subject) {
    return this.identity.listSessions(subject.userId);
  }

  @Delete('me/sessions/:sessionId')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async revokeSession(@CurrentSubject() subject: Subject, @Param('sessionId') sessionId: string) {
    return this.identity.revokeSession(subject.userId, sessionId);
  }
}
