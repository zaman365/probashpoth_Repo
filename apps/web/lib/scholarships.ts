import type { MigrationPassport } from '@probash/domain';
import type { Locale, LocalizedText } from '@probash/domain';

export type ScholarshipDegree = 'bachelor' | 'master' | 'phd' | 'research';
export type ScholarshipCycle = 'open' | 'upcoming' | 'closed' | 'institution_specific' | 'verify';
export type ScholarshipMatchState =
  'eligible' | 'near_eligible' | 'not_eligible' | 'deadline_missed' | 'unknown';

export interface ScholarshipRecord {
  id: string;
  name: LocalizedText;
  provider: LocalizedText;
  summary: LocalizedText;
  destinations: string[];
  destinationLabel: LocalizedText;
  degrees: ScholarshipDegree[];
  fields: LocalizedText;
  fundingType: 'full' | 'partial' | 'varies';
  amount: LocalizedText;
  coverage: LocalizedText[];
  applicationWindow: LocalizedText;
  cycle: ScholarshipCycle;
  route: LocalizedText;
  nationality: 'bangladesh' | 'worldwide' | 'non_eea';
  workExperienceMonths?: number;
  requiresLanguageEvidence: boolean;
  requiresResearchProposal?: boolean;
  preparation: LocalizedText[];
  officialUrl: string;
  sourceName: string;
  lastVerified: string;
}

export interface ScholarshipMatchFactor {
  id: string;
  state: 'ready' | 'missing' | 'unknown';
  label: LocalizedText;
  action: LocalizedText;
  hard: boolean;
}

export interface ScholarshipMatch {
  state: ScholarshipMatchState;
  score: number;
  factors: ScholarshipMatchFactor[];
  ready: ScholarshipMatchFactor[];
  missing: ScholarshipMatchFactor[];
  unknown: ScholarshipMatchFactor[];
}

const bnEn = (bn: string, en: string): LocalizedText => ({ bn, en });

