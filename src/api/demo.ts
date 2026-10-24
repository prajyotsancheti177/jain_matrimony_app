// Demo data source: the sample members and conversations from the design, kept in memory.
// Used when EXPO_PUBLIC_API_URL is not set, so the app can be reviewed without a running backend.

import { Asset } from 'expo-asset';
import { ageFrom, firstName, initials } from './format';
import type { Api, Conversation, Me, Message, PhotoRequest, Prefs, Profile, ReceivedInterest, Score, SentInterest } from './types';

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const asset = (m: number) => Asset.fromModule(m).uri;
const AARAV = [asset(require('../../assets/demo/aarav-1.jpeg')), asset(require('../../assets/demo/aarav-2.jpeg'))];

type Row = [label: string, pts: number, max: number, why: string];
const KEYS = ['sect', 'subSect', 'diet', 'age', 'location'] as const;
const score = (rows: Row[]): Score => ({
  total: rows.reduce((a, r) => a + r[1], 0),
  rows: rows.map(([label, pts, max, why], i) => ({ key: KEYS[i]!, label, pts, max, why })),
});

function person(p: Omit<Profile, 'first' | 'initials'>): Profile {
  return { ...p, first: firstName(p.name), initials: initials(p.name) };
}

const MEMBERS: Profile[] = [
  person({
    id: 'm1', name: 'Priya Shah', age: 27, height: '5′4″', city: 'Ahmedabad, Gujarat', cityShort: 'Ahmedabad', state: 'Gujarat',
    sect: 'Murtipujak', subSect: 'Visa Oswal', diet: 'Strict Jain', occupation: 'CA', education: 'CA', income: '₹20–35 LPA',
    marital: 'Never married', family: 'Joint', verified: true, photos: [], photosLocked: true, photoRequest: null, photo: null,
    bio: 'Chartered accountant at our family firm. Navkarshi most mornings, evening walks by the Sabarmati. Looking for someone close to family and faith.',
    hobbies: ['Travel', 'Reading', 'Garba', 'Yoga'],
    details: { languages: 'Gujarati, Hindi, English', gotra: 'Kothari', native: 'Palitana', mosal: 'Mehta, Bhavnagar', father: 'Rajesh Shah, diamonds', mother: 'Meena Shah, homemaker', siblings: '1 brother, married', tob: '6:42 AM', pob: 'Ahmedabad' },
    score: score([['Sect', 25, 25, 'Both Murtipujak'], ['Sub-sect', 20, 20, 'Visa Oswal is on your list'], ['Diet', 20, 25, 'Strict Jain and Chovihar fit'], ['Age', 15, 15, '27, inside your 25–30'], ['Location', 15, 15, 'Same city']]),
  }),
  person({
    id: 'm2', name: 'Neha Jain', age: 26, height: '5′2″', city: 'Mumbai, Maharashtra', cityShort: 'Mumbai', state: 'Maharashtra',
    sect: 'Sthanakvasi', subSect: 'Oswal', diet: 'Chovihar', occupation: 'Doctor', education: 'MBBS, MD', income: '₹10–20 LPA',
    marital: 'Never married', family: 'Nuclear', verified: true, photos: [], photosLocked: false, photoRequest: 'Approved', photo: null,
    bio: 'Paediatric resident in Mumbai. Chovihar since college, early riser, bakes eggless everything on weekends.',
    hobbies: ['Baking', 'Classical music', 'Treks'],
    details: { languages: 'Marwari, Hindi, English', gotra: 'Bafna', native: 'Jodhpur', mosal: 'Bhandari, Pali', father: 'Sunil Jain, textiles', mother: 'Kavita Jain, teacher', siblings: '1 sister', tob: '11:15 PM', pob: 'Jodhpur' },
    score: score([['Sect', 15, 25, 'Sthanakvasi, a close branch'], ['Sub-sect', 15, 20, 'Oswal, same lineage'], ['Diet', 20, 25, 'Chovihar and Strict Jain fit'], ['Age', 15, 15, '26, inside your 25–30'], ['Location', 15, 15, 'Mumbai is on your list']]),
  }),
  person({
    id: 'm3', name: 'Kavya Mehta', age: 28, height: '5′6″', city: 'Jaipur, Rajasthan', cityShort: 'Jaipur', state: 'Rajasthan',
    sect: 'Terapanthi', subSect: 'No bar', diet: 'Jain', occupation: 'Engineer', education: 'M.Tech', income: '₹35–50 LPA',
    marital: 'Never married', family: 'Nuclear', verified: false, photos: [], photosLocked: true, photoRequest: null, photo: null,
    bio: 'Product engineer, works remotely. Teaches at the Sangh pathshala on Sundays. Open to moving.',
    hobbies: ['Pathshala', 'Cycling', 'Podcasts'],
    details: { languages: 'Hindi, English', gotra: 'Dugar', native: 'Sardarshahar', mosal: 'Surana, Bikaner', father: 'Vinod Mehta, gems', mother: 'Sarita Mehta, homemaker', siblings: '2 brothers', tob: 'Not shared', pob: 'Jaipur' },
    score: score([['Sect', 15, 25, 'Terapanthi, a close branch'], ['Sub-sect', 20, 20, 'Open to all sub-sects'], ['Diet', 15, 25, 'Jain diet fits'], ['Age', 15, 15, '28, inside your 25–30'], ['Location', 5, 15, 'Different state']]),
  }),
];

