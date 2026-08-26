import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  caseActionSchema,
  createCaseSchema,
  type CaseActionDto,
  type CaseDetailDto,
  type CostPlanDto,
  type CreateCaseDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { authorize } from '@probash/auth';
import { DomainError } from '@probash/domain';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { CasesService } from './cases.service';
import { CostsService } from '../costs/costs.service';
import { AuditService } from '../../core/audit.service';
import { STORAGE, type Storage } from '../../storage/ports';
import { Inject } from '@nestjs/common';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('cases')
export class CasesController {
  constructor(
    private readonly cases: CasesService,
    private readonly costs: CostsService,
    private readonly audit: AuditService,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  @Get()
  async list(@CurrentSubject() subject: Subject): Promise<CaseDetailDto[]> {
    return this.cases.list(subject);
  }

  @Post()
  async create(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createCaseSchema)) dto: CreateCaseDto,
  ): Promise<CaseDetailDto> {
    return this.cases.create(subject, dto);
  }

  @Get(':id')
  async detail(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
  ): Promise<CaseDetailDto> {
    return this.cases.detail(subject, id);
  }

  @Get(':id/tasks')
  async tasks(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return (await this.cases.detail(subject, id)).tasks;
  }

  /** §28 — a family co-pilot with `view_cost` can read this; nobody else can. */
  @Get(':id/cost-plan')
  async costPlan(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
  ): Promise<CostPlanDto> {
    const caseRecord = await this.storage.cases.require(id);
    const decision = authorize(subject, 'read', {
      type: 'cost_plan',
      id,
      ownerUserId: caseRecord.ownerUserId,
      caseId: id,
      sensitivity: 'normal',
    });
    if (!decision.allowed) throw new DomainError('FORBIDDEN', `Not allowed: ${decision.reason}`);
    await this.audit.recordAccessIfRequired(decision.obligations, {
      actorUserId: subject.userId,
      action: 'cost_plan.read',
      resourceType: 'cost_plan',
      resourceId: id,
      caseId: id,
    });
    return this.costs.getPlan(id);
  }

  @Post(':id/actions')
  async act(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(caseActionSchema)) dto: CaseActionDto,
  ): Promise<CaseDetailDto> {
    return this.cases.act(subject, id, dto);
  }
}
