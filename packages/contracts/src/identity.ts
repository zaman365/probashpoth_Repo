import { z } from 'zod';
import { localeSchema } from './primitives';

/** §17 — phone OTP first. Email is never required for worker onboarding. */
export const bangladeshiPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number');

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, '');
  const withoutCountry = digits.startsWith('880') ? digits.slice(3) : digits;
  const national = withoutCountry.startsWith('0') ? withoutCountry.slice(1) : withoutCountry;
  return `+880${national}`;
}

export const requestOtpSchema = z.object({
  phone: bangladeshiPhoneSchema,
  locale: localeSchema.default('bn-BD'),
  /** Set when an assisted-service operator initiates onboarding (§27). */
  assistedByUserId: z.string().optional(),
});
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;

export const requestOtpResponseSchema = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
  /** Development only: the OTP is echoed so the slice is runnable without an SMS gateway. */
  devOtp: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  challengeId: z.string(),
  code: z.string().regex(/^\d{6}$/),
  /** Explicit consent captured at account creation (§17). */
  consentAccepted: z.boolean(),
});
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: z.object({
    id: z.string(),
    displayName: z.string().optional(),
    roles: z.array(z.string()),
    locale: localeSchema,
    onboardingComplete: z.boolean(),
  }),
});
export type SessionDto = z.infer<typeof sessionSchema>;

export const workerProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().optional(),
  intent: z.enum(['work', 'study']).default('work'),
  occupationKey: z.string().optional(),
  experienceMonths: z.number().int().min(0).optional(),
  educationLevel: z.string().optional(),
  hasValidPassport: z.boolean().optional(),
  passportValidMonths: z.number().int().min(0).optional(),
  hasBmetRegistration: z.boolean().optional(),
  hasPoliceClearance: z.boolean().optional(),
  languageCertificates: z.array(z.string()).default([]),
  skillCertificates: z.array(z.string()).default([]),
  medicallyFit: z.boolean().optional(),
  destinationPreferences: z.array(z.string().length(2)).default([]),
  district: z.string().optional(),
  locale: localeSchema.default('bn-BD'),
  updatedAt: z.string().optional(),
});
export type WorkerProfileDto = z.infer<typeof workerProfileSchema>;

export const updateProfileSchema = workerProfileSchema
  .omit({ userId: true, updatedAt: true })
  .partial();
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
