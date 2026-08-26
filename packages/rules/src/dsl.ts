import { z } from 'zod';

/**
 * §48 — rules are auditable data, not arbitrary JavaScript.
 * The DSL is intentionally small: comparison, set membership, presence, and
 * all/any/not composition. Anything that cannot be expressed here belongs in a
 * documented, reviewed extension — not in an ad-hoc function.
 */

export const localizedTextSchema = z.object({
  bn: z.string().min(1),
  en: z.string().min(1),
});

export const sourceRefSchema = z.object({
  sourceId: z.string().min(1),
  locator: z.string().optional(),
  retrievedAt: z.string().optional(),
});

const comparableSchema = z.union([z.string(), z.number(), z.boolean()]);

export const conditionSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('eq'), fact: z.string(), value: comparableSchema }),
  z.object({ op: z.literal('neq'), fact: z.string(), value: comparableSchema }),
  z.object({ op: z.literal('gt'), fact: z.string(), value: z.number() }),
  z.object({ op: z.literal('gte'), fact: z.string(), value: z.number() }),
  z.object({ op: z.literal('lt'), fact: z.string(), value: z.number() }),
  z.object({ op: z.literal('lte'), fact: z.string(), value: z.number() }),
  z.object({ op: z.literal('in'), fact: z.string(), value: z.array(comparableSchema).min(1) }),
  z.object({ op: z.literal('nin'), fact: z.string(), value: z.array(comparableSchema).min(1) }),
  z.object({ op: z.literal('includes'), fact: z.string(), value: comparableSchema }),
  z.object({ op: z.literal('exists'), fact: z.string() }),
  z.object({ op: z.literal('missing'), fact: z.string() }),
]);

export type Condition = z.infer<typeof conditionSchema>;

const nodeMetaSchema = {
  id: z.string().min(1),
  label: localizedTextSchema,
  /** Official sources backing this specific requirement (§38). */
  sources: z.array(sourceRefSchema).default([]),
};

export interface CheckNode {
  type: 'check';
  id: string;
  label: z.infer<typeof localizedTextSchema>;
  sources: z.infer<typeof sourceRefSchema>[];
  condition: Condition;
  /**
   * A requirement the applicant can realistically satisfy with preparation
   * (a language test, a certificate). Drives "You may become eligible" (§19).
   */
  remediable: boolean;
  preparation?: z.infer<typeof localizedTextSchema>;
  requirementRefId?: string;
}

export type RuleNode =
  | CheckNode
  | {
      type: 'all';
      id: string;
      label: z.infer<typeof localizedTextSchema>;
      sources: z.infer<typeof sourceRefSchema>[];
      nodes: RuleNode[];
    }
  | {
      type: 'any';
      id: string;
      label: z.infer<typeof localizedTextSchema>;
      sources: z.infer<typeof sourceRefSchema>[];
      nodes: RuleNode[];
    }
  | {
      type: 'not';
      id: string;
      label: z.infer<typeof localizedTextSchema>;
      sources: z.infer<typeof sourceRefSchema>[];
      node: RuleNode;
    };

export const ruleNodeSchema: z.ZodType<RuleNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('check'),
      ...nodeMetaSchema,
      condition: conditionSchema,
      remediable: z.boolean().default(false),
      preparation: localizedTextSchema.optional(),
      requirementRefId: z.string().optional(),
    }),
    z.object({ type: z.literal('all'), ...nodeMetaSchema, nodes: z.array(ruleNodeSchema).min(1) }),
    z.object({ type: z.literal('any'), ...nodeMetaSchema, nodes: z.array(ruleNodeSchema).min(1) }),
    z.object({ type: z.literal('not'), ...nodeMetaSchema, node: ruleNodeSchema }),
  ]),
) as z.ZodType<RuleNode>;

export const ruleVersionSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  title: localizedTextSchema,
  expression: ruleNodeSchema,
  sourceIds: z.array(z.string()).default([]),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  publicationStatus: z.enum(['draft', 'review', 'published', 'withdrawn']),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  reviewCadenceDays: z.number().int().positive().default(7),
  lastReviewedAt: z.string().optional(),
});

export type RuleVersion = z.infer<typeof ruleVersionSchema>;

export function parseRuleVersion(input: unknown): RuleVersion {
  return ruleVersionSchema.parse(input);
}

/**
 * Only a published version that is effective at `at` may drive a user-facing answer.
 * Draft and withdrawn versions are invisible to evaluation (ADR 0003).
 */
export function selectEffectiveRuleVersion(
  versions: readonly RuleVersion[],
  at: Date = new Date(),
): RuleVersion | undefined {
  const t = at.getTime();
  return versions
    .filter((v) => v.publicationStatus === 'published')
    .filter((v) => Date.parse(v.effectiveFrom) <= t)
    .filter((v) => !v.effectiveTo || Date.parse(v.effectiveTo) > t)
    .sort((a, b) => b.version - a.version)[0];
}
