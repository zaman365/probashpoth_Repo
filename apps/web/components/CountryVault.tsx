import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Badge, Card, Grid, Icon, Section } from '@probash/web-ui';
import { localeSegment, pick, translator } from '@/lib/i18n';
import type { SourceSummary } from '@/components/SourceCitation';

interface LocalizedTextDto {
  bn: string;
  en: string;
}

export interface VaultFact {
  label: LocalizedTextDto;
  value: string | null;
  sourceId: string;
  status: 'researched' | 'needs_verification';
  asOf?: string;
  note?: LocalizedTextDto;
}

export interface VaultPath {
  available: boolean;
  summary: LocalizedTextDto;
  visas: {
    key: string;
    name: LocalizedTextDto;
    who: LocalizedTextDto;
    requirements: LocalizedTextDto[];
    sourceId: string;
  }[];
  keyFacts: VaultFact[];
  steps: LocalizedTextDto[];
  documents: LocalizedTextDto[];
  risks: LocalizedTextDto[];
}

export interface CountryProfileDto {
  countryCode: string;
  verifiedAt: string;
  verifiedBy: string;
  paths: { work: VaultPath; study: VaultPath };
  sources: SourceSummary[];
}

export type VaultPathKey = 'work' | 'study';

export function parseVaultPath(value: string | undefined): VaultPathKey {
  return value === 'study' ? 'study' : 'work';
}

/**
 * §14.1 / §38 — the country vault.
 *
 * Every figure is shown with the source it came from and the year it applied to, and
 * anything we could not confirm is displayed as an open question rather than left out
 * or guessed. That is the difference between this page and the advice a broker gives.
 */
export function CountryVault({
  profile,
  path,
  locale,
  countryName,
  countryCode,
}: {
  profile: CountryProfileDto;
  path: VaultPathKey;
  locale: Locale;
  countryName: string;
  countryCode: string;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const vault = profile.paths[path];
  const sourceById = new Map(profile.sources.map((source) => [source.id, source]));

  const tabs: { key: VaultPathKey; label: string }[] = [
    { key: 'work', label: t('intent.work') },
    { key: 'study', label: t('intent.study') },
  ];

  return (
    <>
      <Section surface="muted" title={t('vault.title', { country: countryName })}>
        <div
          className="intent-switch intent-switch-light"
          role="group"
          aria-label={t('vault.title', { country: countryName })}
        >
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/${seg}/countries/${countryCode.toLowerCase()}?path=${tab.key}`}
              className={`intent-switch-option${path === tab.key ? ' is-selected' : ''}`}
              aria-current={path === tab.key ? 'true' : undefined}
              scroll={false}
            >
              <Icon name={tab.key === 'work' ? 'work' : 'study'} size={20} />
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>

        <p className="pui-lead" style={{ marginBlockStart: 'var(--space-lg)' }}>
          {pick(vault.summary, locale)}
        </p>

        {!vault.available ? <Badge tone="warning">{t('vault.pathNotVerified')}</Badge> : null}
      </Section>

      {vault.available ? (
        <>
          <Section surface="default" title={t('vault.visas')}>
            <Grid min={320}>
              {vault.visas.map((visa) => (
                <Card key={visa.key}>
                  <h3 className="card-title">{pick(visa.name, locale)}</h3>
                  <p className="muted">{pick(visa.who, locale)}</p>
                  <ul className="stack">
                    {visa.requirements.map((requirement) => (
                      <li key={requirement.en}>• {pick(requirement, locale)}</li>
                    ))}
                  </ul>
                  <SourceLine source={sourceById.get(visa.sourceId)} locale={locale} t={t} />
                </Card>
              ))}
            </Grid>
          </Section>

          <Section surface="warm" title={t('vault.keyFacts')} lead={t('vault.keyFactsLead')}>
            <Grid min={320}>
              {vault.keyFacts.map((factEntry) => (
                <Card key={factEntry.label.en} tone={factEntry.value ? 'default' : 'muted'}>
                  <p className="muted">{pick(factEntry.label, locale)}</p>
                  {factEntry.value ? (
                    <p className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                      {factEntry.value}
                    </p>
                  ) : (
                    <Badge tone="warning">{t('vault.notConfirmed')}</Badge>
                  )}
                  {factEntry.asOf ? (
                    <Badge tone="neutral">
                      {t('vault.asOf')}: {factEntry.asOf}
                    </Badge>
                  ) : null}
                  {factEntry.note ? <p>{pick(factEntry.note, locale)}</p> : null}
                  <SourceLine source={sourceById.get(factEntry.sourceId)} locale={locale} t={t} />
                </Card>
              ))}
            </Grid>
          </Section>

          <Section surface="default" title={t('vault.steps')}>
            <ol className="vault-steps">
              {vault.steps.map((step, index) => (
                <li key={step.en}>
                  <span className="vault-step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{pick(step, locale)}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section surface="muted" title={t('vault.documents')}>
            <Grid min={260}>
              {vault.documents.map((document) => (
                <Card key={document.en} tone="default">
                  <span className="flex items-center gap-2">
                    <Icon name="document" size={20} />
                    <span>{pick(document, locale)}</span>
                  </span>
                </Card>
              ))}
            </Grid>
          </Section>

          <Section surface="accent" title={t('vault.risks')}>
            <Grid min={320}>
              {vault.risks.map((risk) => (
                <Card key={risk.en}>
                  <span className="flex items-start gap-2">
                    <Icon name="warning" size={20} />
                    <span>{pick(risk, locale)}</span>
                  </span>
                </Card>
              ))}
            </Grid>
            <p style={{ marginBlockStart: 'var(--space-lg)' }}>
              <Badge tone="warning">{t('cost.payOnlyHere')}</Badge>
            </p>
          </Section>
        </>
      ) : null}
    </>
  );
}

function SourceLine({
  source,
  locale,
  t,
}: {
  source: SourceSummary | undefined;
  locale: Locale;
  t: ReturnType<typeof translator>;
}) {
  if (!source) return null;
  return (
    <a className="muted vault-source" href={source.url} target="_blank" rel="noreferrer noopener">
      {t('verification.officialSource')}: {pick(source.authority, locale)}
    </a>
  );
}