export const SCHOLARSHIPS: ScholarshipRecord[] = [
  {
    id: 'daad-master-all-disciplines',
    name: bnEn('DAAD স্টাডি স্কলারশিপ — মাস্টার্স', 'DAAD Study Scholarships — Master Studies'),
    provider: bnEn(
      'জার্মান একাডেমিক এক্সচেঞ্জ সার্ভিস (DAAD)',
      'German Academic Exchange Service (DAAD)',
    ),
    summary: bnEn(
      'জার্মানিতে নির্বাচিত পূর্ণকালীন মাস্টার্স প্রোগ্রামের জন্য স্নাতকদের প্রতিযোগিতামূলক অর্থায়ন।',
      'Competitive funding for graduates pursuing an eligible full-time master’s programme in Germany.',
    ),
    destinations: ['DE'],
    destinationLabel: bnEn('জার্মানি', 'Germany'),
    degrees: ['master'],
    fields: bnEn(
      'সব একাডেমিক ডিসিপ্লিন—নির্দিষ্ট কল অনুযায়ী',
      'All academic disciplines, subject to the specific call',
    ),
    fundingType: 'full',
    amount: bnEn(
      'মাসিক ভাতা, ভ্রমণ সহায়তা ও বীমা; কল অনুযায়ী পরিমাণ',
      'Monthly payment, travel allowance and insurance; amount varies by call',
    ),
    coverage: [
      bnEn('মাসিক জীবনযাত্রার ভাতা', 'Monthly living allowance'),
      bnEn('ভ্রমণ ভাতা', 'Travel allowance'),
      bnEn('স্বাস্থ্য, দুর্ঘটনা ও দায়বদ্ধতা বীমা', 'Health, accident and liability insurance'),
    ],
    applicationWindow: bnEn(
      'বর্তমান কল: ১৬ নভেম্বর ২০২৬ পর্যন্ত',
      'Current call: deadline 16 November 2026',
    ),
    cycle: 'upcoming',
    route: bnEn('DAAD পোর্টালে সরাসরি আবেদন', 'Apply directly through the DAAD portal'),
    nationality: 'worldwide',
    requiresLanguageEvidence: true,
    preparation: [
      bnEn(
        'যোগ্য জার্মান মাস্টার্স প্রোগ্রাম বাছাই করুন',
        'Shortlist eligible German master’s programmes',
      ),
      bnEn(
        'একাডেমিক সিভি ও মোটিভেশন প্রস্তুত করুন',
        'Prepare an academic CV and motivation statement',
      ),
      bnEn(
        'প্রোগ্রামের ভাষা সনদ নিশ্চিত করুন',
        'Confirm the programme-specific language certificate',
      ),
    ],
    officialUrl:
      'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50026200',
    sourceName: 'DAAD Scholarship Database',
    lastVerified: '2026-08-26',
  },
  {
    id: 'erasmus-mundus-joint-masters',
    name: bnEn('ইরাসমাস মুন্ডুস জয়েন্ট মাস্টার্স', 'Erasmus Mundus Joint Masters'),
    provider: bnEn('ইউরোপীয় ইউনিয়ন — Erasmus+', 'European Union — Erasmus+'),
    summary: bnEn(
      'কমপক্ষে তিন প্রতিষ্ঠানের যৌথ আন্তর্জাতিক মাস্টার্স; সেরা র‍্যাঙ্কধারী শিক্ষার্থীদের জন্য পূর্ণ বৃত্তি থাকতে পারে।',
      'Integrated international master’s programmes delivered by multi-university consortia, with full scholarships for top-ranked applicants.',
    ),
    destinations: ['EU'],
    destinationLabel: bnEn('একাধিক ইউরোপীয় দেশ', 'Multiple European countries'),
    degrees: ['master'],
    fields: bnEn(
      'প্রোগ্রাম ক্যাটালগ অনুযায়ী বহুবিষয়ক',
      'Multiple disciplines through the programme catalogue',
    ),
    fundingType: 'full',
    amount: bnEn(
      'অংশগ্রহণ খরচ ও জীবনযাত্রায় সহায়তা',
      'Participation costs and contribution to living costs',
    ),
    coverage: [
      bnEn('প্রোগ্রামে অংশগ্রহণের খরচ', 'Programme participation costs'),
      bnEn('ভ্রমণ ও ভিসা সহায়তা', 'Travel and visa contribution'),
      bnEn('জীবনযাত্রার ভাতা', 'Living allowance'),
    ],
    applicationWindow: bnEn(
      'বেশিরভাগ প্রোগ্রাম: অক্টোবর–জানুয়ারি',
      'Most programmes: October–January',
    ),
    cycle: 'upcoming',
    route: bnEn(
      'নির্বাচিত মাস্টার্স কনসোর্টিয়ামের কাছে সরাসরি আবেদন',
      'Apply directly to the selected master’s consortium',
    ),
    nationality: 'worldwide',
    requiresLanguageEvidence: true,
    preparation: [
      bnEn(
        'অফিসিয়াল ক্যাটালগ থেকে প্রোগ্রাম বাছাই করুন',
        'Choose programmes from the official catalogue',
      ),
      bnEn(
        'প্রতিটি কনসোর্টিয়ামের আলাদা শর্ত মিলিয়ে দেখুন',
        'Match the requirements of each consortium',
      ),
      bnEn(
        'ডিগ্রি শেষ হওয়ার তারিখ ও ভাষার প্রমাণ প্রস্তুত রাখুন',
        'Prepare degree-completion and language evidence',
      ),
    ],
    officialUrl:
      'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',
    sourceName: 'European Commission — Erasmus+',
    lastVerified: '2026-08-26',
  },
  {
    id: 'chevening-scholarship',
    name: bnEn('চেভেনিং স্কলারশিপ', 'Chevening Scholarship'),
    provider: bnEn('যুক্তরাজ্য সরকার', 'UK Government'),
    summary: bnEn(
      'নেতৃত্বের সম্ভাবনাময় পেশাজীবীদের জন্য যুক্তরাজ্যে এক বছরের মাস্টার্স ডিগ্রি।',
      'A one-year UK master’s scholarship for emerging leaders with a strong professional record.',
    ),
    destinations: ['GB'],
    destinationLabel: bnEn('যুক্তরাজ্য', 'United Kingdom'),
    degrees: ['master'],
    fields: bnEn('যোগ্য পূর্ণকালীন মাস্টার্স কোর্স', 'Eligible full-time master’s courses'),
    fundingType: 'full',
    amount: bnEn(
      'টিউশন ও অনুমোদিত জীবনযাত্রা/ভ্রমণ সহায়তা',
      'Tuition and approved living/travel support',
    ),
    coverage: [
      bnEn('যোগ্য টিউশন ফি', 'Eligible tuition fees'),
      bnEn('মাসিক ভাতা', 'Monthly stipend'),
      bnEn('অনুমোদিত ভ্রমণ ও আগমন সহায়তা', 'Approved travel and arrival support'),
    ],
    applicationWindow: bnEn(
      'বর্তমান চক্র বন্ধ; পরবর্তী কল নিশ্চিত করুন',
      'Current cycle closed; confirm the next call',
    ),
    cycle: 'closed',
    route: bnEn(
      'Chevening পোর্টাল এবং তিনটি UK কোর্স পছন্দ',
      'Chevening portal plus three eligible UK course choices',
    ),
    nationality: 'bangladesh',
    workExperienceMonths: 24,
    requiresLanguageEvidence: false,
    preparation: [
      bnEn(
        'স্নাতকের পর অন্তত ২,৮০০ ঘণ্টা অভিজ্ঞতা নথিভুক্ত করুন',
        'Document at least 2,800 post-graduation work hours',
      ),
      bnEn(
        'তিনটি যোগ্য UK মাস্টার্স কোর্স বাছাই করুন',
        'Select three eligible UK master’s courses',
      ),
      bnEn(
        'নেতৃত্ব ও দেশে ফেরার পরিকল্পনার প্রমাণ তৈরি করুন',
        'Build evidence of leadership and a return-home plan',
      ),
    ],
    officialUrl: 'https://www.chevening.org/scholarships/who-can-apply/',
    sourceName: 'Chevening',
    lastVerified: '2026-08-26',
  },
  {
    id: 'mext-japan',
    name: bnEn('জাপান সরকার MEXT স্কলারশিপ', 'Japanese Government MEXT Scholarship'),
    provider: bnEn(
      'জাপানের শিক্ষা, সংস্কৃতি, ক্রীড়া, বিজ্ঞান ও প্রযুক্তি মন্ত্রণালয়',
      'Ministry of Education, Culture, Sports, Science and Technology, Japan',
    ),
    summary: bnEn(
      'এম্বাসি বা বিশ্ববিদ্যালয় সুপারিশের মাধ্যমে স্নাতক, গবেষণা ও অন্যান্য নির্ধারিত শ্রেণির সরকারি বৃত্তি।',
      'Government scholarships for undergraduate, research and other defined categories through embassy or university recommendation.',
    ),
    destinations: ['JP'],
    destinationLabel: bnEn('জাপান', 'Japan'),
    degrees: ['bachelor', 'master', 'phd', 'research'],
    fields: bnEn(
      'স্কলারশিপ শ্রেণি ও গাইডলাইন অনুযায়ী',
      'According to scholarship category and current guidelines',
    ),
    fundingType: 'full',
    amount: bnEn(
      'শ্রেণিভেদে মাসিক ¥১১৭,০০০–¥২৪২,০০০ পর্যন্ত',
      'Monthly ¥117,000–¥242,000 depending on category',
    ),
    coverage: [
      bnEn('টিউশন মওকুফ', 'Tuition exemption'),
      bnEn('মাসিক ভাতা', 'Monthly scholarship'),
      bnEn('যোগ্য ক্ষেত্রে যাওয়া-আসার বিমান ভাড়া', 'Round-trip airfare where applicable'),
    ],
    applicationWindow: bnEn(
      'এম্বাসি/বিশ্ববিদ্যালয়ের বর্তমান গাইডলাইন দেখুন',
      'Check the current embassy or university guidelines',
    ),
    cycle: 'verify',
    route: bnEn(
      'জাপান দূতাবাস বা অনুমোদিত বিশ্ববিদ্যালয়ের সুপারিশ',
      'Embassy recommendation or approved university recommendation',
    ),
    nationality: 'bangladesh',
    requiresLanguageEvidence: false,
    requiresResearchProposal: true,
    preparation: [
      bnEn(
        'নিজের স্তরের বর্তমান MEXT গাইডলাইন পড়ুন',
        'Read the current MEXT guideline for your category',
      ),
      bnEn(
        'এম্বাসি ও বিশ্ববিদ্যালয়—দুই রুটের যোগ্যতা তুলনা করুন',
        'Compare embassy and university recommendation routes',
      ),
      bnEn(
        'গবেষণা আবেদন হলে গবেষণা পরিকল্পনা তৈরি করুন',
        'Prepare a research plan for a research application',
      ),
    ],
    officialUrl: 'https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/',
    sourceName: 'Study in Japan — MEXT',
    lastVerified: '2026-08-26',
  },
  {
    id: 'australia-awards-bangladesh',
    name: bnEn('অস্ট্রেলিয়া অ্যাওয়ার্ডস — বাংলাদেশ', 'Australia Awards — Bangladesh'),
    provider: bnEn('অস্ট্রেলিয়া সরকার', 'Australian Government'),
    summary: bnEn(
      'বাংলাদেশের উন্নয়ন-অগ্রাধিকার সংশ্লিষ্ট বিষয়ে উদীয়মান নেতাদের জন্য পূর্ণকালীন স্নাতকোত্তর বৃত্তি।',
      'Full-time postgraduate awards for emerging Bangladeshi leaders in fields linked to Bangladesh’s development priorities.',
    ),
    destinations: ['AU'],
    destinationLabel: bnEn('অস্ট্রেলিয়া', 'Australia'),
    degrees: ['master', 'research'],
    fields: bnEn(
      '২০২৭ ইনটেকের বাংলাদেশ অগ্রাধিকার ক্ষেত্র',
      'Bangladesh priority fields for the 2027 intake',
    ),
    fundingType: 'full',
    amount: bnEn('পূর্ণ টিউশনসহ নির্ধারিত সহায়তা', 'Full tuition plus specified support'),
    coverage: [
      bnEn('পূর্ণ টিউশন ফি', 'Full tuition fees'),
      bnEn('জীবনযাত্রা ও স্থাপনা ভাতা', 'Living and establishment allowances'),
      bnEn('ভ্রমণ, স্বাস্থ্য কভার ও একাডেমিক সহায়তা', 'Travel, health cover and academic support'),
    ],
    applicationWindow: bnEn(
      '২০২৬ চক্র বন্ধ; ২০২৭ সালের শুরুতে পুনরায় খোলার কথা',
      '2026 cycle closed; expected to reopen in early 2027',
    ),
    cycle: 'closed',
    route: bnEn(
      'Australia Awards Bangladesh পোর্টালে আবেদন',
      'Apply through the Australia Awards Bangladesh portal',
    ),
    nationality: 'bangladesh',
    workExperienceMonths: 24,
    requiresLanguageEvidence: true,
    preparation: [
      bnEn(
        'বাংলাদেশের যোগ্য কর্মী-শ্রেণি ও অগ্রাধিকার ক্ষেত্র নিশ্চিত করুন',
        'Confirm the eligible employment group and priority field',
      ),
      bnEn(
        'Development Impact and Linkages Plan প্রস্তুত করুন',
        'Prepare the Development Impact and Linkages Plan',
      ),
      bnEn(
        'ভাষা, রেফারি ও চাকরির প্রমাণ প্রস্তুত করুন',
        'Prepare language, referee and employment evidence',
      ),
    ],
    officialUrl: 'https://australiaawardsbangladesh.org/opportunities/',
    sourceName: 'Australia Awards Bangladesh',
    lastVerified: '2026-08-26',
  },
  {
    id: 'fulbright-foreign-student',
    name: bnEn('ফুলব্রাইট ফরেন স্টুডেন্ট প্রোগ্রাম', 'Fulbright Foreign Student Program'),
    provider: bnEn('যুক্তরাষ্ট্রের পররাষ্ট্র দপ্তর', 'U.S. Department of State'),
    summary: bnEn(
      'বিদেশি স্নাতক শিক্ষার্থী, তরুণ পেশাজীবী ও শিল্পীদের যুক্তরাষ্ট্রে পড়াশোনা ও গবেষণার সুযোগ।',
      'Study and research opportunities in the United States for graduate students, young professionals and artists from abroad.',
    ),
    destinations: ['US'],
    destinationLabel: bnEn('যুক্তরাষ্ট্র', 'United States'),
    degrees: ['master', 'research'],
    fields: bnEn('দেশভিত্তিক কল অনুযায়ী', 'According to the country-specific call'),
    fundingType: 'varies',
    amount: bnEn('দেশভেদে শর্ত ও সুবিধা আলাদা', 'Benefits and conditions vary by country'),
    coverage: [
      bnEn('স্নাতকোত্তর অধ্যয়ন বা গবেষণা', 'Graduate study or research'),
      bnEn('দেশভিত্তিক নির্ধারিত সহায়তা', 'Country-specific support package'),
      bnEn('Fulbright নেটওয়ার্ক ও একাডেমিক সহায়তা', 'Fulbright network and academic support'),
    ],
    applicationWindow: bnEn(
      'বাংলাদেশের বর্তমান কল আলাদাভাবে নিশ্চিত করুন',
      'Confirm the current Bangladesh call separately',
    ),
    cycle: 'verify',
    route: bnEn(
      'বাংলাদেশে US Embassy/Fulbright পরিচালিত প্রক্রিয়া',
      'Country process administered through the U.S. Embassy/Fulbright office',
    ),
    nationality: 'bangladesh',
    requiresLanguageEvidence: true,
    preparation: [
      bnEn(
        'বাংলাদেশের বর্তমান প্রোগ্রাম নির্দেশনা দেখুন',
        'Check the current Bangladesh programme guidance',
      ),
      bnEn(
        'একাডেমিক উদ্দেশ্য ও ব্যক্তিগত বিবৃতি প্রস্তুত করুন',
        'Prepare academic objectives and a personal statement',
      ),
      bnEn(
        'রেফারেন্স, ট্রান্সক্রিপ্ট ও পরীক্ষার প্রমাণ সংগ্রহ করুন',
        'Collect references, transcripts and test evidence',
      ),
    ],
    officialUrl: 'https://foreign.fulbrightonline.org/about/foreign-student-program',
    sourceName: 'Foreign Fulbright Program',
    lastVerified: '2026-08-26',
  },
  {
    id: 'nl-scholarship',
    name: bnEn('NL স্কলারশিপ', 'NL Scholarship'),
    provider: bnEn(
      'ডাচ শিক্ষা মন্ত্রণালয় ও অংশগ্রহণকারী প্রতিষ্ঠান',
      'Dutch Ministry of Education and participating institutions',
    ),
    summary: bnEn(
      'নন-EEA আন্তর্জাতিক শিক্ষার্থীদের জন্য অংশগ্রহণকারী ডাচ প্রতিষ্ঠানে স্নাতক বা মাস্টার্সের প্রথম বছরের আংশিক বৃত্তি।',
      'A first-year contribution for non-EEA students entering bachelor’s or master’s study at participating Dutch institutions.',
    ),
    destinations: ['NL'],
    destinationLabel: bnEn('নেদারল্যান্ডস', 'Netherlands'),
    degrees: ['bachelor', 'master'],
    fields: bnEn(
      'অংশগ্রহণকারী প্রতিষ্ঠান ও প্রোগ্রাম অনুযায়ী',
      'According to participating institution and programme',
    ),
    fundingType: 'partial',
    amount: bnEn('প্রথম বছরে €৫,০০০; পূর্ণ টিউশন নয়', '€5,000 in the first year; not full tuition'),
    coverage: [
      bnEn('প্রথম বছরের €৫,০০০ অবদান', '€5,000 first-year contribution'),
      bnEn(
        'প্রতিষ্ঠানভেদে অতিরিক্ত বৃত্তির সম্ভাবনা',
        'Possible additional institution-specific awards',
      ),
      bnEn(
        'অবশিষ্ট টিউশন ও জীবনযাত্রার ঘাটতি নিজে পরিকল্পনা করতে হবে',
        'Remaining tuition and living gap must be planned separately',
      ),
    ],
    applicationWindow: bnEn(
      'প্রতিষ্ঠানভেদে নির্দিষ্ট ডেডলাইন',
      'Specific deadline set by each institution',
    ),
    cycle: 'institution_specific',
    route: bnEn(
      'অংশগ্রহণকারী প্রতিষ্ঠানের মাধ্যমে আবেদন',
      'Apply through a participating institution',
    ),
    nationality: 'non_eea',
    requiresLanguageEvidence: true,
    preparation: [
      bnEn(
        '২০২৬–২৭ অংশগ্রহণকারী প্রতিষ্ঠান নিশ্চিত করুন',
        'Confirm a participating institution for 2026–27',
      ),
      bnEn(
        'প্রোগ্রাম ভর্তি এবং স্কলারশিপের আলাদা ডেডলাইন দেখুন',
        'Track separate programme and scholarship deadlines',
      ),
      bnEn(
        '€৫,০০০-এর বাইরে পূর্ণ ফান্ডিং ঘাটতি হিসাব করুন',
        'Calculate the full funding gap beyond €5,000',
      ),
    ],
    officialUrl: 'https://www.studyinnl.org/finances/nl-scholarship',
    sourceName: 'Study in NL',
    lastVerified: '2026-08-26',
  },
];

