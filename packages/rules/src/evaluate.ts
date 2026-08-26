import type { Condition, RuleNode, RuleVersion } from './dsl';

/**
 * Three-valued logic. "unknown" is the whole point (ADR 0003): a missing fact must
 * never collapse into a confident "no", and it must never be guessed into a "yes".
 */
export type Ternary = 'true' | 'false' | 'unknown';

export type FactValue =
  string | number | boolean | (string | number | boolean)[] | null | undefined;
export type FactBag = Readonly<Record<string, FactValue>>;

export interface RuleTrace {
  nodeId: string;
  label: { bn: string; en: string };
  outcome: Ternary;
  condition?: Condition;
  actualValue?: FactValue;
  remediable?: boolean;
  preparation?: { bn: string; en: string };
  requirementRefId?: string;
  sourceIds: string[];
}

export interface MissingFact {
  factKey: string;
  nodeId: string;
  label: { bn: string; en: string };
  /** What the user (or an assistant) has to supply to make this answerable. */
  requirementRefId?: string;
}

export type EligibilityResult = 'eligible' | 'ineligible' | 'conditional' | 'unknown';

export interface DecisionTrace {
  result: EligibilityResult;
  ruleVersionIds: string[];
  satisfied: RuleTrace[];
  unsatisfied: RuleTrace[];
  /** Unsatisfied checks the applicant can prepare for — "You may become eligible" (§19). */
  remediable: RuleTrace[];
  missingFacts: MissingFact[];
  sources: { sourceId: string; locator?: string }[];
  evaluatedAt: string;
}

function compare(actual: FactValue, condition: Condition): Ternary {
  const missing = actual === undefined || actual === null;

  switch (condition.op) {
    case 'exists':
      return missing ? 'false' : 'true';
    case 'missing':
      return missing ? 'true' : 'false';
    default:
      break;
  }

  if (missing) return 'unknown';

  switch (condition.op) {
    case 'eq':
      return actual === condition.value ? 'true' : 'false';
    case 'neq':
      return actual !== condition.value ? 'true' : 'false';
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (typeof actual !== 'number') return 'unknown';
      const v = condition.value;
      const ok =
        condition.op === 'gt'
          ? actual > v
          : condition.op === 'gte'
            ? actual >= v
            : condition.op === 'lt'
              ? actual < v
              : actual <= v;
      return ok ? 'true' : 'false';
    }
    case 'in':
      return (condition.value as (string | number | boolean)[]).includes(
        actual as string | number | boolean,
      )
        ? 'true'
        : 'false';
    case 'nin':
      return (condition.value as (string | number | boolean)[]).includes(
        actual as string | number | boolean,
      )
        ? 'false'
        : 'true';
    case 'includes': {
      if (!Array.isArray(actual)) return 'unknown';
      return actual.includes(condition.value) ? 'true' : 'false';
    }
    default: {
      const exhaustive: never = condition;
      void exhaustive;
      return 'unknown';
    }
  }
}

function and(outcomes: readonly Ternary[]): Ternary {
  if (outcomes.includes('false')) return 'false';
  if (outcomes.includes('unknown')) return 'unknown';
  return 'true';
}

function or(outcomes: readonly Ternary[]): Ternary {
  if (outcomes.includes('true')) return 'true';
  if (outcomes.includes('unknown')) return 'unknown';
  return 'false';
}

function negate(outcome: Ternary): Ternary {
  if (outcome === 'true') return 'false';
  if (outcome === 'false') return 'true';
  return 'unknown';
}

interface Collector {
  satisfied: RuleTrace[];
  unsatisfied: RuleTrace[];
  remediable: RuleTrace[];
  missingFacts: MissingFact[];
  sources: Map<string, { sourceId: string; locator?: string }>;
}

function collectSources(node: RuleNode, collector: Collector): string[] {
  const ids: string[] = [];
  for (const ref of node.sources ?? []) {
    ids.push(ref.sourceId);
    const key = `${ref.sourceId}::${ref.locator ?? ''}`;
    if (!collector.sources.has(key)) {
      collector.sources.set(key, { sourceId: ref.sourceId, locator: ref.locator });
    }
  }
  return ids;
}

function walk(node: RuleNode, facts: FactBag, collector: Collector): Ternary {
  const sourceIds = collectSources(node, collector);

  switch (node.type) {
    case 'check': {
      const actual = facts[node.condition.fact];
      const outcome = compare(actual, node.condition);
      const trace: RuleTrace = {
        nodeId: node.id,
        label: node.label,
        outcome,
        condition: node.condition,
        actualValue: actual,
        remediable: node.remediable,
        preparation: node.preparation,
        requirementRefId: node.requirementRefId,
        sourceIds,
      };

      if (outcome === 'true') {
        collector.satisfied.push(trace);
      } else if (outcome === 'false') {
        collector.unsatisfied.push(trace);
        if (node.remediable) collector.remediable.push(trace);
      } else {
        collector.missingFacts.push({
          factKey: node.condition.fact,
          nodeId: node.id,
          label: node.label,
          requirementRefId: node.requirementRefId,
        });
      }
      return outcome;
    }
    case 'all':
      return and(node.nodes.map((child) => walk(child, facts, collector)));
    case 'any':
      return or(node.nodes.map((child) => walk(child, facts, collector)));
    case 'not':
      return negate(walk(node.node, facts, collector));
    default: {
      const exhaustive: never = node;
      void exhaustive;
      return 'unknown';
    }
  }
}

export interface EvaluateOptions {
  now?: Date;
}

/**
 * Evaluate one or more effective rule versions against an applicant's facts.
 * The user-facing explanation is rendered from this trace and nothing else.
 */
export function evaluate(
  ruleVersions: readonly RuleVersion[],
  facts: FactBag,
  options: EvaluateOptions = {},
): DecisionTrace {
  const collector: Collector = {
    satisfied: [],
    unsatisfied: [],
    remediable: [],
    missingFacts: [],
    sources: new Map(),
  };

  if (ruleVersions.length === 0) {
    // No published rule = we do not know. Never "eligible", never "ineligible" (§19).
    return {
      result: 'unknown',
      ruleVersionIds: [],
      satisfied: [],
      unsatisfied: [],
      remediable: [],
      missingFacts: [],
      sources: [],
      evaluatedAt: (options.now ?? new Date()).toISOString(),
    };
  }

  const outcomes = ruleVersions.map((version) => walk(version.expression, facts, collector));
  const overall = and(outcomes);

  let result: EligibilityResult;
  if (overall === 'true') {
    result = 'eligible';
  } else if (overall === 'unknown') {
    result = 'unknown';
  } else if (
    collector.unsatisfied.length > 0 &&
    collector.unsatisfied.every((trace) => trace.remediable)
  ) {
    result = 'conditional';
  } else {
    result = 'ineligible';
  }

  return {
    result,
    ruleVersionIds: ruleVersions.map((v) => v.id),
    satisfied: collector.satisfied,
    unsatisfied: collector.unsatisfied,
    remediable: collector.remediable,
    missingFacts: collector.missingFacts,
    sources: [...collector.sources.values()],
    evaluatedAt: (options.now ?? new Date()).toISOString(),
  };
}
