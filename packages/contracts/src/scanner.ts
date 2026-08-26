import { z } from 'zod';
import { localizedTextSchema, moneySchema } from './primitives';

/** §23 — the offer/visa/document scanner. */
export const scanOfferSchema = z
  .object({
    /** A pasted SMS/WhatsApp message, the most common real-world input. */
    messageText: z.string().max(5000).optional(),
    publicJobId: z.string().optional(),
    /** Structured fields extracted by the client, or typed in by an assistant. */
    claimed: z
      .object({
        employerName: z.string().optional(),
        agencyName: z.string().optional(),
        agencyLicenceNumber: z.string().optional(),
        occupationKey: z.string().optional(),
        monthlySalary: moneySchema.optional(),
        totalCostToWorker: moneySchema.optional(),
        paymentDestination: z.string().optional(),
        visaClass: z.string().optional(),
        contactNumber: z.string().optional(),
        institutionDomain: z.string().optional(),
      })
      .optional(),
    documentId: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.messageText || value.publicJobId || value.claimed || value.documentId),
    { message: 'Provide a message, a verification ID, extracted fields, or a document' },
  );
export type ScanOfferDto = z.infer<typeof scanOfferSchema>;

export const riskSignalSchema = z.object({
  id: z.string(),
  kind: z.string(),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  title: localizedTextSchema,
  explanation: localizedTextSchema,
  advice: localizedTextSchema,
  evidence: z.record(z.string(), z.unknown()).default({}),
  sourceIds: z.array(z.string()).default([]),
});
export type RiskSignalDto = z.infer<typeof riskSignalSchema>;

export const performedCheckSchema = z.object({
  key: z.string(),
  label: localizedTextSchema,
  performed: z.boolean(),
  passed: z.boolean().nullable(),
  detail: localizedTextSchema.optional(),
});

export const scanResultSchema = z.object({
  verdict: z.enum([
    'VERIFIED',
    'PARTIALLY_VERIFIED',
    'MISMATCH',
    'HIGH_RISK',
    'UNKNOWN_HUMAN_CHECK_REQUIRED',
  ]),
  /** Exactly what was checked and what could not be checked (§22, §75). */
  checksPerformed: z.array(performedCheckSchema),
  signals: z.array(riskSignalSchema),
  matchedJobPublicId: z.string().optional(),
  humanReviewRequested: z.boolean(),
  scannedAt: z.string(),
  /**
   * Deterministic, trace-derived explanation. The AI layer may rephrase this text
   * but can never change the verdict or add a check (§23, §41).
   */
  explanation: localizedTextSchema,
});
export type ScanResultDto = z.infer<typeof scanResultSchema>;
