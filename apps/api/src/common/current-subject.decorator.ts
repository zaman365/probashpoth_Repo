import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import type { RequestWithSubject } from './session.guard';

export const CurrentSubject = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Subject => {
    const request = context.switchToHttp().getRequest<RequestWithSubject>();
    if (!request.probashSubject) {
      throw new Error('CurrentSubject used on a route without SessionGuard');
    }
    return request.probashSubject;
  },
);

export const RequestLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): 'bn-BD' | 'en' => {
    const request = context.switchToHttp().getRequest<RequestWithSubject>();
    const header = request.headers['accept-language'];
    const value = Array.isArray(header) ? header[0] : header;
    return value?.toLowerCase().startsWith('en') ? 'en' : 'bn-BD';
  },
);
