// Links to the public website's Terms of Service and Privacy Policy (Rusty, 14 Nov 2026). The website lives next to
// the app: /User-App/about/... on GitHub Pages, or /about/... when the app is served from the root of an address.
import { Linking } from 'react-native';

export function legalUrl(page: 'terms' | 'privacy') {
  const loc = (globalThis as { location?: Location }).location;
  if (!loc) return `https://russellfutcher-stack.github.io/User-App/about/${page}/`;
  const base = (loc.pathname.match(/^\/[^/]+\//) || ['/'])[0];
  return `${loc.origin}${base === '/about/' ? '/' : base}about/${page}/`;
}
export const openLegal = (page: 'terms' | 'privacy') => Linking.openURL(legalUrl(page));