const sum = (name: string, id: string) => ({ id, name, first: firstName(name), initials: initials(name), photo: null });

export class DemoApi implements Api {
  readonly demo = true;
  private me: Me = {
    id: 'me', name: 'Aarav Shah', phone: '+91 98250 43210', age: 29, dob: '1997-03-02', gender: 'Man', marital: 'Never married',
    sect: 'Murtipujak', subSect: 'Visa Oswal', diet: 'Strict Jain', photos: AARAV, photosLocked: true, kycStatus: 'Unsubmitted', kycDoc: '', completeness: 80,
  };
  private prefs: Prefs = {
    minAge: 25, maxAge: 30, marital: ['Never married'], sect: ['Murtipujak', 'Sthanakvasi'], subSect: ['Oswal', 'Visa Oswal', 'Dasa Oswal'],
    diet: ['Strict Jain', 'Chovihar'], minIncome: '₹10–20L', family: ['Joint', 'Nuclear'], cities: ['Ahmedabad', 'Mumbai', 'Surat'],
  };
  private blocked = new Set<string>();
  private sentTo = new Map<string, boolean>();
  private received: ReceivedInterest[] = [
    { id: 'r1', from: { ...sum('Neha Jain', 'm2'), age: 26, meta: 'Sthanakvasi · Mumbai' }, score: 80, status: 'pending', grant: true, note: 'Jai Jinendra! My parents saw your profile at the Sangh meet. Would love to talk.' },
    { id: 'r2', from: { ...sum('Riya Kothari', 'u-riya'), age: 25, meta: 'Murtipujak · Surat' }, score: 88, status: 'pending', grant: false, note: 'Our families are both from Palitana. Want to connect?' },
  ];
  private sent: SentInterest[] = [
    { id: 's1', to: sum('Kavya Mehta', 'm3'), when: '2 days ago', status: 'Waiting', grant: false },
    { id: 's2', to: sum('Isha Doshi', 'u-isha'), when: 'Last week', status: 'Accepted', grant: true },
    { id: 's3', to: sum('Anjali Parekh', 'u-anjali'), when: '3 weeks ago', status: 'Declined', grant: false },
  ];
  private photoReqs: PhotoRequest[] = [
    { id: 'p1', from: sum('Neha Jain', 'm2'), when: '2 hours ago', status: 'pending' },
    { id: 'p2', from: sum('Mitali Sanghvi', 'u-mitali'), when: 'Yesterday', status: 'approved' },
  ];
  private convs: Conversation[] = [
    { id: 'c1', other: sum('Isha Doshi', 'u-isha'), last: 'Sunday after 6 works for both families.', time: '9:38', unread: 2, active: true },
    { id: 'c2', other: sum('Pooja Bothra', 'u-pooja'), last: 'Thank you. Jai Jinendra.', time: 'Tue', unread: 0, active: true },
  ];
  private msgs: Record<string, Message[]> = {
    c1: [
      ['Jai Jinendra, Aarav.', false],
      ['Jai Jinendra! My mother liked that your family is from Palitana.', true],
      ['Ha. Would your parents be free for a call this weekend?', false],
      ['Yes. Sunday after 6?', true, true],
      ['Sunday after 6 works for both families.', false],
    ].map(([text, mine, read], i) => ({ id: `c1-${i}`, text: text as string, mine: !!mine, at: new Date(Date.now() - (5 - i) * 60000).toISOString(), read: !!read || !mine })),
    c2: [{ id: 'c2-0', text: 'Thank you. Jai Jinendra.', mine: false, at: new Date(Date.now() - 4 * 86400000).toISOString(), read: true }],
  };
  private listeners = new Map<string, Set<(m: Message) => void>>();

  async sendOtp() { await wait(); }
  async verifyOtp(_phone: string, otp: string) {
    await wait();
    if (!/^\d{6}$/.test(otp)) throw new Error('Enter the 6-digit code');
    return { isNewUser: true, isProfileComplete: false };
  }
  async logout() { await wait(100); }

