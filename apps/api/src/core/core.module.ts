import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { Env } from '@probash/config';
import { InvariantViolatedError } from '@probash/domain';
import { STORAGE, type Storage } from '../storage/ports';
import { MemoryStorage } from '../storage/memory/memory-storage';
import { PostgresStorage } from '../storage/postgres/postgres-storage';
import { ENV } from './tokens';
import { AuditService } from './audit.service';
import { EventOutboxService } from './event-outbox.service';
import { ClockService } from './clock.service';

async function createStorage(env: Env): Promise<Storage> {
  if (env.STORAGE_DRIVER === 'memory') return new MemoryStorage();
  if (env.STORAGE_DRIVER === 'postgres' && env.DATABASE_URL && env.FIELD_ENCRYPTION_KEY) {
    return PostgresStorage.connect(env.DATABASE_URL, env.FIELD_ENCRYPTION_KEY);
  }
  throw new InvariantViolatedError(
    'PostgreSQL storage requires valid DATABASE_URL and FIELD_ENCRYPTION_KEY values',
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
        storage
          ? { provide: STORAGE, useValue: storage }
          : { provide: STORAGE, useFactory: () => createStorage(env) },
        AuditService,
        EventOutboxService,
        ClockService,
      ],
      exports: [ENV, STORAGE, AuditService, EventOutboxService, ClockService],
    };
  }
}
