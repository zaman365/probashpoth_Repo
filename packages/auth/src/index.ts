/**
 * @probash/auth — RBAC + ABAC authorization (§49).
 *
 * Deny by default. Every decision returns obligations (audit, masking, reason)
 * that the caller must honour; a route that ignores them is a review failure.
 */
export * from './model';
export * from './authorize';
