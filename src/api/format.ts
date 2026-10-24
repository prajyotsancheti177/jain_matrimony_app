// Small display helpers shared by the HTTP client and demo data.

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

export function ageFrom(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export function heightLabel(cm: number | null | undefined) {
  if (!cm) return undefined;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chat-list time: "9:38" today, "Tue" this week, "14 Aug" otherwise. */
export function shortTime(at: string | Date | null | undefined) {
  if (!at) return '';
  const d = new Date(at);
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (d.toDateString() === now.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (days < 7) return DAYS[d.getDay()]!;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Just now", "2 hours ago", "Yesterday", "2 days ago", "Last week", "3 weeks ago". */
export function ago(at: string | Date | null | undefined) {
  if (!at) return '';
  const mins = (Date.now() - new Date(at).getTime()) / 60000;
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${Math.round(mins)} minutes ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.round(hrs)} hour${Math.round(hrs) === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return `${Math.floor(days / 7)} weeks ago`;
}

export function dobLabel(iso: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m! - 1]} ${y}`;
}

export function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Keeps digits and a single space after the first five: "98250 43210". */
export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
