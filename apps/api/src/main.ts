import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv, productIdentity } from '@probash/config';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const product = productIdentity(env);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter({
      // Request ids are correlation ids for tracing and audit (§42.16).
      genReqId: () => crypto.randomUUID(),
      bodyLimit: 8 * 1024 * 1024,
    }),
    { bufferLogs: false },
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({
    origin: [env.PUBLIC_BASE_URL],
    credentials: true,
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'accept-language'],
  });

  const openApi = new DocumentBuilder()
    .setTitle(`${product.nameEn} API`)
    .setDescription(
      'Safe migration and global opportunity platform API. Bangla-first, source-backed, ' +
        'milestone-controlled. Synthetic development data only.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, openApi));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[api] ${product.nameEn} listening on :${env.PORT} (storage=${env.STORAGE_DRIVER})`);
}

void bootstrap();
