// Client for the NestJS backend (Rushabh2397/jain_matrimony_backend).
// Converts backend entities into the app models in ./types.

import { io, type Socket } from 'socket.io-client';
import { File as ExpoFile } from 'expo-file-system';
import { completeness } from './completeness';
import * as E from './enums';
import { ageFrom, ago, firstName, heightLabel, initials, shortTime } from './format';
import { loadTokens, saveTokens, userIdFromToken, type Tokens } from './tokens';
import type { Api, BlockedPerson, Conversation, LocalFile, Me, Message, PersonSummary, Prefs, Profile, ProfileForm, Score, SentPhotoRequest } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Called when the session can no longer be refreshed, so the app can return to the welcome screen. */
let onSignedOut: () => void = () => {};
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

// --- Backend shapes (only the fields the app reads) ---
type BUser = {
  id: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string | null;
  /** The matches feed returns age instead of dateOfBirth. */
  age?: number | null;
  gender?: string | null;
  maritalStatus?: string | null;
  sect?: string | null;
  subSect?: string | null;
  diet?: string | null;
  highestEducation?: string | null;
  occupation?: string | null;
  organizationName?: string | null;
  annualIncome?: string | null;
  familyType?: string | null;
  city?: string | null;
  state?: string | null;
  defaultPhotoUrl?: string | null;
  photoUrls?: string[];
  isPhotosLocked?: boolean;
  isPhotoAccessGranted?: boolean;
  photoRequestStatus?: Profile['photoRequest'];
  isVerified?: boolean;
  kycStatus?: Me['kycStatus'];
  kycDocumentType?: string | null;
  kycRejectionReason?: string | null;
  profileDetails?: BDetails | null;
  compatibility?: BScore;
};
type BDetails = {
  bio?: string | null;
  hobbies?: string[] | null;
  heightCm?: number | null;
  languagesKnown?: string[] | null;
  gotra?: string | null;
  nativePlace?: string | null;
  mosal?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  motherName?: string | null;
  motherOccupation?: string | null;
  brothersCount?: number;
  marriedBrothersCount?: number;
  sistersCount?: number;
  marriedSistersCount?: number;
  timeOfBirth?: string | null;
  placeOfBirth?: string | null;
};
type BCrit = { score: number; max: number; description: string };
type BScore = { score: number; breakdown: Record<'sect' | 'subSect' | 'diet' | 'age' | 'location', BCrit> };
type BMessage = { id: string; content: string; isRead: boolean; createdAt: string; sender?: { id: string }; conversation?: { id: string } };

const SCORE_LABELS = { sect: 'Sect', subSect: 'Sub-sect', diet: 'Diet', age: 'Age', location: 'Location' } as const;

