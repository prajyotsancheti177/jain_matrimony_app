import { DemoApi } from './demo';
import { HttpApi } from './http';
import type { Api } from './types';

export * from './types';
export { ApiError, setSignedOutHandler } from './http';

/**
 * Set EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:3000) to use the NestJS backend.
 * Without it the app runs on the design's sample data.
 * EXPO_PUBLIC_DEMO=1 forces the sample data even when a URL is set (design reviews, web previews).
 */
const url = process.env.EXPO_PUBLIC_DEMO === '1' ? undefined : process.env.EXPO_PUBLIC_API_URL;
export const api: Api = url ? new HttpApi(url) : new DemoApi();
