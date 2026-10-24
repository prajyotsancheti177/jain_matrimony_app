import { create } from 'zustand';

/** Answers collected across the two onboarding steps, saved together at the end. */
export const useOnboarding = create<{
  name: string;
  gender: string;
  dob: string | null;
  marital: string;
  sect: string;
  subSect: string;
  diet: string;
  set: (p: Partial<{ name: string; gender: string; dob: string | null; marital: string; sect: string; subSect: string; diet: string }>) => void;
}>((set) => ({
  name: '',
  gender: 'Man',
  dob: null,
  marital: 'Never married',
  sect: 'Murtipujak',
  subSect: 'Visa Oswal',
  diet: 'Strict Jain',
  set: (p) => set(p),
}));
