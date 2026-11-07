// Turning notifications on and off on this device (Web Push), for the real server. The server's push function keeps
// the signing key; this only asks the browser for permission and hands the device's address to the server.
import { Platform } from 'react-native';

const b64ToBytes = (s: string) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const supported = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
// iPhones only allow notifications for web apps added to the home screen.
const iosBrowser = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone);

export const NOT_INSTALLED = 'On iPhone, add User to your home screen first (Share, then Add to Home Screen), then turn this on there.';
export const BLOCKED = "Notifications are blocked for User. Allow them in your phone or browser settings, then try again.";
export const UNSUPPORTED = "This browser can't show notifications from User.";

export async function currentDevice(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null;
}
// Returns the device's subscription (as plain JSON for the server), or an error to show.
export async function subscribe(publicKey: string): Promise<{ sub: PushSubscriptionJSON } | { error: string }> {
  if (!supported()) return { error: iosBrowserSafe() ? NOT_INSTALLED : UNSUPPORTED };
  if (iosBrowser()) return { error: NOT_INSTALLED };
  if ((await Notification.requestPermission()) !== 'granted') return { error: BLOCKED };
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  return { sub: sub.toJSON() };
}
const iosBrowserSafe = () => { try { return iosBrowser(); } catch { return false; } };
