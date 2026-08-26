'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@probash/web-ui';

const STORAGE_KEY = 'probash-scholarship-readiness-v1';

export function ScholarshipReadinessChecklist({
  items,
  labels,
  passportHref,
}: {
  items: string[];
  labels: {
    title: string;
    lead: string;
    progress: string;
    passport: string;
  };
  passportHref: string;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
      if (Array.isArray(saved)) {
        setChecked(items.map((_, index) => saved[index] === true));
      }
    } catch {
      // A blocked or invalid local store should not prevent the checklist from working.
    }
  }, [items]);

  const done = useMemo(() => checked.filter(Boolean).length, [checked]);
  const percent = Math.round((done / items.length) * 100);
  const progressLabel = labels.progress
    .replaceAll('{done}', String(done))
    .replaceAll('{total}', String(items.length));

  function toggle(index: number) {
    setChecked((current) => {
      const next = current.map((value, itemIndex) => (itemIndex === index ? !value : value));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The visible state still works when storage is unavailable.
      }
      return next;
    });
  }

  return (
    <section className="scholarship-checklist" aria-labelledby="scholarship-checklist-title">
      <header>
        <div>
          <span className="scholarship-step-mark">
            <Icon name="check" size={20} />
          </span>
          <div>
            <h2 id="scholarship-checklist-title">{labels.title}</h2>
            <p>{labels.lead}</p>
          </div>
        </div>
        <strong>{progressLabel}</strong>
      </header>
      <div className="scholarship-checklist-progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="scholarship-checklist-items">
        {items.map((item, index) => (
          <label key={item} className={checked[index] ? 'complete' : undefined}>
            <input type="checkbox" checked={checked[index]} onChange={() => toggle(index)} />
            <span className="scholarship-check">
              {checked[index] ? <Icon name="check" size={15} /> : index + 1}
            </span>
            <span>{item}</span>
          </label>
        ))}
      </div>
      <Link href={passportHref} className="scholarship-checklist-link">
        {labels.passport} <Icon name="arrow" size={18} />
      </Link>
    </section>
  );
}
