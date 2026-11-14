// Links to the public website and its Terms of Service and Privacy Policy (Rusty, 14 Nov 2026).
// Live, the website is at the top of the address and the app is at /app/ (SITE). Anywhere else (tests, a preview),
// the app is at the top and the same pages are at /about/.
import { Linking } from 'react-native';

export const SITE = 'https://userconnect-au.github.io/';
export function siteUrl() {
  const loc = (globalThis as { location?: Location }).location;
  if (!loc) return SITE;
  return loc.pathname.startsWith('/app/') ? `${loc.origin}/` : `${loc.origin}/about/`;
}
export const legalUrl = (page: 'terms' | 'privacy') => `${siteUrl()}${page}/`;
export const openSite = () => Linking.openURL(siteUrl());
export const openLegal = (page: 'terms' | 'privacy') => Linking.openURL(legalUrl(page));
