import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DomainError } from '@probash/domain';
import { ZodError } from 'zod';

const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  INVARIANT_VIOLATED: 422,
  RATE_LIMITED: 429,
  NOT_AVAILABLE: 503,
  PROVIDER_ERROR: 502,
};

/**
 * Domain errors become structured API errors carrying an i18n key, so the Bangla
 * surface never has to display an English exception string (ADR 0002).
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof DomainError) {
      void reply.status(STATUS_BY_CODE[exception.code] ?? 400).send({
        error: {
          code: exception.code,
          message: exception.message,
          messageKey: exception.messageKey,
          details: exception.details,
        },
      });
      return;
    }

    if (exception instanceof ZodError) {
      void reply.status(400).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          messageKey: 'common.errorBody',
          details: {
            issues: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      void reply.status(status).send({
        error: { code: `HTTP_${status}`, message: exception.message },
      });
      return;
    }

    // Never leak internals to the client; the details go to the server log only.

    console.error('[api] unhandled error', exception);
    void reply.status(500).send({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        messageKey: 'common.errorBody',
      },
    });
  }
}