const educationRank: Record<NonNullable<MigrationPassport['education']['highestLevel']>, number> = {
  secondary: 1,
  higher_secondary: 2,
  diploma: 3,
  bachelor: 4,
  master: 5,
  doctorate: 6,
};

function stateFromBoolean(value: boolean | undefined): 'ready' | 'missing' | 'unknown' {
  return value === undefined ? 'unknown' : value ? 'ready' : 'missing';
}

function factor(
  id: string,
  state: ScholarshipMatchFactor['state'],
  label: LocalizedText,
  action: LocalizedText,
  hard = false,
): ScholarshipMatchFactor {
  return { id, state, label, action, hard };
}

function priorEducationState(passport: MigrationPassport, _scholarship: ScholarshipRecord) {
  const target = passport.study.target;
  const highest = passport.education.highestLevel;
  if (!target || target === 'unsure' || !highest) return 'unknown' as const;
  const required = target === 'bachelor' ? 2 : target === 'master' ? 4 : 5;
  return educationRank[highest] >= required ? ('ready' as const) : ('missing' as const);
}

export function evaluateScholarship(
  scholarship: ScholarshipRecord,
  passport?: MigrationPassport,
): ScholarshipMatch {
  if (!passport) {
    return { state: 'unknown', score: 0, factors: [], ready: [], missing: [], unknown: [] };
  }

  const target = passport.study.target;
  const targetState =
    !target || target === 'unsure'
      ? 'unknown'
      : scholarship.degrees.includes(target)
        ? 'ready'
        : 'missing';
  const documentsReady =
    passport.education.hasCertificates === undefined ||
    passport.education.hasTranscripts === undefined
      ? 'unknown'
      : passport.education.hasCertificates && passport.education.hasTranscripts
        ? 'ready'
        : 'missing';
  const languageReady = scholarship.requiresLanguageEvidence
    ? stateFromBoolean(passport.language.hasVerifiedTest)
    : passport.language.englishLevel
      ? 'ready'
      : 'unknown';
  const experienceReady = scholarship.workExperienceMonths
    ? passport.professional.experienceMonths === undefined
      ? 'unknown'
      : passport.professional.experienceMonths >= scholarship.workExperienceMonths
        ? 'ready'
        : 'missing'
    : 'ready';
  const nationalityReady = scholarship.nationality === 'worldwide' ? 'ready' : 'unknown';
  const researchReady =
    scholarship.requiresResearchProposal && target === 'phd'
      ? stateFromBoolean(passport.study.hasResearchProposal)
      : 'ready';

  const factors = [
    factor(
      'target',
      targetState,
      bnEn('লক্ষ্য ডিগ্রির সঙ্গে মিল', 'Target degree match'),
      bnEn(
        'স্টুডেন্ট পাসপোর্টে লক্ষ্য ডিগ্রি ঠিক করুন।',
        'Confirm the target degree in your Student Passport.',
      ),
      true,
    ),
    factor(
      'education',
      priorEducationState(passport, scholarship),
      bnEn('পূর্ববর্তী শিক্ষাগত যোগ্যতা', 'Prior academic qualification'),
      bnEn(
        'সর্বোচ্চ ডিগ্রি ও ফলাফলের প্রমাণ আপডেট করুন।',
        'Update the highest degree and evidence of results.',
      ),
      true,
    ),
    factor(
      'documents',
      documentsReady,
      bnEn('সনদ ও ট্রান্সক্রিপ্ট', 'Certificates and transcripts'),
      bnEn(
        'সনদ ও সম্পূর্ণ ট্রান্সক্রিপ্ট প্রস্তুত করুন।',
        'Prepare certificates and complete transcripts.',
      ),
    ),
    factor(
      'language',
      languageReady,
      bnEn('ভাষা বা টেস্টের প্রমাণ', 'Language or test evidence'),
      bnEn(
        'প্রোগ্রাম যে টেস্ট ও স্কোর গ্রহণ করে তা নিশ্চিত করুন।',
        'Confirm the test and score accepted by the programme.',
      ),
    ),
    factor(
      'experience',
      experienceReady,
      bnEn('প্রয়োজনীয় কাজের অভিজ্ঞতা', 'Required work experience'),
      bnEn(
        `স্নাতকের পর অন্তত ${scholarship.workExperienceMonths ?? 0} মাসের অভিজ্ঞতা প্রমাণ করুন।`,
        `Document at least ${scholarship.workExperienceMonths ?? 0} months of post-graduation experience.`,
      ),
      Boolean(scholarship.workExperienceMonths),
    ),
    factor(
      'nationality',
      nationalityReady,
      bnEn('নাগরিকত্ব/আবেদনকারী দেশের শর্ত', 'Nationality and applicant-country rule'),
      bnEn(
        'বর্তমান কলের বাংলাদেশ-সংক্রান্ত শর্ত নিশ্চিত করুন।',
        'Confirm Bangladesh-specific eligibility in the current call.',
      ),
      scholarship.nationality === 'bangladesh',
    ),
    factor(
      'research',
      researchReady,
      bnEn('গবেষণা পরিকল্পনা', 'Research plan'),
      bnEn(
        'প্রস্তাবিত গবেষণা, পদ্ধতি ও তত্ত্বাবধায়ক ফিট লিখুন।',
        'Prepare the proposed research, method and supervisor fit.',
      ),
    ),
  ].filter((item) => !(item.id === 'experience' && !scholarship.workExperienceMonths));

  const ready = factors.filter((item) => item.state === 'ready');
  const missing = factors.filter((item) => item.state === 'missing');
  const unknown = factors.filter((item) => item.state === 'unknown');
  const score = Math.round((ready.length / factors.length) * 100);
  const hardMissing = missing.some((item) => item.hard);
  const state: ScholarshipMatchState =
    scholarship.cycle === 'closed'
      ? 'deadline_missed'
      : hardMissing
        ? 'not_eligible'
        : missing.length > 0
          ? 'near_eligible'
          : unknown.length > 0
            ? 'unknown'
            : 'eligible';

  return { state, score, factors, ready, missing, unknown };
}

export function scholarshipById(id: string): ScholarshipRecord | undefined {
  return SCHOLARSHIPS.find((scholarship) => scholarship.id === id);
}

export function scholarshipText(text: LocalizedText, locale: Locale): string {
  return locale === 'en' ? text.en : text.bn;
}

export function scholarshipCountries(): string[] {
  return [...new Set(SCHOLARSHIPS.flatMap((scholarship) => scholarship.destinations))].sort();
}
