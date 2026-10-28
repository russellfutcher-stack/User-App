// Live check of real passkeys against the Supabase project, using Chrome's virtual authenticator.
// It signs up a throwaway account, uses passkeys every way the app does, then deletes the account.
// Run from app/ with the two Supabase settings set:
//   npx expo export --platform web --output-dir dist-live && node scripts/live-passkey.js dist-live
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]); const PORT = 3000; // the passkey origin set in Supabase is http://localhost:3000
http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html'); r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(PORT);
const log = (s, v = '') => console.log(s.padEnd(34), v);
(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: process.env.HTTPS_PROXY ? ['--proxy-server=https=' + process.env.HTTPS_PROXY.replace(/^https?:\/\//, '')] : [] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } }); const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  const btn = n => page.getByRole('button', { name: n, exact: true });
  const toast = () => page.locator('#toast').innerText().catch(() => '');
  const name = 'zzpk' + Math.floor(Math.random() * 1e6), pass = 'Pk-test-' + Math.random().toString(36).slice(2) + '!9';
  log('test account', name);
  const step = async (label, fn) => { try { await fn(); log(label, 'ok'); } catch (e) { log(label, 'FAILED: ' + e.message.split('\n')[0]); log('  toast/error', (await toast()) + ' | ' + (await page.locator('#ob-err, #li-err').allInnerTexts()).join(' ')); await page.screenshot({ path: 'live-passkey-fail.png' }); throw e; } };
  try {
    await page.goto(`http://localhost:${PORT}/`);
    await step('welcome shows', () => page.getByRole('heading', { name: 'Why people use User' }).waitFor());
    await step('sign-up to passkey step', async () => {
      await btn('Create an anonymous account').click(); await page.locator('#r-age').click(); await page.locator('#r-agree').click(); await btn('Continue').click();
      await page.fill('#ob-h', name); await page.fill('#ob-p', pass); await page.fill('#ob-p2', pass); await btn('Continue').click();
      await page.getByRole('heading', { name: 'Protect your account with a passkey' }).waitFor();
    });
    await step('create a passkey (SN-12)', async () => { await btn('Create a passkey').click(); await page.getByText('Passkey saved', { exact: true }).waitFor({ timeout: 15000 }); });
    const creds = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials; log('  passkeys on virtual device', creds.length);
    await step('create account', async () => { await btn('Create account').click(); await page.getByText("Let's set up your profile.").waitFor({ timeout: 15000 }); });
    await step('finish profile', async () => {
      await page.getByRole('radio', { name: 'Not right now' }).click(); await page.locator('#screen').getByRole('checkbox', { name: 'Music', exact: true }).click();
      await btn('Save profile and see my matches').click(); await page.getByRole('tab', { name: 'Home', exact: true }).waitFor({ timeout: 15000 });
    });
    await step('Me shows passkey saved (M-18)', async () => { await page.getByRole('tab', { name: 'Me', exact: true }).click(); await page.getByText('Saved on this device.', { exact: false }).waitFor({ timeout: 15000 }); });
    await step('sign out', async () => { await btn('Sign out').click(); await page.getByRole('heading', { name: 'Why people use User' }).waitFor(); });
    await step('sign in with passkey (WS-09)', async () => {
      await btn('Sign in with a passkey').click(); await btn(`Continue as ${name}`).click();
      await page.getByRole('tab', { name: 'Home', exact: true }).waitFor({ timeout: 15000 });
    });
    await step('remove passkey on Me', async () => {
      await page.getByRole('tab', { name: 'Me', exact: true }).click(); await btn('Remove').click();
      await page.getByText('Not set up.', { exact: false }).waitFor({ timeout: 15000 });
    });
    await step('add passkey again on Me', async () => { await btn('Add a passkey').click(); await page.getByText('Saved on this device.', { exact: false }).waitFor({ timeout: 15000 }); });
    await step('sign out, fresh device memory', async () => { await btn('Sign out').click(); await page.evaluate(() => localStorage.removeItem('user-app-passkey')); await page.reload(); await page.getByRole('heading', { name: 'Why people use User' }).waitFor(); });
    await step('passkey sign-in without remembered name', async () => { await btn('Sign in with a passkey').click(); await page.getByRole('tab', { name: 'Home', exact: true }).waitFor({ timeout: 15000 }); });
    await step('delete account', async () => {
      await page.getByRole('tab', { name: 'Me', exact: true }).click(); await btn('Delete account').click();
      await btn('Delete everything').click();
      await page.getByRole('heading', { name: 'Why people use User' }).waitFor({ timeout: 15000 });
    });
    await step('old passkey now refused', async () => { await btn('Sign in with a passkey').click(); await page.locator('#li-err').getByText('No passkey for User is saved on this device', { exact: false }).waitFor({ timeout: 15000 }); });
    log('ALL PASSED');
  } catch { /* reported above */ } finally {
    await browser.close();
    // Remove the test account if the run stopped before deleting it.
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY, { auth: { persistSession: false } });
    const { error } = await db.auth.signInWithPassword({ email: name.toLowerCase() + '@members.user-app.invalid', password: pass });
    if (!error) { const d = await db.rpc('delete_my_account'); log('cleanup: test account deleted', d.error ? d.error.message : 'yes'); }
    process.exit(0);
  }
})();