  async getMe() { await wait(100); return { ...this.me, age: ageFrom(this.me.dob) }; }
  async updateMe(p: Parameters<Api['updateMe']>[0]) { await wait(); this.me = { ...this.me, ...p }; return this.getMe(); }
  async uploadPhoto(file: { uri: string }) { await wait(600); return file.uri; }
  async exportData() { await wait(); return { profile: this.me, preferences: this.prefs }; }
  async deleteAccount() { await wait(); }

  async getPrefs() { await wait(100); return structuredClone(this.prefs); }
  async savePrefs(p: Prefs) { await wait(); this.prefs = structuredClone(p); }

  async matches(filter: Parameters<Api['matches']>[0]) {
    await wait();
    return MEMBERS.filter((m) => !this.blocked.has(m.id)).filter((m) =>
      filter === 'Verified' ? m.verified : filter === 'Strict Jain' ? m.diet === 'Strict Jain' : filter === 'Gujarat' ? m.state === 'Gujarat' : filter === 'Nearby' ? m.cityShort === 'Ahmedabad' : true,
    );
  }
  async profile(id: string) {
    await wait(150);
    const m = MEMBERS.find((x) => x.id === id);
    if (!m || this.blocked.has(id)) throw new Error('Profile not available');
    return m;
  }
  async score(id: string) { return (await this.profile(id)).score!; }

  async receivedInterests() { await wait(); return this.received.map((r) => ({ ...r })); }
  async sentInterests() {
    await wait();
    const fresh: SentInterest[] = [...this.sentTo].map(([id, grant]) => {
      const m = MEMBERS.find((x) => x.id === id)!;
      return { id: `n_${id}`, to: sum(m.name, id), when: 'Just now', status: 'Waiting', grant };
    });
    return [...fresh.reverse(), ...this.sent.map((s) => ({ ...s }))];
  }
  async sendInterest(id: string, _note: string, grant: boolean) { await wait(); this.sentTo.set(id, grant); }
  async respondInterest(id: string, accept: boolean) {
    await wait();
    const r = this.received.find((x) => x.id === id)!;
    r.status = accept ? 'accepted' : 'declined';
    if (!accept) return { conversationId: null };
    const cid = `r_${id}`;
    this.convs.unshift({ id: cid, other: { ...r.from }, last: 'Say Jai Jinendra', time: 'Now', unread: 0, active: true });
    this.msgs[cid] = [];
    return { conversationId: cid };
  }
  async setInterestPhotoAccess(id: string, grant: boolean) {
    const s = this.sent.find((x) => x.id === id);
    if (s) s.grant = grant;
    else if (id.startsWith('n_')) this.sentTo.set(id.slice(2), grant);
  }

  async requestPhotos(id: string) { await wait(); const m = MEMBERS.find((x) => x.id === id); if (m) m.photoRequest = 'Pending'; }
  async photoRequests() { await wait(); return this.photoReqs.map((r) => ({ ...r })); }
  async respondPhotoRequest(id: string, status: PhotoRequest['status']) { await wait(150); this.photoReqs.find((r) => r.id === id)!.status = status; }

  async block(id: string) {
    await wait();
    this.blocked.add(id);
    this.convs = this.convs.filter((c) => c.id !== id && c.other.id !== id);
  }
  async report(id: string, _reason: string, alsoBlock: boolean) { await wait(); if (alsoBlock) await this.block(id); }
  async blockedCount() { return this.blocked.size || 1; }

  async conversations() { await wait(); return this.convs.filter((c) => !this.blocked.has(c.other.id)).map((c) => ({ ...c })); }
  async messages(id: string) { await wait(100); return [...(this.msgs[id] ?? [])]; }
  async sendMessage(id: string, text: string) {
    await wait(150);
    const m: Message = { id: `${id}-${Date.now()}`, text, mine: true, at: new Date().toISOString(), read: false };
    (this.msgs[id] ??= []).push(m);
    const c = this.convs.find((x) => x.id === id);
    if (c) Object.assign(c, { last: text, time: 'Now' });
    return m;
  }
  async markRead(id: string) { const c = this.convs.find((x) => x.id === id); if (c) c.unread = 0; }
  subscribe(id: string, cb: (m: Message) => void) {
    const set = this.listeners.get(id) ?? new Set();
    set.add(cb);
    this.listeners.set(id, set);
    return () => set.delete(cb);
  }

  async kyc() { await wait(100); return { status: this.me.kycStatus, doc: this.me.kycDoc }; }
  async submitKyc(doc: string) { await wait(600); this.me.kycStatus = 'Pending'; this.me.kycDoc = doc; }
}
