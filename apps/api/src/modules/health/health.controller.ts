import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { featureFlags, productIdentity, type Env } from '@probash/config';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  @Get()
  async health(): Promise<Record<string, unknown>> {
    return {
      status: 'ok',
      product: productIdentity(this.env),
      appEnv: this.env.APP_ENV,
      defaultLocale: this.env.DEFAULT_LOCALE,
      storageDriver: this.env.STORAGE_DRIVER,
      featureFlags: featureFlags(this.env),
      seed: {
        countries: await this.storage.countries.count(),
        publishedRoutes: await this.storage.routeVersions.count(
          (r) => r.publicationStatus === 'published',
        ),
        jobs: await this.storage.jobs.count(),
      },
    };
  }
}
