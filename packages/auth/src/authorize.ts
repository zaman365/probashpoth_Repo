import type { Action, Decision, Obligations, Resource, Subject } from './model';
import { SENSITIVE_PII_FIELDS } from './model';

const NO_OBLIGATIONS: Obligations = { auditAccess: false, maskFields: [], requireReason: false };

function deny(reason: string): Decision {
  return { allowed: false, reason, obligations: NO_OBLIGATIONS };
}

function allow(reason: string, obligations: Partial<Obligations> = {}): Decision {
  return { allowed: true, reason, obligations: { ...NO_OBLIGATIONS, ...obligations } };
}

function hasRole(subject: Subject, ...roles: Subject['roles']): boolean {
  return subject.roles.some((role) => roles.includes(role));
}

const SENSITIVE_ACTIONS: Action[] = ['read_sensitive', 'export'];

/**
 * §49 — RBAC + ABAC, deny by default.
 *
 * The ordering matters: hard denials (break-glass without a reason, suspended
 * sessions, admin routine access to sensitive documents) are evaluated before any
 * role grant, so no role can accidentally out-rank a protection.
 */
export function authorize(subject: Subject, action: Action, resource: Resource): Decision {
  // --- Hard denials ---------------------------------------------------------
  if (subject.sessionKind === 'break_glass' && !subject.breakGlassReason?.trim()) {
    return deny('break_glass_requires_reason');
  }

  // §49: a super admin has no *routine* access to sensitive documents. Break-glass
  // with a recorded reason is the only path, and it is always audited.
  if (
    hasRole(subject, 'platform_admin') &&
    resource.sensitivity === 'sensitive_pii' &&
    subject.sessionKind !== 'break_glass'
  ) {
    return deny('admin_routine_sensitive_access_forbidden');
  }

  // An assistant never gains financial or contractual write power (§27).
  if (
    hasRole(subject, 'assistant') &&
    !hasRole(subject, 'platform_admin') &&
    (action === 'settle' || (action === 'write' && resource.type === 'payment'))
  ) {
    return deny('assistant_cannot_move_money');
  }

  // --- Owner ----------------------------------------------------------------
  const isOwner = resource.ownerUserId !== undefined && resource.ownerUserId === subject.userId;
  if (isOwner) {
    if (action === 'publish' || action === 'verify') {
      return deny('owner_cannot_self_verify');
    }
    return allow('owner', {
      auditAccess: SENSITIVE_ACTIONS.includes(action),
    });
  }

  // --- Family co-pilot (§28) ------------------------------------------------
  // A delegation is evaluated whenever one exists for this resource's owner. Most
  // co-pilots are ordinary users of the platform in their own right, so the grant —
  // not a role label — is what confers the access.
  const grant = subject.delegations?.find((d) => d.principalUserId === resource.ownerUserId);
  if (grant || hasRole(subject, 'family_delegate')) {
    if (!grant) return deny('no_delegation_for_principal');
    if (resource.sensitivity === 'sensitive_pii') {
      return deny('delegate_cannot_read_sensitive_pii');
    }
    if (action !== 'read') return deny('delegate_is_read_only');
    if (resource.type === 'cost_plan' || resource.type === 'payment') {
      return grant.permissions.includes('view_cost')
        ? allow('delegation_view_cost', { auditAccess: true })
        : deny('delegation_missing_view_cost');
    }
    if (resource.type === 'case') {
      return grant.permissions.includes('view_progress')
        ? allow('delegation_view_progress', { auditAccess: true })
        : deny('delegation_missing_view_progress');
    }
    return deny('delegation_scope_exceeded');
  }

  // --- Assisted service desk (§27) -----------------------------------------
  if (hasRole(subject, 'assistant')) {
    const consented = resource.caseId
      ? subject.consentedCaseIds?.includes(resource.caseId)
      : undefined;
    if (!consented) return deny('assistant_requires_case_consent');
    if (resource.sensitivity === 'sensitive_pii' && action === 'read_sensitive') {
      return allow('assistant_consented_sensitive', {
        auditAccess: true,
        requireReason: true,
        maskFields: [],
      });
    }
    if (action === 'read' || action === 'write') {
      return allow('assistant_consented_case', { auditAccess: true });
    }
    return deny('assistant_scope_exceeded');
  }

  // --- Employer (§49) -------------------------------------------------------
  if (hasRole(subject, 'employer_staff')) {
    if (resource.organizationId && resource.organizationId === subject.organizationId) {
      return allow('employer_own_organization', {
        auditAccess: SENSITIVE_ACTIONS.includes(action),
      });
    }
    const consented =
      subject.organizationId !== undefined &&
      resource.consentedOrganizationIds?.includes(subject.organizationId) === true;
    if (!consented) return deny('employer_requires_candidate_consent');
    if (resource.sensitivity === 'sensitive_pii') {
      // Passport/NID stay hidden until the step that legally needs them (§18).
      return action === 'read_sensitive'
        ? allow('employer_consented_sensitive', { auditAccess: true, requireReason: true })
        : deny('employer_sensitive_requires_explicit_action');
    }
    return action === 'read'
      ? allow('employer_consented_candidate', { auditAccess: true })
      : deny('employer_read_only_for_candidates');
  }

  // --- Recruiter / institution / provider ----------------------------------
  if (hasRole(subject, 'recruiter_staff', 'institution_staff', 'provider_staff')) {
    const sameOrg =
      resource.organizationId !== undefined && resource.organizationId === subject.organizationId;
    const consented =
      subject.organizationId !== undefined &&
      resource.consentedOrganizationIds?.includes(subject.organizationId) === true;
    if (!sameOrg && !consented) return deny('organization_boundary');
    if (hasRole(subject, 'provider_staff') && !['case', 'document'].includes(resource.type)) {
      return deny('provider_appointment_scope_only');
    }
    if (resource.sensitivity === 'sensitive_pii' && action !== 'read_sensitive') {
      return deny('sensitive_requires_explicit_action');
    }
    return allow('organization_member', {
      auditAccess: SENSITIVE_ACTIONS.includes(action) || resource.sensitivity === 'sensitive_pii',
      requireReason: resource.sensitivity === 'sensitive_pii',
    });
  }

  // --- Government officer (§49) --------------------------------------------
  if (hasRole(subject, 'gov_officer')) {
    if (!subject.mfaSatisfied) return deny('mfa_required_for_institutional_user');
    const jurisdictionOk =
      !subject.jurisdiction?.countryCode ||
      !resource.countryCode ||
      subject.jurisdiction.countryCode === resource.countryCode;
    if (!jurisdictionOk) return deny('outside_jurisdiction');
    if (action === 'delete') return deny('government_cannot_delete_records');
    return allow('government_scope', { auditAccess: true, requireReason: true });
  }

  // --- Support / welfare case worker (§13 P12) ------------------------------
  if (hasRole(subject, 'support_agent')) {
    if (!resource.caseId) return deny('support_requires_case_scope');
    if (action === 'read') {
      return allow('support_case_scope', {
        auditAccess: true,
        maskFields: [...SENSITIVE_PII_FIELDS],
      });
    }
    if (action === 'write' && resource.type === 'complaint') {
      return allow('support_complaint_handling', { auditAccess: true });
    }
    return deny('support_scope_exceeded');
  }

  // --- Platform admin (non-sensitive only, always audited) -------------------
  if (hasRole(subject, 'platform_admin')) {
    if (!subject.mfaSatisfied) return deny('mfa_required_for_institutional_user');
    if (action === 'delete' && resource.type === 'complaint') {
      // §76.8 — a complaint cannot be deleted, by anyone.
      return deny('complaints_are_immutable');
    }
    return allow('platform_admin', { auditAccess: true, requireReason: true });
  }

  return deny('no_matching_grant');
}

/** Convenience wrapper for call sites that only need a boolean. */
export function can(subject: Subject, action: Action, resource: Resource): boolean {
  return authorize(subject, action, resource).allowed;
}
