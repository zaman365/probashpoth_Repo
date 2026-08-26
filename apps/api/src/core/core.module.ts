import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { Env } from '@probash/config';
import { InvariantViolatedError } from '@probash/domain';
import { STORAGE, type Storage } from '../storage/ports';
import { MemoryStorage } from '../storage/memory/memory-storage';
import { ENV } from './tokens';
import { AuditService } from './audit.service';
import { EventOutboxService } from './event-outbox.service';
import { ClockService } from './clock.service';

function createStorage(env: Env): Storage {
  if (env.STORAGE_DRIVER === 'memory') return new MemoryStorage();
  // ADR 0001: the flag fails loudly instead of silently degrading.
  throw new InvariantViolatedError(
    'STORAGE_DRIVER=postgres is not wired yet — see apps/api/src/storage/postgres/README.md',
    { driver: env.STORAGE_DRIVER },
  );
}

@Global()
@Module({})
export class CoreModule {
  static register(env: Env, storage?: Storage): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: ENV, useValue: env },
        { provide: STORAGE, useValue: storage ?? createStorage(env) },
        AuditService,
        EventOutboxService,
        ClockService,
      ],
      exports: [ENV, STORAGE, AuditService, EventOutboxService, ClockService],
    };
  }
}
