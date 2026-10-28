import { localBackend } from './local';
import { supabaseBackend } from './supabase';
import type { Backend } from './types';

// With the Supabase address and public key set (in the environment, never in the code),
// the app uses the real server. Without them it keeps data in this browser.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const backend: Backend = url && key ? supabaseBackend(url, key) : localBackend();
export * from './types';
