// App-side models. Both the HTTP client and the demo data produce these shapes,
// already converted to the design's short labels.

export type ScoreRow = { key: 'sect' | 'subSect' | 'diet' | 'age' | 'location'; label: string; pts: number; max: number; why: string };
export type Score = { total: number; rows: ScoreRow[] };

export type PersonSummary = {
  id: string;
  name: string;
  first: string;
  initials: string;
  /** The default (profile) photo. Everyone can see it. */
  photo?: string | null;
};

export type Profile = PersonSummary & {
  age: number | null;
  height?: string;
  city: string;
  cityShort: string;
  state?: string;
  sect: string;
  subSect: string;
  diet: string;
  occupation: string;
  education: string;
  income: string;
  marital: string;
  family: string;
  verified: boolean;
  /** Extra photos beyond the default one. Empty until the viewer is allowed to see them. */
  photos: string[];
  /** True while the extra photos are private and the viewer hasn't been given access. */
  photosLocked: boolean;
  photoRequest: 'Pending' | 'Approved' | 'Declined' | 'Revoked' | null;
  score?: Score;
  bio?: string;
  hobbies?: string[];
  details?: {
    gotra?: string;
    native?: string;
    mosal?: string;
    father?: string;
    mother?: string;
    siblings?: string;
    languages?: string;
    tob?: string;
    pob?: string;
  };
};

export type InterestStatus = 'pending' | 'accepted' | 'declined';

export type ReceivedInterest = {
  id: string;
  from: PersonSummary & { age: number | null; meta: string };
  note: string;
  grant: boolean;
  status: InterestStatus;
  score?: number;
};

export type SentInterest = {
  id: string;
  to: PersonSummary;
  when: string;
  status: 'Waiting' | 'Accepted' | 'Declined';
  grant: boolean;
};

export type PhotoRequest = {
  id: string;
  from: PersonSummary;
  when: string;
  status: 'pending' | 'approved' | 'declined' | 'revoked';
};

export type Conversation = {
  id: string;
  other: PersonSummary;
  last: string;
  time: string;
  unread: number;
  active: boolean;
};

export type Message = { id: string; text: string; mine: boolean; at: string; read: boolean };

export type Me = {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  dob: string | null; // yyyy-mm-dd
  gender: string; // 'Man' | 'Woman' | ''
  marital: string;
  sect: string;
  subSect: string;
  diet: string;
  /** Default (profile) photo, visible to everyone. */
  profilePhoto: string | null;
  /** Extra photos, visible only to people you allow while photosLocked is on. */
  photos: string[];
  photosLocked: boolean;
  kycStatus: 'Unsubmitted' | 'Pending' | 'Approved' | 'Rejected';
  kycDoc: string;
  completeness: number; // 0–100
};

export type Prefs = {
  minAge: number;
  maxAge: number;
  marital: string[];
  sect: string[];
  subSect: string[];
  diet: string[];
  minIncome: string; // 'Any' or a short income label
  family: string[];
  cities: string[];
  education: string[];
  occupation: string[];
  states: string[];
};

/** Everything a person can edit about themselves (Edit profile). Empty string / null = not shared. */
export type ProfileForm = {
  name: string;
  dob: string | null; // yyyy-mm-dd
  marital: string;
  city: string;
  state: string;
  sect: string;
  subSect: string;
  diet: string;
  education: string;
  occupation: string;
  organization: string;
  income: string;
  family: string;
  bio: string;
  hobbies: string[];
  heightCm: number | null;
  languages: string[];
  gotra: string;
  native: string;
  mosal: string;
  fatherName: string;
  fatherWork: string;
  motherName: string;
  motherWork: string;
  brothers: number;
  marriedBrothers: number;
  sisters: number;
  marriedSisters: number;
  tob: string;
  pob: string;
};

export type BlockedPerson = PersonSummary & { since: string };

/** A photo request this person sent to someone else. */
export type SentPhotoRequest = {
  id: string;
  to: PersonSummary;
  when: string;
  status: 'pending' | 'approved' | 'declined' | 'revoked';
};

export type MatchFilter = 'All' | 'Verified' | 'Strict Jain' | 'Gujarat' | 'Nearby';

export type LocalFile = { uri: string; name: string; mimeType: string };

export type AuthResult = { isNewUser: boolean; isProfileComplete: boolean };

export interface Api {
  readonly demo: boolean;
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<AuthResult>;
  logout(): Promise<void>;
  updateFcmToken(fcmToken: string): Promise<void>;

  getMe(): Promise<Me>;
  updateMe(patch: Partial<Pick<Me, 'name' | 'dob' | 'gender' | 'marital' | 'sect' | 'subSect' | 'diet' | 'photosLocked' | 'photos' | 'profilePhoto'>>): Promise<Me>;
  uploadPhoto(file: LocalFile, kind?: 'profile' | 'extra'): Promise<string>;
  getProfileForm(): Promise<ProfileForm>;
  saveProfileForm(f: ProfileForm): Promise<Me>;
  exportData(): Promise<unknown>;
  deleteAccount(): Promise<void>;

  getPrefs(): Promise<Prefs>;
  savePrefs(p: Prefs): Promise<void>;

  matches(filter: MatchFilter): Promise<Profile[]>;
  profile(id: string): Promise<Profile>;
  score(id: string): Promise<Score>;

  receivedInterests(): Promise<ReceivedInterest[]>;
  sentInterests(): Promise<SentInterest[]>;
  sendInterest(id: string, note: string, grant: boolean): Promise<void>;
  respondInterest(id: string, accept: boolean): Promise<{ conversationId: string | null }>;
  setInterestPhotoAccess(id: string, grant: boolean): Promise<void>;

  requestPhotos(id: string): Promise<void>;
  photoRequests(): Promise<PhotoRequest[]>;
  sentPhotoRequests(): Promise<SentPhotoRequest[]>;
  respondPhotoRequest(id: string, status: 'approved' | 'declined' | 'revoked'): Promise<void>;

  block(id: string): Promise<void>;
  unblock(id: string): Promise<void>;
  report(id: string, reason: string, alsoBlock: boolean, description?: string): Promise<void>;
  blockedList(): Promise<BlockedPerson[]>;

  conversations(): Promise<Conversation[]>;
  messages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, text: string): Promise<Message>;
  markRead(conversationId: string): Promise<void>;
  /** Live messages for one conversation. Returns an unsubscribe function. */
  subscribe(conversationId: string, onMessage: (m: Message) => void): () => void;

  kyc(): Promise<{ status: Me['kycStatus']; doc: string; reason?: string }>;
  submitKyc(doc: string, file: LocalFile): Promise<void>;
}
