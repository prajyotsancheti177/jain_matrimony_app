// How complete a profile is. Shared by the Profile tab card and Edit profile so both show the same number.
import type { ProfileForm } from './types';

/** Fields that count, grouped by the Edit profile section that holds them. */
export const COMPLETENESS_SECTIONS: { title: string; done: (f: ProfileForm) => boolean[] }[] = [
  { title: 'Basics', done: (f) => [!!f.name, !!f.dob, !!f.marital, !!f.city, !!f.state] },
  { title: 'Faith & food', done: (f) => [!!f.sect, !!f.subSect, !!f.diet, !!f.gotra, !!f.native] },
  { title: 'Work', done: (f) => [!!f.education, !!f.occupation, !!f.income] },
  { title: 'Family', done: (f) => [!!f.family, !!f.fatherName, !!f.motherName] },
  { title: 'About you', done: (f) => [!!f.bio, f.hobbies.length > 0, !!f.heightCm, f.languages.length > 0] },
];

/** Percentage complete, and the first section that still has gaps. */
export function completeness(f: ProfileForm): { pct: number; next?: string } {
  const all = COMPLETENESS_SECTIONS.flatMap((s) => s.done(f));
  const pct = Math.round((all.filter(Boolean).length / all.length) * 100);
  return { pct, next: COMPLETENESS_SECTIONS.find((s) => s.done(f).some((d) => !d))?.title };
}