function toScore(c: BScore): Score {
  return {
    total: Math.round(c.score),
    rows: (Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((key) => ({
      key,
      label: SCORE_LABELS[key],
      pts: c.breakdown[key]?.score ?? 0,
      max: c.breakdown[key]?.max ?? 0,
      why: c.breakdown[key]?.description ?? '',
    })),
  };
}

/** The default photo, unless it's the backend's placeholder. Everyone may see it. */
function publicPhoto(u: BUser): string | null {
  const p = u.defaultPhotoUrl;
  return p && !p.includes('placeholder-avatar') ? p : null;
}

/** Extra photos: the gallery minus the default photo (older accounts have the default inside the gallery). */
function extraPhotos(u: BUser): string[] {
  const d = u.defaultPhotoUrl;
  return (u.photoUrls ?? []).filter((p) => p && p !== d);
}

function summary(u: BUser): PersonSummary {
  const name = u.fullName || 'Member';
  return { id: u.id, name, first: firstName(name), initials: initials(name), photo: publicPhoto(u) };
}

function siblings(d: BDetails) {
  const part = (n = 0, married = 0, one: string, many: string) => {
    if (!n) return null;
    const s = `${n} ${n === 1 ? one : many}`;
    if (!married) return s;
    return married === n ? `${s}, married` : `${s}, ${married} married`;
  };
  return [part(d.brothersCount, d.marriedBrothersCount, 'brother', 'brothers'), part(d.sistersCount, d.marriedSistersCount, 'sister', 'sisters')]
    .filter(Boolean)
    .join(', ') || 'None';
}

const withJob = (name?: string | null, job?: string | null) => [name, job].filter(Boolean).join(', ');

function toProfile(u: BUser): Profile {
  // The backend only sends the gallery when the viewer may see it.
  const extra = extraPhotos(u);
  const canSee = !u.isPhotosLocked || !!u.isPhotoAccessGranted || extra.length > 0;
  const d = u.profileDetails ?? undefined;
  return {
    ...summary(u),
    age: u.age ?? ageFrom(u.dateOfBirth),
    height: heightLabel(d?.heightCm),
    city: [u.city, u.state].filter(Boolean).join(', '),
    cityShort: u.city ?? '',
    state: u.state ?? undefined,
    sect: E.Sect.label(u.sect),
    subSect: E.SubSect.label(u.subSect),
    diet: E.Diet.label(u.diet),
    occupation: E.occShort(u.occupation),
    education: E.eduShort(u.highestEducation),
    income: E.incomeDisplay(u.annualIncome),
    marital: E.Marital.label(u.maritalStatus),
    family: E.Family.label(u.familyType),
    verified: !!u.isVerified,
    photos: canSee ? extra : [],
    photosLocked: !canSee,
    photoRequest: u.photoRequestStatus ?? null,
    score: u.compatibility ? toScore(u.compatibility) : undefined,
    bio: d?.bio ?? undefined,
    hobbies: d?.hobbies ?? [],
    details: d && {
      gotra: d.gotra ?? undefined,
      native: d.nativePlace ?? undefined,
      mosal: d.mosal ?? undefined,
      father: withJob(d.fatherName, d.fatherOccupation) || undefined,
      mother: withJob(d.motherName, d.motherOccupation) || undefined,
      siblings: siblings(d),
      languages: d.languagesKnown?.join(', ') || undefined,
      tob: d.timeOfBirth ?? 'Not shared',
      pob: d.placeOfBirth ?? undefined,
    },
  };
}

function toForm(u: BUser): ProfileForm {
  const d = u.profileDetails ?? {};
  return {
    name: u.fullName ?? '',
    dob: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : null,
    marital: E.Marital.label(u.maritalStatus),
    city: u.city ?? '',
    state: u.state ?? '',
    sect: E.Sect.label(u.sect),
    subSect: E.SubSect.label(u.subSect),
    diet: E.Diet.label(u.diet),
    education: E.Education.label(u.highestEducation),
    occupation: E.Occupation.label(u.occupation),
    organization: u.organizationName ?? '',
    income: E.IncomeAll.label(u.annualIncome),
    family: E.Family.label(u.familyType),
    bio: d.bio ?? '',
    hobbies: d.hobbies ?? [],
    heightCm: d.heightCm ?? null,
    languages: d.languagesKnown ?? [],
    gotra: d.gotra ?? '',
    native: d.nativePlace ?? '',
    mosal: d.mosal ?? '',
    fatherName: d.fatherName ?? '',
    fatherWork: d.fatherOccupation ?? '',
    motherName: d.motherName ?? '',
    motherWork: d.motherOccupation ?? '',
    brothers: d.brothersCount ?? 0,
    marriedBrothers: d.marriedBrothersCount ?? 0,
    sisters: d.sistersCount ?? 0,
    marriedSisters: d.marriedSistersCount ?? 0,
    tob: d.timeOfBirth ?? '',
    pob: d.placeOfBirth ?? '',
  };
}

function toMe(u: BUser): Me {
  return {
    id: u.id,
    name: u.fullName ?? '',
    phone: u.phoneNumber ?? '',
    age: ageFrom(u.dateOfBirth),
    dob: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : null,
    gender: E.Gender.label(u.gender),
    marital: E.Marital.label(u.maritalStatus),
    sect: E.Sect.label(u.sect),
    subSect: E.SubSect.label(u.subSect),
    diet: E.Diet.label(u.diet),
    profilePhoto: publicPhoto(u),
    photos: extraPhotos(u),
    photosLocked: u.isPhotosLocked ?? true,
    kycStatus: u.kycStatus ?? 'Unsubmitted',
    kycDoc: E.KycDoc.label(u.kycDocumentType),
    completeness: completeness(toForm(u)).pct,
  };
}

export class HttpApi implements Api {
  readonly demo = false;
  private socket: Socket | null = null;
  private refreshing: Promise<boolean> | null = null;
  private myCity: string | null = null;

  constructor(private base: string) {
    this.base = base.trim().replace(/\/+$/, '');
  }

  private async meId() {
    const t = await loadTokens();
    return t ? userIdFromToken(t.accessToken) : null;
  }

  private async refresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      const t = await loadTokens();
      if (!t) return false;
      const res = await fetch(`${this.base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: t.refreshToken }),
      }).catch(() => null);
      if (!res?.ok) return false;
      await saveTokens((await res.json()) as Tokens);
      return true;
    })().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async req<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const t = await loadTokens();
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(t ? { Authorization: `Bearer ${t.accessToken}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "Can't reach SoulSync. Check your connection.");
    }
    if (res.status === 401 && t && retry && !path.startsWith('/auth/')) {
      if (await this.refresh()) return this.req<T>(method, path, body, false);
      await saveTokens(null);
      onSignedOut();
    }
    if (!res.ok) {
      let msg = `Something went wrong (${res.status})`;
      try {
        const j = await res.json();
        msg = Array.isArray(j.message) ? j.message[0] : (j.message ?? msg);
      } catch {}
      throw new ApiError(res.status, msg);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // --- Auth ---
  async sendOtp(phone: string) {
    await this.req('POST', '/auth/send-otp', { phoneNumber: `+91${phone.replace(/\D/g, '')}` });
  }
  async verifyOtp(phone: string, otp: string) {
    const r = await this.req<{ accessToken: string; refreshToken: string; user: { isNewUser: boolean; isProfileComplete: boolean } }>(
      'POST',
      '/auth/verify-otp',
      { phoneNumber: `+91${phone.replace(/\D/g, '')}`, otp },
    );
    await saveTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    return { isNewUser: r.user.isNewUser, isProfileComplete: r.user.isProfileComplete };
  }
  async logout() {
    await this.req('POST', '/auth/logout').catch(() => {});
    this.socket?.disconnect();
    this.socket = null;
    await saveTokens(null);
  }
  async updateFcmToken(fcmToken: string): Promise<void> {
    await this.req<void>('PUT', '/users/fcm-token', { fcmToken });
  }

  // --- Me ---
  async getMe() {
    const u = await this.req<BUser>('GET', '/users/profile');
    this.myCity = u.city ?? null;
    return toMe(u);
  }
  async updateMe(p: Parameters<Api['updateMe']>[0]) {
    const body: Record<string, unknown> = {};
    if (p.name !== undefined) body.fullName = p.name;
    if (p.dob !== undefined) body.dateOfBirth = p.dob;
    if (p.gender !== undefined) body.gender = E.Gender.value(p.gender);
    if (p.marital !== undefined) body.maritalStatus = E.Marital.value(p.marital);
    if (p.sect !== undefined) body.sect = E.Sect.value(p.sect);
    if (p.subSect !== undefined) body.subSect = E.SubSect.value(p.subSect);
    if (p.diet !== undefined) body.diet = E.Diet.value(p.diet);
    if (p.photosLocked !== undefined) body.isPhotosLocked = p.photosLocked;
    // Extra photos and the default photo are saved separately, so a private photo never becomes the public one.
    if (p.photos !== undefined) body.photoUrls = p.photos;
    if (p.profilePhoto !== undefined) body.defaultPhotoUrl = p.profilePhoto;
    return toMe(await this.req<BUser>('PUT', '/users/profile', body));
  }
  private async upload(file: LocalFile, fileType: 'profile_photo' | 'gallery_photo' | 'kyc_document') {
    const { uploadUrl, fileUrl } = await this.req<{ uploadUrl: string; fileUrl: string }>('POST', '/media/presigned-url', {
      fileType,
      contentType: file.mimeType,
      fileName: file.name,
    });
    const body = await new ExpoFile(file.uri).arrayBuffer();
    if (body.byteLength === 0) throw new ApiError(0, 'Selected file is empty. Please choose another file.');
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.mimeType }, body }).catch(() => null);
    if (!put?.ok) throw new ApiError(put?.status ?? 0, 'Upload failed. Try again.');
    return fileUrl;
  }
  uploadPhoto(file: LocalFile, kind: 'profile' | 'extra' = 'extra') {
    return this.upload(file, kind === 'profile' ? 'profile_photo' : 'gallery_photo');
  }
  async getProfileForm(): Promise<ProfileForm> {
    return toForm(await this.req<BUser>('GET', '/users/profile'));
  }
  async saveProfileForm(f: ProfileForm) {
    // Empty text clears the field on the backend (null), unset choices are left as they are.
    const text = (v: string) => (v.trim() ? v.trim() : null);
    // Required choices are never cleared; optional ones send null when cleared.
    const pick = (v: string | undefined) => v || undefined;
    const optional = (v: string | undefined) => v || null;
    await this.req('PUT', '/users/profile', {
      fullName: f.name.trim(),
      ...(f.dob ? { dateOfBirth: f.dob } : {}),
      maritalStatus: pick(E.Marital.value(f.marital)),
      sect: pick(E.Sect.value(f.sect)),
      subSect: optional(E.SubSect.value(f.subSect)),
      diet: pick(E.Diet.value(f.diet)),
      highestEducation: optional(E.Education.value(f.education)),
      occupation: optional(E.Occupation.value(f.occupation)),
      annualIncome: optional(E.IncomeAll.value(f.income)),
      familyType: optional(E.Family.value(f.family)),
      organizationName: text(f.organization),
      city: text(f.city),
      state: text(f.state),
    });
    await this.req('PUT', '/users/profile/details', {
      bio: text(f.bio),
      hobbies: f.hobbies,
      languagesKnown: f.languages,
      ...(f.heightCm ? { heightCm: f.heightCm } : {}),
      gotra: text(f.gotra),
      nativePlace: text(f.native),
      mosal: text(f.mosal),
      fatherName: text(f.fatherName),
      fatherOccupation: text(f.fatherWork),
      motherName: text(f.motherName),
      motherOccupation: text(f.motherWork),
      brothersCount: f.brothers,
      marriedBrothersCount: Math.min(f.marriedBrothers, f.brothers),
      sistersCount: f.sisters,
      marriedSistersCount: Math.min(f.marriedSisters, f.sisters),
      timeOfBirth: text(f.tob),
      placeOfBirth: text(f.pob),
    });
    return this.getMe();
  }
  exportData() {
    return this.req<unknown>('GET', '/users/profile/export');
  }
  async deleteAccount() {
    await this.req('DELETE', '/users/profile', {});
    this.socket?.disconnect();
    await saveTokens(null);
  }

  // --- Preferences ---
  async getPrefs(): Promise<Prefs> {
    type BP = {
      minAge?: number | null;
      maxAge?: number | null;
      preferredMaritalStatuses?: string[] | null;
      preferredSects?: string[] | null;
      preferredSubSects?: string[] | null;
      preferredDiets?: string[] | null;
      minIncome?: string | null;
      preferredFamilyTypes?: string[] | null;
      preferredCities?: string[] | null;
      preferredEducationLevels?: string[] | null;
      preferredOccupations?: string[] | null;
      preferredStates?: string[] | null;
    };
    const p = await this.req<BP>('GET', '/users/preferences').catch((e) => {
      if (e instanceof ApiError && e.status === 404) return {} as BP;
      throw e;
    });
    return {
      minAge: p.minAge ?? 25,
      maxAge: p.maxAge ?? 32,
      marital: (p.preferredMaritalStatuses ?? []).map(E.Marital.label),
      sect: (p.preferredSects ?? []).map(E.Sect.label),
      subSect: (p.preferredSubSects ?? []).map(E.SubSect.label),
      diet: (p.preferredDiets ?? []).map(E.Diet.label),
      minIncome: p.minIncome ? E.Income.label(p.minIncome) : 'Any',
      family: (p.preferredFamilyTypes ?? []).map(E.Family.label),
      cities: p.preferredCities ?? [],
      education: (p.preferredEducationLevels ?? []).map(E.Education.label),
      occupation: (p.preferredOccupations ?? []).map(E.Occupation.label),
      states: p.preferredStates ?? [],
    };
  }
  async savePrefs(p: Prefs) {
    await this.req('PUT', '/users/preferences', {
      minAge: p.minAge,
      maxAge: p.maxAge,
      preferredMaritalStatuses: p.marital.map(E.Marital.value),
      preferredSects: p.sect.map(E.Sect.value),
      preferredSubSects: p.subSect.map(E.SubSect.value),
      preferredDiets: p.diet.map(E.Diet.value),
      ...(p.minIncome !== 'Any' ? { minIncome: E.Income.value(p.minIncome) } : {}),
      preferredFamilyTypes: p.family.map(E.Family.value),
      preferredCities: p.cities,
      preferredEducationLevels: p.education.map(E.Education.value).filter(Boolean),
      preferredOccupations: p.occupation.map(E.Occupation.value).filter(Boolean),
      preferredStates: p.states,
    });
  }

  // --- Matches ---
  async matches(filter: Parameters<Api['matches']>[0]) {
    const q = new URLSearchParams({ limit: '50' });
    if (filter === 'Strict Jain') q.set('diet', E.Diet.value('Strict Jain')!);
    if (filter === 'Nearby') {
      if (this.myCity === null) await this.getMe().catch(() => {});
      if (this.myCity) q.set('city', this.myCity);
    }
    const r = await this.req<{ data: BUser[] }>('GET', `/matches?${q}`);
    let list = r.data.map(toProfile);
    if (filter === 'Verified') list = list.filter((m) => m.verified);
    if (filter === 'Gujarat') list = list.filter((m) => m.state === 'Gujarat');
    return list;
  }
  async score(id: string) {
    const r = await this.req<{ compatibility: BScore }>('GET', `/matches/${id}/score`);
    return toScore(r.compatibility);
  }
  async profile(id: string) {
    const [u, s] = await Promise.all([this.req<BUser>('GET', `/users/${id}`), this.score(id).catch(() => undefined)]);
    return { ...toProfile(u), score: s };
  }

  // --- Interests ---
  async receivedInterests() {
    type R = { id: string; status: string; icebreakerNote: string | null; grantPhotoAccess: boolean; sender: BUser };
    const list = await this.req<R[]>('GET', '/interests/received');
    const live = list.filter((r) => r.status !== 'Cancelled');
    const scores = await Promise.all(live.map((r) => this.score(r.sender.id).then((s) => s.total).catch(() => undefined)));
    return live.map((r, i) => ({
      id: r.id,
      from: {
        ...summary(r.sender),
        age: ageFrom(r.sender.dateOfBirth),
        meta: [E.Sect.label(r.sender.sect), r.sender.city].filter(Boolean).join(' · '),
      },
      note: r.icebreakerNote ?? '',
      grant: r.grantPhotoAccess,
      status: (r.status === 'Accepted' ? 'accepted' : r.status === 'Declined' ? 'declined' : 'pending') as 'pending' | 'accepted' | 'declined',
      score: scores[i],
    }));
  }
  async sentInterests() {
    type S = { id: string; status: string; grantPhotoAccess: boolean; createdAt: string; receiver: BUser };
    const list = await this.req<S[]>('GET', '/interests/sent');
    return list.map((r) => ({
      id: r.id,
      to: summary(r.receiver),
      when: ago(r.createdAt),
      status: (r.status === 'Pending' ? 'Waiting' : r.status === 'Accepted' ? 'Accepted' : 'Declined') as 'Waiting' | 'Accepted' | 'Declined',
      grant: r.grantPhotoAccess,
    }));
  }
  async sendInterest(id: string, note: string, grant: boolean) {
    await this.req('POST', `/interests/${id}`, { ...(note.trim() ? { icebreakerNote: note.trim() } : {}), grantPhotoAccess: grant });
  }
  async respondInterest(id: string, accept: boolean) {
    const r = await this.req<{ conversation: { id: string } | null }>('PATCH', `/interests/${id}/respond`, {
      status: accept ? 'Accepted' : 'Declined',
    });
    return { conversationId: r.conversation?.id ?? null };
  }
  async setInterestPhotoAccess(id: string, grant: boolean) {
    await this.req('PATCH', `/interests/${id}/photo-access`, { grantPhotoAccess: grant });
  }

  // --- Photo access ---
  async requestPhotos(id: string) {
    await this.req('POST', `/users/${id}/photo-request`);
  }
  async photoRequests() {
    type P = { id: string; status: string; createdAt: string; requester: BUser };
    const list = await this.req<P[]>('GET', '/users/photo-requests/received');
    return list.map((r) => ({
      id: r.id,
      from: summary(r.requester),
      when: ago(r.createdAt),
      status: r.status.toLowerCase() as 'pending' | 'approved' | 'declined' | 'revoked',
    }));
  }
  async sentPhotoRequests(): Promise<SentPhotoRequest[]> {
    type P = { id: string; status: string; createdAt: string; updatedAt?: string; targetUser: BUser };
    const list = await this.req<P[]>('GET', '/users/photo-requests/sent');
    return list.map((r) => ({
      id: r.id,
      to: summary(r.targetUser),
      when: ago(r.updatedAt ?? r.createdAt),
      status: r.status.toLowerCase() as SentPhotoRequest['status'],
    }));
  }
  async respondPhotoRequest(id: string, status: 'approved' | 'declined' | 'revoked') {
    await this.req('PATCH', `/users/photo-requests/${id}/respond`, { status: status[0]!.toUpperCase() + status.slice(1) });
  }

  // --- Safety ---
  async block(id: string) {
    await this.req('POST', `/safety/block/${id}`, {});
  }
  async unblock(id: string) {
    await this.req('DELETE', `/safety/block/${id}`);
  }
  async report(id: string, reason: string, alsoBlock: boolean, description?: string) {
    await this.req('POST', `/safety/report/${id}`, {
      reason: E.ReportReason.value(reason),
      alsoBlock,
      ...(description?.trim() ? { description: description.trim() } : {}),
    });
  }
  async blockedList(): Promise<BlockedPerson[]> {
    type B = { id: string; createdAt: string; blockedUser?: BUser | null };
    const list = await this.req<B[]>('GET', '/safety/blocked');
    return list
      .filter((b): b is B & { blockedUser: BUser } => !!b.blockedUser)
      .map((b) => ({ ...summary(b.blockedUser), since: ago(b.createdAt) }));
  }

  // --- Chat ---
  private toMessage(m: BMessage, me: string | null): Message {
    return { id: m.id, text: m.content, mine: m.sender?.id === me, at: m.createdAt, read: m.isRead };
  }
  async conversations(): Promise<Conversation[]> {
    type C = { id: string; isActive: boolean; lastMessageAt: string | null; createdAt: string; userOne: BUser; userTwo: BUser };
    const me = await this.meId();
    const list = await this.req<C[]>('GET', '/chat/conversations');
    // The list endpoint has no last message or unread count, so read the latest messages of each chat.
    const recent = await Promise.all(list.map((c) => this.req<BMessage[]>('GET', `/chat/conversations/${c.id}/messages?limit=20`).catch(() => [])));
    return list.map((c, i) => {
      const other = c.userOne.id === me ? c.userTwo : c.userOne;
      const msgs = recent[i]!;
      return {
        id: c.id,
        other: summary(other),
        last: msgs[0]?.content ?? 'Say Jai Jinendra',
        time: shortTime(c.lastMessageAt ?? c.createdAt),
        unread: msgs.filter((m) => !m.isRead && m.sender?.id !== me).length,
        active: c.isActive,
      };
    });
  }
  async messages(id: string) {
    const me = await this.meId();
    const list = await this.req<BMessage[]>('GET', `/chat/conversations/${id}/messages?limit=100`);
    return list.reverse().map((m) => this.toMessage(m, me));
  }
  async sendMessage(id: string, text: string) {
    const me = await this.meId();
    return this.toMessage(await this.req<BMessage>('POST', '/chat/messages', { conversationId: id, content: text }), me);
  }
  async markRead(id: string) {
    await this.req('PATCH', `/chat/conversations/${id}/read`).catch(() => {});
  }
  subscribe(conversationId: string, onMessage: (m: Message) => void) {
    let off = () => {};
    (async () => {
      const t = await loadTokens();
      if (!t) return;
      this.socket ??= io(`${this.base}/chat`, { auth: { token: t.accessToken }, transports: ['websocket'] });
      const s = this.socket;
      const me = userIdFromToken(t.accessToken);
      const join = () => s.emit('joinConversation', { conversationId });
      const handler = (m: BMessage) => {
        if (m.conversation?.id === conversationId && m.sender?.id !== me) onMessage(this.toMessage(m, me));
      };
      s.on('connect', join);
      s.on('newMessage', handler);
      if (s.connected) join();
      off = () => {
        s.off('connect', join);
        s.off('newMessage', handler);
      };
    })();
    return () => off();
  }

  // --- KYC ---
  async kyc() {
    const r = await this.req<{ kycStatus: Me['kycStatus']; kycDocumentType: string | null; kycRejectionReason?: string | null }>('GET', '/users/profile/kyc');
    return { status: r.kycStatus, doc: E.KycDoc.label(r.kycDocumentType), reason: r.kycRejectionReason ?? undefined };
  }
  async submitKyc(doc: string, file: LocalFile) {
    const url = await this.upload(file, 'kyc_document');
    await this.req('POST', '/users/profile/kyc', { documentType: E.KycDoc.value(doc), documentUrl: url });
  }
}
