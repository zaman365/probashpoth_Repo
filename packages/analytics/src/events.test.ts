import { describe, expect, it } from 'vitest';
import { assertNoPersonalData, defineEvent, EVENT_NAMES, PersonalDataInEventError } from './events';

const base = {
  eventId: 'evt_1',
  name: 'CaseCreated' as const,
  occurredAt: '2026-08-25T00:00:00.000Z',
  actorRef: 'usr_9f2',
  attributes: {},
};

describe('event taxonomy', () => {
  it('covers the blueprint event list', () => {
    for (const name of [
      'PaymentConfirmed',
      'MilestoneVerified',
      'SettlementReleased',
      'RiskSignalRaised',
    ]) {
      expect(EVENT_NAMES).toContain(name);
    }
  });

  it('rejects an unknown event name rather than accepting free-form strings', () => {
    expect(() => defineEvent({ ...base, name: 'SomethingMade' })).toThrow();
  });
});

describe('privacy guard', () => {
  it('rejects a forbidden attribute key', () => {
    expect(() => defineEvent({ ...base, attributes: { phoneNumber: 'x' } })).toThrow(
      PersonalDataInEventError,
    );
  });

  it('rejects a Bangladeshi mobile number hidden in an innocuous key', () => {
    expect(() => defineEvent({ ...base, attributes: { note: 'call 01712345678' } })).toThrow(
      PersonalDataInEventError,
    );
  });

  it('rejects an email address', () => {
    expect(() => defineEvent({ ...base, attributes: { contact: 'a.b@example.com' } })).toThrow(
      PersonalDataInEventError,
    );
  });

  it('rejects a long numeric identifier that looks like an NID', () => {
    expect(() => defineEvent({ ...base, attributes: { ref: '1990123456789' } })).toThrow(
      PersonalDataInEventError,
    );
  });

  it('allows pseudonymous references and aggregate attributes', () => {
    const event = defineEvent({
      ...base,
      countryCode: 'QA',
      attributes: { routeStatus: 'employer_sponsored', costItemCount: 6, employerPays: true },
    });
    expect(() => assertNoPersonalData(event)).not.toThrow();
  });
});
