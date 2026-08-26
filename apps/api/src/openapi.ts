/**
 * `pnpm --filter @probash/api openapi` — writes docs/api/openapi.json from the
 * running module graph (§46). The spec is generated from source, never hand-edited,
 * and it is regenerated before merging an epic (§87).
 */
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv, productIdentity } from '@probash/config';
import { AppModule } from './app.module';
import { findDataDir } from './storage/seed/load-seed';

async function main(): Promise<void> {
  const env = loadEnv({ ...process.env, APP_ENV: 'development', STORAGE_DRIVER: 'memory' });
  const product = productIdentity(env);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter(),
    { logger: false },
  );
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle(`${product.nameEn} API`)
    .setDescription(
      [
        'Safe migration and global opportunity platform API.',
        '',
        'Guarantees this API is built to keep:',
        '- eligibility answers are deterministic and source-backed, and "unknown" is a real answer;',
        '- a verification level is derived from checked facts, never asserted;',
        '- money moves only on provider-confirmed webhooks, and settles only against verified milestones;',
        '- synthetic development records are labelled and are not served outside development.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('identity', 'Phone OTP onboarding, profile and Skill Passport (§17, §18)')
    .addTag('catalogue', 'Countries, routes, occupations and their official sources (§7, §9, §38)')
    .addTag('eligibility', 'Deterministic eligibility with a decision trace (§19, §48)')
    .addTag('jobs', 'Verified jobs and public verification (§21)')
    .addTag('scanner', 'Offer / visa / document scanner (§23)')
    .addTag('cases', 'Application workflow, tasks, milestones and cost plan (§24, §33)')
    .addTag('payments', 'Milestone-controlled settlement and the double-entry ledger (§25)')
    .addTag('documents', 'Document wallet and consented sharing (§29)')
    .addTag('delegations', 'Family co-pilot (§28)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const target = join(findDataDir(), '..', 'docs', 'api', 'openapi.json');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  // eslint-disable-next-line no-console
  console.log(`[openapi] wrote ${target} (${Object.keys(document.paths).length} paths)`);
}

void main();
