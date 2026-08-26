'use client';

import { useMemo, useState } from 'react';
import type { Locale, MigrationPassport } from '@probash/domain';
import { translator } from '@/lib/i18n';

function present(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

export function MaterialsWorkbench({
  locale,
  passport,
}: {
  locale: Locale;
  passport: MigrationPassport;
}) {
  const t = translator(locale);
  const [format, setFormat] = useState('standard');
  const [statement, setStatement] = useState('');

  const cv = useMemo(() => {
    const lines = [
      t('materials.cvDraftTitle'),
      '',
      `${t('materials.cvTarget')}: ${present(passport.education.field) ?? t('materials.notProvided')}`,
      `${t('materials.cvExperience')}: ${present(passport.professional.experienceMonths) ?? t('materials.notProvided')}`,
      `${t('materials.cvEducation')}: ${present(passport.education.highestLevel) ?? t('materials.notProvided')}`,
      `${t('materials.cvLanguage')}: ${present(passport.language.englishLevel) ?? t('materials.notProvided')}`,
      `${t('materials.cvEvidence')}: ${passport.professional.hasExperienceEvidence ? t('common.yes') : t('materials.notProvided')}`,
      '',
      t(`materials.formatNote.${format}`),
      t('materials.cvBoundary'),
    ];
    return lines.join('\n');
  }, [format, passport, t]);

  const analysis = useMemo(() => {
    const normalized = statement.toLowerCase();
    const wordCount = statement.trim() ? statement.trim().split(/\s+/u).length : 0;
    const checks = [
      ['motivation', /motivat|কারণ|কেন|interest|আগ্রহ/u],
      ['academic', /academic|study|degree|cgpa|শিক্ষা|ডিগ্রি|পড়াশোনা/u],
      ['evidence', /project|research|work|experience|প্রকল্প|গবেষণা|অভিজ্ঞতা/u],
      ['fit', /program|course|university|প্রোগ্রাম|কোর্স|বিশ্ববিদ্যাল/u],
      ['goal', /goal|career|future|লক্ষ্য|ক্যারিয়ার|ভবিষ্যৎ/u],
    ] as const;
    const riskyClaims = /guarantee|guaranteed|100%|নিশ্চিত|শতভাগ|visa will|ভিসা পাব/u.test(
      normalized,
    );
    return {
      wordCount,
      checks: checks.map(([key, pattern]) => ({ key, present: pattern.test(normalized) })),
      riskyClaims,
    };
  }, [statement]);

  return (
    <div className="materials-grid">
      <section className="card stack">
        <p className="eyebrow">{t('materials.workEyebrow')}</p>
        <h2 className="card-title">{t('materials.cvTitle')}</h2>
        <p>{t('materials.cvLead')}</p>
        <label>
          <span>{t('materials.cvFormat')}</span>
          <select
            className="field"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="standard">{t('materials.format.standard')}</option>
            <option value="skills">{t('materials.format.skills')}</option>
            <option value="trade">{t('materials.format.trade')}</option>
            <option value="europe">{t('materials.format.europe')}</option>
          </select>
        </label>
        <textarea
          className="field materials-output"
          rows={14}
          readOnly
          value={cv}
          aria-label={t('materials.cvDraftTitle')}
        />
        <p className="badge badge-warning">{t('materials.cvBoundary')}</p>
      </section>

      <section className="card stack">
        <p className="eyebrow">{t('materials.studyEyebrow')}</p>
        <h2 className="card-title">{t('materials.statementTitle')}</h2>
        <p>{t('materials.statementLead')}</p>
        <label>
          <span>{t('materials.statementLabel')}</span>
          <textarea
            className="field"
            rows={12}
            maxLength={12000}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
          />
        </label>
        <div className="materials-score">
          <strong>{analysis.wordCount}</strong>
          <span>{t('materials.words')}</span>
        </div>
        <ul className="materials-checks">
          {analysis.checks.map((check) => (
            <li key={check.key} className={check.present ? 'is-present' : undefined}>
              <span aria-hidden="true">{check.present ? '✓' : '○'}</span>
              {t(`materials.section.${check.key}`)}
            </li>
          ))}
        </ul>
        {analysis.riskyClaims ? (
          <p className="badge badge-danger">{t('materials.unsupportedWarning')}</p>
        ) : null}
        <p className="muted">{t('materials.statementPrivacy')}</p>
      </section>
    </div>
  );
}
