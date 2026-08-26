/**
 * Generates data/iso/countries.json — every ISO 3166-1 alpha-2 territory (§7).
 *
 * Names come from the Node ICU/CLDR data rather than a hand-typed list, so the
 * Bangla names are the same ones the platform will render at runtime. Codes that
 * CLDR knows but ISO 3166-1 does not (EU, UN, XK, …) are excluded explicitly.
 */
import { writeFileSync } from 'node:fs';

const NON_ISO_3166_1 = new Set([
  'EU',
  'EZ',
  'QO',
  'UN',
  'XA',
  'XB',
  'XK',
  'ZZ',
  'AC',
  'CP',
  'DG',
  'EA',
  'IC',
  'TA',
  'SU',
  'AN',
  'BU',
  'CS',
  'DD',
  'FX',
  'NT',
  'QU',
  'YU',
  'ZR',
  // Withdrawn or never-assigned codes CLDR still resolves to a historic name.
  'CQ',
  'DY',
  'HV',
  'NH',
  'RH',
  'TP',
  'UK',
  'VD',
  'YD',
]);

const en = new Intl.DisplayNames(['en'], { type: 'region' });
const bn = new Intl.DisplayNames(['bn'], { type: 'region' });

const codes = [];
for (let a = 65; a <= 90; a += 1) {
  for (let b = 65; b <= 90; b += 1) {
    const code = String.fromCharCode(a) + String.fromCharCode(b);
    if (NON_ISO_3166_1.has(code)) continue;
    let name;
    try {
      name = en.of(code);
    } catch {
      continue;
    }
    if (!name || name === code) continue;
    codes.push({ code, name: { en: name, bn: bn.of(code) ?? name } });
  }
}

codes.sort((x, y) => x.code.localeCompare(y.code));
writeFileSync(
  new URL('./countries.json', import.meta.url),
  `${JSON.stringify({ generatedBy: 'data/iso/generate-countries.mjs', count: codes.length, countries: codes }, null, 2)}\n`,
);
console.log(`wrote ${codes.length} countries`);
