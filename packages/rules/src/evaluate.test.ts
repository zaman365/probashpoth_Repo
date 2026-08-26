import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { buildFactBag, FACT_KEYS } from './facts';
import { parseRuleVersion, selectEffectiveRuleVersion } from './dsl';
import type { RuleVersion } from './dsl';

const label = (en: string) => ({ bn: `${en} (বাংলা)`, en });

const rule = (expression: unknown, over: Partial<RuleVersion> = {}): RuleVersion =>
  parseRuleVersion({
    id: 'rv_1',
    ruleId: 'r_1',
    version: 1,
    title: label('Test route eligibility'),
    expression,
    sourceIds: ['src_test'],
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    publicationStatus: 'published',
    ...over,
  });

const passportCheck = {
  type: 'check',
  id: 'passport',
  label: label('Valid passport'),
  sources: [{ sourceId: 'src_passport' }],
  condition: { op: 'eq', fact: FACT_KEYS.hasValidPassport, value: true },
  remediable: true,
  preparation: label('Apply for or renew your passport'),
};

const experienceCheck = {
  type: 'check',
  id: 'experience',
  label: label('24 months experience'),
  sources: [{ sourceId: 'src_route' }],
  condition: { op: 'gte', fact: FACT_KEYS.experienceMonths, value: 24 },
  remediable: false,
};

const routeOpenCheck = {
  type: 'check',
  id: 'route_open',
  label: label('Route accepts applications'),
  sources: [],
  condition: { op: 'in', fact: FACT_KEYS.routeStatus, value: ['open', 'employer_sponsored'] },
  remediable: false,
};

const allOf = (...nodes: unknown[]) => ({
  type: 'all',
  id: 'root',
  label: label('All requirements'),
  sources: [{ sourceId: 'src_route' }],
  nodes,
});

