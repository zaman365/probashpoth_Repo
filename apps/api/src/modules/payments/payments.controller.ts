import { Body, Controller, Get, Headers, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createPaymentIntentSchema,
  paymentWebhookSchema,
  type CreatePaymentIntentDto,
  type LedgerViewDto,
  type PaymentIntentDto,
  type PaymentWebhookDto,
  type ReceiptDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { DomainError } from '@probash/domain';
import type { Env } from '@probash/config';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { ENV } from '../../core/tokens';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('cases/:caseId/payment-intents')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async createIntent(
    @CurrentSubject() subject: Subject,
    @Param('caseId') caseId: string,
    @Body(zodBody(createPaymentIntentSchema)) dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentDto> {
    return this.payments.createIntent(subject, caseId, dto);
  }

  @Get('cases/:caseId/payment-intents')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async listIntents(@Param('caseId') caseId: string): Promise<PaymentIntentDto[]> {
    return this.payments.listIntents(caseId);
  }

  @Get('payments/:id/receipt')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async receipt(@Param('id') id: string): Promise<ReceiptDto> {
    return this.payments.receipt(id);
  }

  @Post('cases/:caseId/payment-intents/:id/settle')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async settle(
    @CurrentSubject() subject: Subject,
    @Param('caseId') caseId: string,
    @Param('id') id: string,
  ) {
    return this.payments.releaseSettlement(subject, caseId, id);
  }

  @Get('cases/:caseId/ledger')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async ledger(@Param('caseId') caseId: string): Promise<LedgerViewDto> {
    return this.payments.ledgerView(caseId);
  }

  /**
   * Provider webhook. Signature-verified and idempotent; unauthenticated by design
   * because the provider, not a user session, is the caller (§42.12).
   */
  @Post('webhooks/payments/:provider')
  async webhook(
    @Param('provider') provider: string,
    @Headers('x-probash-signature') signature: string,
    @Body(zodBody(paymentWebhookSchema)) payload: PaymentWebhookDto,
  ) {
    if (provider !== this.payments.providerName) {
      throw new DomainError('NOT_FOUND', `Unknown payment provider: ${provider}`);
    }
    return this.payments.handleWebhook(payload, signature);
  }

  /**
   * Development helper: signs a webhook body so the sandbox flow can be exercised
   * without a provider. Refuses to exist outside development.
   */
  @Post('webhooks/payments/mock/sign')
  async signMock(@Body(zodBody(paymentWebhookSchema)) payload: PaymentWebhookDto) {
    if (this.env.APP_ENV !== 'development' && this.env.APP_ENV !== 'test') {
      throw new DomainError('NOT_AVAILABLE', 'Webhook signing helper is development-only');
    }
    return { signature: this.payments.signWebhookForDevelopment(payload) };
  }
}
