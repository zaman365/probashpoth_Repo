import { describe, expect, it } from 'vitest';
import { assertCaseTransition, isFinalCaseState, nextCaseStates } from './cases';
import { InvariantViolatedError } from './errors';

describe('case state machine', () => {
  it('advances one step along the happy path', () => {
    expect(nextCaseStates('DRAFT')).toContain('ELIGIBILITY_CHECKED');
    expect(nextCaseStates('DRAFT')).not.toContain('SUBMITTED');
  });

  it('allows interrupts from any live state', () => {
    expect(nextCaseStates('VISA_SUBMITTED')).toEqual(
      expect.arrayContaining(['REJECTED', 'WITHDRAWN', 'CANCELLED', 'DISPUTED', 'PAUSED']),
    );
  });

  it('rejects skipping steps', () => {
    expect(() => assertCaseTransition('DRAFT', 'DEPARTED')).toThrow(InvariantViolatedError);
  });

  it('treats withdrawal and cancellation as final', () => {
    expect(isFinalCaseState('CANCELLED')).toBe(true);
    expect(nextCaseStates('CANCELLED')).toEqual([]);
  });

  it('lets a paused case resume into the workflow', () => {
    expect(nextCaseStates('PAUSED')).toContain('DOCUMENTS_PREPARING');
  });
});