describe('rule evaluation', () => {
  it('returns eligible when every requirement is satisfied', () => {
    const trace = evaluate(
      [rule(allOf(passportCheck, experienceCheck, routeOpenCheck))],
      buildFactBag({
        hasValidPassport: true,
        experienceMonths: 36,
        routeStatus: 'open',
      }),
    );
    expect(trace.result).toBe('eligible');
    expect(trace.satisfied).toHaveLength(3);
    expect(trace.unsatisfied).toHaveLength(0);
  });

  it('returns unknown — not ineligible — when a fact is missing', () => {
    const trace = evaluate(
      [rule(allOf(passportCheck, experienceCheck))],
      buildFactBag({ hasValidPassport: true }),
    );
    expect(trace.result).toBe('unknown');
    expect(trace.missingFacts.map((f) => f.factKey)).toEqual([FACT_KEYS.experienceMonths]);
  });

  it('prefers a definite false over an unknown sibling in an AND', () => {
    const trace = evaluate(
      [rule(allOf(passportCheck, experienceCheck))],
      buildFactBag({ experienceMonths: 3 }),
    );
    expect(trace.result).toBe('ineligible');
  });

  it('returns conditional when every failure is remediable', () => {
    const trace = evaluate([rule(allOf(passportCheck))], buildFactBag({ hasValidPassport: false }));
    expect(trace.result).toBe('conditional');
    expect(trace.remediable.map((t) => t.nodeId)).toEqual(['passport']);
    expect(trace.remediable[0]?.preparation?.en).toContain('passport');
  });

  it('returns ineligible when at least one failure is not remediable', () => {
    const trace = evaluate(
      [rule(allOf(passportCheck, experienceCheck))],
      buildFactBag({ hasValidPassport: false, experienceMonths: 2 }),
    );
    expect(trace.result).toBe('ineligible');
  });

  it('short-circuits OR to true even when a branch is unknown', () => {
    const anyOf = {
      type: 'any',
      id: 'root',
      label: label('Any accepted language proof'),
      sources: [],
      nodes: [
        {
          type: 'check',
          id: 'ielts',
          label: label('IELTS'),
          sources: [],
          condition: { op: 'includes', fact: FACT_KEYS.languageCertificates, value: 'IELTS' },
          remediable: true,
        },
        {
          type: 'check',
          id: 'goethe',
          label: label('Goethe B1'),
          sources: [],
          condition: { op: 'includes', fact: FACT_KEYS.skillCertificates, value: 'GOETHE_B1' },
          remediable: true,
        },
      ],
    };
    const trace = evaluate([rule(anyOf)], buildFactBag({ languageCertificates: ['IELTS'] }));
    expect(trace.result).toBe('eligible');
  });

  it('propagates unknown through NOT', () => {
    const notNode = {
      type: 'not',
      id: 'root',
      label: label('Must not be over age limit'),
      sources: [],
      node: {
        type: 'check',
        id: 'age',
        label: label('Age above 45'),
        sources: [],
        condition: { op: 'gt', fact: FACT_KEYS.ageYears, value: 45 },
        remediable: false,
      },
    };
    expect(evaluate([rule(notNode)], {}).result).toBe('unknown');
    expect(evaluate([rule(notNode)], buildFactBag({ ageYears: 30 })).result).toBe('eligible');
    expect(evaluate([rule(notNode)], buildFactBag({ ageYears: 50 })).result).toBe('ineligible');
  });

  it('is unknown when no published rule version exists', () => {
    const trace = evaluate([], buildFactBag({ hasValidPassport: true }));
    expect(trace.result).toBe('unknown');
    expect(trace.ruleVersionIds).toEqual([]);
  });

  it('collects deduplicated sources for the explanation', () => {
    const trace = evaluate(
      [rule(allOf(passportCheck, experienceCheck))],
      buildFactBag({ hasValidPassport: true, experienceMonths: 36 }),
    );
    expect(trace.sources.map((s) => s.sourceId).sort()).toEqual(['src_passport', 'src_route']);
  });

  it('never mutates the fact bag', () => {
    const facts = buildFactBag({ hasValidPassport: true, experienceMonths: 36 });
    const snapshot = JSON.stringify(facts);
    evaluate([rule(allOf(passportCheck, experienceCheck))], facts);
    expect(JSON.stringify(facts)).toBe(snapshot);
  });
});

describe('rule version selection', () => {
  const base = { ruleId: 'r', title: label('t'), expression: passportCheck, sourceIds: [] };
  const versions = [
    parseRuleVersion({
      ...base,
      id: 'v1',
      version: 1,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveTo: '2026-01-01T00:00:00.000Z',
      publicationStatus: 'published',
    }),
    parseRuleVersion({
      ...base,
      id: 'v2',
      version: 2,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      publicationStatus: 'published',
    }),
    parseRuleVersion({
      ...base,
      id: 'v3',
      version: 3,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      publicationStatus: 'draft',
    }),
  ];

  it('picks the published version effective at the given time', () => {
    expect(selectEffectiveRuleVersion(versions, new Date('2025-06-01'))?.id).toBe('v1');
    expect(selectEffectiveRuleVersion(versions, new Date('2026-06-01'))?.id).toBe('v2');
  });

  it('never selects a draft, however new it is', () => {
    expect(selectEffectiveRuleVersion(versions, new Date('2026-06-01'))?.id).not.toBe('v3');
  });
});

describe('DSL validation', () => {
  it('rejects a rule node with an unknown operator', () => {
    expect(() =>
      rule({
        type: 'check',
        id: 'x',
        label: label('x'),
        sources: [],
        condition: { op: 'regex', fact: 'a', value: '.*' },
      }),
    ).toThrow();
  });

  it('rejects an empty all-node rather than treating it as vacuously true', () => {
    expect(() =>
      rule({ type: 'all', id: 'x', label: label('x'), sources: [], nodes: [] }),
    ).toThrow();
  });
});
