import { describe, expect, it } from 'vitest';
import { authorize, can } from './authorize';
import type { Resource, Subject } from './model';

const worker = (over: Partial<Subject> = {}): Subject => ({
  userId: 'user_worker',
  roles: ['worker'],
  sessionKind: 'self',
  ...over,
});

const ownDocument: Resource = {
  type: 'document',
  id: 'doc_1',
  ownerUserId: 'user_worker',
  caseId: 'case_1',
  sensitivity: 'sensitive_pii',
};

const candidateProfile: Resource = {
  type: 'user_profile',
  ownerUserId: 'user_worker',
  caseId: 'case_1',
  sensitivity: 'normal',
  consentedOrganizationIds: ['org_employer'],
};

describe('worker owns their own data', () => {
  it('can read and write their own records', () => {
    expect(can(worker(), 'read', ownDocument)).toBe(true);
    expect(can(worker(), 'write', ownDocument)).toBe(true);
  });

  it('cannot verify or publish their own records', () => {
    expect(authorize(worker(), 'verify', ownDocument).reason).toBe('owner_cannot_self_verify');
  });

  it('audits their own sensitive export', () => {
    expect(authorize(worker(), 'export', ownDocument).obligations.auditAccess).toBe(true);
  });

  it("cannot touch another worker's document", () => {
    expect(can(worker({ userId: 'someone_else' }), 'read', ownDocument)).toBe(false);
  });
});

describe('family co-pilot (§28)', () => {
  const delegate = (permissions: Subject['delegations'] = []): Subject => ({
    userId: 'user_family',
    roles: ['family_delegate'],
    sessionKind: 'delegated',
    delegations: permissions,
  });

  const grant = [
    { principalUserId: 'user_worker', permissions: ['view_progress', 'view_cost'] as const },
  ];

  it('sees progress and cost when granted', () => {
    const subject = delegate([
      { principalUserId: 'user_worker', permissions: [...grant[0]!.permissions] },
    ]);
    expect(
      can(subject, 'read', { type: 'case', ownerUserId: 'user_worker', sensitivity: 'normal' }),
    ).toBe(true);
    expect(
      can(subject, 'read', {
        type: 'cost_plan',
        ownerUserId: 'user_worker',
        sensitivity: 'normal',
      }),
    ).toBe(true);
  });

  it('cannot read the passport or NID', () => {
    const subject = delegate([{ principalUserId: 'user_worker', permissions: ['view_progress'] }]);
    expect(authorize(subject, 'read', ownDocument).reason).toBe(
      'delegate_cannot_read_sensitive_pii',
    );
  });

  it('is read-only — never signs or edits', () => {
    const subject = delegate([{ principalUserId: 'user_worker', permissions: ['view_progress'] }]);
    expect(
      authorize(subject, 'write', {
        type: 'case',
        ownerUserId: 'user_worker',
        sensitivity: 'normal',
      }).reason,
    ).toBe('delegate_is_read_only');
  });

  it('cannot see a cost plan without the view_cost permission', () => {
    const subject = delegate([{ principalUserId: 'user_worker', permissions: ['view_progress'] }]);
    expect(
      authorize(subject, 'read', {
        type: 'cost_plan',
        ownerUserId: 'user_worker',
        sensitivity: 'normal',
      }).reason,
    ).toBe('delegation_missing_view_cost');
  });

  it('has no access to a principal who never invited them', () => {
    const subject = delegate([{ principalUserId: 'someone_else', permissions: ['view_progress'] }]);
    expect(
      authorize(subject, 'read', {
        type: 'case',
        ownerUserId: 'user_worker',
        sensitivity: 'normal',
      }).reason,
    ).toBe('no_delegation_for_principal');
  });
});

describe('assisted service desk (§27)', () => {
  const assistant = (caseIds: string[] = []): Subject => ({
    userId: 'user_assistant',
    roles: ['assistant'],
    sessionKind: 'assisted',
    consentedCaseIds: caseIds,
  });

  it('needs explicit case consent', () => {
    expect(authorize(assistant([]), 'read', candidateProfile).reason).toBe(
      'assistant_requires_case_consent',
    );
    expect(can(assistant(['case_1']), 'read', candidateProfile)).toBe(true);
  });

  it('can never move money', () => {
    expect(
      authorize(assistant(['case_1']), 'settle', {
        type: 'payment',
        caseId: 'case_1',
        sensitivity: 'normal',
      }).reason,
    ).toBe('assistant_cannot_move_money');
  });

  it('audits and demands a reason for sensitive reads', () => {
    const decision = authorize(assistant(['case_1']), 'read_sensitive', ownDocument);
    expect(decision.allowed).toBe(true);
    expect(decision.obligations).toMatchObject({ auditAccess: true, requireReason: true });
  });
});

