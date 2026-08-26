import { Injectable } from '@nestjs/common';

/** Injecting the clock keeps time-dependent behaviour testable (§66). */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return this.now().toISOString();
  }
}
