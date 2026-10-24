// The backend stores long enum strings (e.g. "Strict Jain (No Root Vegetables)").
// The design shows short labels ("Strict Jain"). These maps convert both ways.

function twoWay<T extends string>(pairs: [label: string, value: T][]) {
  const toValue = Object.fromEntries(pairs) as Record<string, T>;
  const toLabel = Object.fromEntries(pairs.map(([l, v]) => [v, l])) as Record<string, string>;
  return {
    labels: pairs.map(([l]) => l),
    value: (label: string) => toValue[label],
    label: (value: string | null | undefined) => (value ? (toLabel[value] ?? value) : ''),
  };
}

export const Gender = twoWay([
  ['Man', 'Male'],
  ['Woman', 'Female'],
]);

export const Marital = twoWay([
  ['Never married', 'Never Married'],
  ['Divorced', 'Divorced'],
  ['Widowed', 'Widowed'],
  ['Awaiting divorce', 'Awaiting Divorce'],
]);

export const Sect = twoWay([
  ['Murtipujak', 'Murtipujak (Deravasi)'],
  ['Sthanakvasi', 'Sthanakvasi'],
  ['Terapanthi', 'Terapanthi'],
  ['Other', 'Other'],
]);

export const SubSect = twoWay([
  ['Oswal', 'Oswal'],
  ['Visa Oswal', 'Visa Oswal'],
  ['Dasa Oswal', 'Dasa Oswal'],
  ['Shrimal', 'Shrimal'],
  ['Visa Shrimal', 'Visa Shrimal'],
  ['Porwal', 'Porwal'],
  ['Khandelwal', 'Khandelwal'],
  ['Humad', 'Humad'],
  ['Nema', 'Nema'],
  ['Agrawal', 'Agrawal'],
  ['No bar', 'Unspecified / No Bar'],
]);
/** The preferences screen shows a shorter sub-sect list. */
export const PREF_SUBSECTS = ['Oswal', 'Visa Oswal', 'Dasa Oswal', 'Shrimal', 'Visa Shrimal', 'Porwal', 'No bar'];

export const Diet = twoWay([
  ['Strict Jain', 'Strict Jain (No Root Vegetables)'],
  ['Chovihar', 'Jain + Regular Chovihar'],
  ['Jain', 'Regular Jain (Vegetarian)'],
  ['Vegan', 'Vegan'],
]);
export const DIET_INFO: Record<string, { desc: string; icon: string }> = {
  'Strict Jain': { desc: 'No root vegetables', icon: 'eco' },
  Chovihar: { desc: 'Nothing after sunset', icon: 'wb_twilight' },
  Jain: { desc: 'Vegetarian, Jain-friendly', icon: 'restaurant' },
  Vegan: { desc: 'No dairy', icon: 'spa' },
};

/** Preferences use "minimum income"; `Any` means no minimum. */
export const Income = twoWay([
  ['₹5–10L', '5 - 10 LPA'],
  ['₹10–20L', '10 - 20 LPA'],
  ['₹20–35L', '20 - 35 LPA'],
  ['₹35–50L', '35 - 50 LPA'],
  ['₹50L+', '50+ LPA'],
]);
export const INCOME_PREF_LABELS = ['Any', ...Income.labels];
export function incomeDisplay(v: string | null | undefined) {
  if (!v) return '';
  const m = v.match(/^(\d+) - (\d+) LPA$/);
  if (m) return `₹${m[1]}–${m[2]} LPA`;
  if (v === '50+ LPA') return '₹50+ LPA';
  if (v === 'Under 5 LPA') return 'Under ₹5 LPA';
  return v;
}

export const Family = twoWay([
  ['Joint', 'Joint Family'],
  ['Nuclear', 'Nuclear Family'],
]);

export const PREF_CITIES = ['Ahmedabad', 'Mumbai', 'Surat', 'Pune', 'Jaipur', 'Bengaluru'];

export const ReportReason = twoWay([
  ['Fake profile', 'Fake / Misleading Profile'],
  ['Inappropriate photos or bio', 'Inappropriate Photos or Bio'],
  ['Harassment', 'Harassment or Abusive Behavior'],
  ['Scam or money request', 'Scam / Financial Request / Spam'],
  ['Already married or engaged', 'Already Married / Engaged'],
  ['Other', 'Other'],
]);

export const KycDoc = twoWay([
  ['Aadhaar', 'Aadhaar Card'],
  ['Passport', 'Passport'],
  ['PAN card', 'PAN Card'],
  ['Voter ID', 'Voter ID'],
]);
export const KYC_DOC_ICON: Record<string, string> = {
  Aadhaar: 'badge',
  Passport: 'travel_explore',
  'PAN card': 'credit_card',
  'Voter ID': 'how_to_vote',
};

/** Short labels for the long education/occupation enums, as the design shows them ("CA", "Doctor"). */
const EDU_SHORT: Record<string, string> = {
  'High School / Diploma': 'Diploma',
  'Bachelors (B.Com / B.Tech / BA / BBA / B.Sc)': 'Bachelors',
  'Masters (MBA / M.Tech / M.Com / MS)': 'Masters',
  'CA / CS / CFA / ICWA': 'CA',
  'Medical (MBBS / MD / BDS / MDS / BAMS)': 'Medical',
  'Law (LLB / LLM)': 'Law',
  'Doctorate / PhD': 'PhD',
};
const OCC_SHORT: Record<string, string> = {
  'Business / Family Business / Entrepreneur': 'Business',
  'Chartered Accountant / Finance / Investment Banking': 'CA',
  'Software Engineer / IT Professional': 'Engineer',
  'Doctor / Healthcare Professional': 'Doctor',
  'Corporate / Management / Consultant': 'Consultant',
  'Lawyer / Legal Professional': 'Lawyer',
  'Government / Civil Services': 'Civil services',
  'Architect / Interior / Fashion Designer': 'Designer',
  'Homemaker / Not Working': 'Homemaker',
  Student: 'Student',
};
export const eduShort = (v?: string | null) => (v ? (EDU_SHORT[v] ?? v) : '');
export const occShort = (v?: string | null) => (v ? (OCC_SHORT[v] ?? v) : '');
