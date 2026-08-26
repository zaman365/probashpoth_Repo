import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createDelegationSchema,
  type CreateDelegationDto,
  type DelegationDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { DelegationsService } from './delegations.service';

@ApiTags('delegations')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegations: DelegationsService) {}

  @Get()
  async list(@CurrentSubject() subject: Subject): Promise<DelegationDto[]> {
    return this.delegations.list(subject.userId);
  }

  @Post()
  async invite(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createDelegationSchema)) dto: CreateDelegationDto,
  ): Promise<DelegationDto> {
    return this.delegations.invite(subject.userId, dto);
  }

  @Delete(':id')
  async revoke(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
  ): Promise<DelegationDto> {
    return this.delegations.revoke(subject.userId, id);
  }
}
