import { z } from 'zod';

/** Shared building blocks for every DTO. Zod sits at every boundary (§83). */
export const localizedTextSchema = z.object({ bn: z.string(), en: z.string() });
export type LocalizedTextDto = z.infer<typeof localizedTextSchema>;

export const moneySchema = z.object({
  minorUnits: z.string().regex(/^-?\d+$/),
  currency: z.string().length(3),
});
export type MoneyDto = z.infer<typeof moneySchema>;

export const localeSchema = z.enum(['bn-BD', 'en']);

export const sourceRefSchema = z.object({
  sourceId: z.string(),
  locator: z.string().optional(),
  retrievedAt: z.string().optional(),
});

export const sourceSummarySchema = z.object({
  id: z.string(),
  authority: localizedTextSchema,
  title: localizedTextSchema,
  url: z.string(),
  kind: z.string(),
  lastReviewedAt: z.string().optional(),
  freshness: z.enum(['fresh', 'ageing', 'stale', 'unknown']),
  trustTier: z
    .enum([
      'TIER_1_OFFICIAL',
      'TIER_2_REGULATOR_OR_PUBLIC_BODY',
      'TIER_3_INSTITUTION_OR_EMPLOYER',
      'TIER_4_VERIFIED_PARTNER',
      'TIER_5_SECONDARY_REFERENCE',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'STALE', 'UNAVAILABLE', 'REPLACED', 'REVIEW_REQUIRED']).optional(),
});
export type SourceSummaryDto = z.infer<typeof sourceSummarySchema>;

export const verificationFacetSchema = z.object({
  key: z.string(),
  label: localizedTextSchema,
  checked: z.boolean(),
  method: z.string(),
  sourceId: z.string().optional(),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  note: localizedTextSchema.optional(),
});

export const verificationSummarySchema = z.object({
  level: z.string(),
  facets: z.array(verificationFacetSchema),
  notChecked: z.array(verificationFacetSchema),
  lastVerifiedAt: z.string().optional(),
});
export type VerificationSummaryDto = z.infer<typeof verificationSummarySchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** i18n key so the surface can render the error in Bangla (ADR 0002). */
    messageKey: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorDto = z.infer<typeof apiErrorSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
