import { create } from 'zustand';
import type { OnboardingProfile } from '../api/types';

/** Answers collected across the onboarding steps. Saved after the required steps and again at the end. */
export const useOnboarding = create<OnboardingProfile & { set: (p: Partial<OnboardingProfile>) => void }>((set) => ({
  first: '',
  middle: '',
  last: '',
  gender: 'Man',
  marital: 'Never married',
  dob: null,
  city: '',
  state: '',
  hometown: '',
  sect: 'Murtipujak',
  subSect: 'Visa Oswal',
  diet: 'Strict Jain',
  education: '',
  occupation: '',
  heightCm: null,
  bloodGroup: '',
  father: '',
  mother: '',
  dadaji: '',
  dadiji: '',
  nanaji: '',
  naniji: '',
  saakha: '',
  dadiSaakha: '',
  naniSaakha: '',
  mamaSaakha: '',
  set: (p) => set(p),
}));
