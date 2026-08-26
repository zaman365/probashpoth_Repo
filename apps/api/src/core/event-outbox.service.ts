import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@probash/domain';
import { defineEvent, type EventName } from '@probash/analytics';
import { STORAGE, type Storage } from '../storage/ports';
import { ClockService } from './clock.service';

/**
 * §47 — transactional outbox. Events are written with the business change and
 * published asynchronously; the privacy guard in @probash/analytics runs first, so
 * a payload carrying personal data fails here rather than leaking downstream.
 */
@Injectable()
export class EventOutboxService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
  ) {}

  async publish(
    name: EventName,
    attributes: Record<string, string | number | boolean> = {},
    refs: {
      actorRef?: string;
      caseRef?: string;
      organizationRef?: string;
      countryCode?: string;
      routeRef?: string;
      locale?: 'bn-BD' | 'en';
    } = {},
  ): Promise<void> {
    const event = defineEvent({
      eventId: uuidv7(),
      name,
      occurredAt: this.clock.nowIso(),
      surface: 'api',
      attributes,
      ...refs,
    });
    await this.storage.outbox.put({
      id: event.eventId,
      eventName: event.name,
      payload: event as unknown as Record<string, unknown>,
      createdAt: event.occurredAt,
    });
  }
}