describe('employer boundaries (§49)', () => {
  const employer: Subject = {
    userId: 'user_employer',
    roles: ['employer_staff'],
    organizationId: 'org_employer',
    sessionKind: 'self',
  };

  it('sees a consented candidate profile', () => {
    expect(can(employer, 'read', candidateProfile)).toBe(true);
  });

  it('cannot see a candidate who has not consented', () => {
    expect(
      authorize(employer, 'read', { ...candidateProfile, consentedOrganizationIds: [] }).reason,
    ).toBe('employer_requires_candidate_consent');
  });

  it('cannot read a passport with an ordinary read — it must be an explicit sensitive action', () => {
    expect(
      authorize(employer, 'read', { ...ownDocument, consentedOrganizationIds: ['org_employer'] })
        .reason,
    ).toBe('employer_sensitive_requires_explicit_action');
  });

  it('gets an audited, reasoned sensitive read once consented', () => {
    const decision = authorize(employer, 'read_sensitive', {
      ...ownDocument,
      consentedOrganizationIds: ['org_employer'],
    });
    expect(decision.allowed).toBe(true);
    expect(decision.obligations.requireReason).toBe(true);
  });
});

describe('government and admin', () => {
  const officer = (over: Partial<Subject> = {}): Subject => ({
    userId: 'user_gov',
    roles: ['gov_officer'],
    sessionKind: 'self',
    mfaSatisfied: true,
    jurisdiction: { countryCode: 'BD' },
    ...over,
  });

  it('requires MFA', () => {
    expect(
      authorize(officer({ mfaSatisfied: false }), 'read', { type: 'case', sensitivity: 'normal' })
        .reason,
    ).toBe('mfa_required_for_institutional_user');
  });

  it('is scoped to its jurisdiction', () => {
    expect(
      authorize(officer(), 'read', { type: 'job', sensitivity: 'normal', countryCode: 'QA' })
        .reason,
    ).toBe('outside_jurisdiction');
  });

  it('can never delete records', () => {
    expect(authorize(officer(), 'delete', { type: 'case', sensitivity: 'normal' }).reason).toBe(
      'government_cannot_delete_records',
    );
  });

  it('denies a platform admin routine access to sensitive documents', () => {
    const admin: Subject = {
      userId: 'user_admin',
      roles: ['platform_admin'],
      sessionKind: 'self',
      mfaSatisfied: true,
    };
    expect(authorize(admin, 'read_sensitive', ownDocument).reason).toBe(
      'admin_routine_sensitive_access_forbidden',
    );
  });

  it('requires a recorded reason for break-glass', () => {
    const admin: Subject = {
      userId: 'user_admin',
      roles: ['platform_admin'],
      sessionKind: 'break_glass',
      mfaSatisfied: true,
    };
    expect(authorize(admin, 'read_sensitive', ownDocument).reason).toBe(
      'break_glass_requires_reason',
    );
    const withReason = authorize(
      { ...admin, breakGlassReason: 'fraud investigation TCK-42' },
      'read_sensitive',
      ownDocument,
    );
    expect(withReason.allowed).toBe(true);
    expect(withReason.obligations.auditAccess).toBe(true);
  });

  it('never lets anyone delete a complaint (§76.8)', () => {
    const admin: Subject = {
      userId: 'user_admin',
      roles: ['platform_admin'],
      sessionKind: 'self',
      mfaSatisfied: true,
    };
    expect(authorize(admin, 'delete', { type: 'complaint', sensitivity: 'normal' }).reason).toBe(
      'complaints_are_immutable',
    );
  });
});

describe('support agent', () => {
  const support: Subject = {
    userId: 'user_support',
    roles: ['support_agent'],
    sessionKind: 'self',
  };

  it('reads case data with PII masked', () => {
    const decision = authorize(support, 'read', candidateProfile);
    expect(decision.allowed).toBe(true);
    expect(decision.obligations.maskFields).toContain('passportNumber');
  });

  it('has no access outside a case', () => {
    expect(authorize(support, 'read', { type: 'job', sensitivity: 'normal' }).reason).toBe(
      'support_requires_case_scope',
    );
  });
});

describe('default posture', () => {
  it('denies an unknown role', () => {
    expect(
      authorize({ userId: 'x', roles: [], sessionKind: 'self' }, 'read', {
        type: 'job',
        sensitivity: 'normal',
      }).reason,
    ).toBe('no_matching_grant');
  });
});
