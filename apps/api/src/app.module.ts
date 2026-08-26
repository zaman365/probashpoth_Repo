import { Module, type DynamicModule } from '@nestjs/common';
import type { Env } from '@probash/config';
import { CoreModule } from './core/core.module';
import type { Storage } from './storage/ports';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { EligibilityModule } from './modules/eligibility/eligibility.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CasesModule } from './modules/cases/cases.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { DelegationsModule } from './modules/delegations/delegations.module';

/**
 * Bounded contexts as Nest modules (§44, ADR 0001). Modules talk through services
 * and events, never by reaching into each other's storage collections.
 */
@Module({})
export class AppModule {
  static register(env: Env, storage?: Storage): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.register(env, storage),
        HealthModule,
        IdentityModule,
        DelegationsModule,
        CatalogueModule,
        EligibilityModule,
        JobsModule,
        CasesModule,
        DocumentsModule,
        PaymentsModule,
        ScannerModule,
      ],
    };
  }
}
