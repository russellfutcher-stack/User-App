const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const me = async page => { await H.tab(page, 'Me').click(); };
test.beforeEach(async ({ page }) => { await H.open(page); await H.signInDemo(page); await me(page); });

test('M-01 Header shows username and byline', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'QuietHeron', level: 1 })).toBeVisible();
  await expect(page.locator('#me-byline')).toContainText('New here.');
});
test('M-01 A new account says No byline yet', async ({ page }) => {
  await H.signOut(page); await H.createAccount(page, 'Blank_1'); await H.finishSetup(page); await me(page);
  await expect(page.locator('#me-byline')).toHaveText('No byline yet.'); await expect(H.btn(page, 'Add byline')).toBeVisible();
});
test('M-02 Change byline and save', async ({ page }) => {
  await H.btn(page, 'Change byline').click(); await page.fill('#by-in', 'Morning walks keep me going.');
  await H.btn(page, 'Save byline').click();
  await expect(page.locator('#me-byline')).toHaveText('Morning walks keep me going.'); await expect(H.toast(page)).toHaveText('Byline saved.');
});
test('M-02 Cancel keeps the old byline', async ({ page }) => {
  await H.btn(page, 'Change byline').click(); await page.fill('#by-in', 'Something else'); await H.btn(page, 'Cancel').click();
  await expect(page.locator('#me-byline')).toContainText('New here.');
});
test('M-03 Peer support toggle saves', async ({ page }) => {
  const t = H.toggle(page, 'I would like peer support'); await expect(t).toHaveAttribute('aria-checked', 'true');
  await t.click(); await expect(t).toHaveAttribute('aria-checked', 'false'); await expect(H.toast(page)).toHaveText('Peer support turned off.');
});
test('M-03 The choice is kept', async ({ page }) => {
  await H.toggle(page, 'I would like peer support').click(); await page.reload(); await H.signInDemo(page); await me(page);
  await expect(H.toggle(page, 'I would like peer support')).toHaveAttribute('aria-checked', 'false');
});
test('M-04 Nominating shows the badge', async ({ page }) => {
  await expect(page.locator('#peer-on')).toHaveCount(0);
  await H.toggle(page, 'Nominate myself as a peer supporter').click();
  await expect(page.locator('#peer-on')).toContainText('Peer supporter'); await expect(H.toast(page)).toHaveText('You are now a peer supporter. Thank you.');
});
test('M-04 The commitment is shown', async ({ page }) => {
  await expect(H.screen(page)).toContainText('never give medical or dosing advice');
});
test('M-05 Tapping a tag toggles it', async ({ page }) => {
  const c = H.chip(page, 'Music'); await c.click(); await expect(c).toHaveAttribute('aria-checked', 'true');
  await c.click(); await expect(c).toHaveAttribute('aria-checked', 'false');
});
test('M-05 Tag changes save immediately', async ({ page }) => {
  await H.chip(page, 'Gaming').click();
  expect((await H.stored(page)).accounts.quietheron.profile.tags).toContain('I06');
});
test('M-06 Counters show what the demo has', async ({ page }) => {
  await expect(page.locator('#cnt-interests')).toHaveText('3 added'); await expect(page.locator('#cnt-drugs')).toHaveText('2 added');
  await expect(page.locator('#cnt-mh')).toHaveText('2 added');
});
test('M-06 Counters update instantly', async ({ page }) => {
  await H.chip(page, 'ADHD').click(); await expect(page.locator('#cnt-mh')).toHaveText('3 added');
});
test('M-07 Twenty interests', async ({ page }) => {
  await expect(H.screen(page).getByRole('group', { name: 'Interests: Interests' }).getByRole('checkbox')).toHaveCount(20);
});
test('M-07 Includes the newer interests', async ({ page }) => {
  await expect(H.chip(page, 'Volunteering & community')).toBeVisible(); await expect(H.chip(page, 'Fishing')).toBeVisible();
});
test('M-08 Drug use lists: 20, 10 and 4', async ({ page }) => {
  const g = n => H.screen(page).getByRole('group', { name: 'Drug use: ' + n }).getByRole('checkbox');
  await expect(g('Medications')).toHaveCount(20); await expect(g('Other Substances')).toHaveCount(10);
  await expect(g('Alcohol, nicotine & gambling')).toHaveCount(4);
});
test('M-08 Headings Medications and Other Substances', async ({ page }) => {
  await expect(H.screen(page).getByText('Medications', { exact: true })).toBeVisible();
  await expect(H.screen(page).getByText('Other Substances', { exact: true })).toBeVisible();
});
test('M-09 Twenty mental health conditions', async ({ page }) => {
  await expect(H.screen(page).getByRole('group', { name: 'Mental health: Mental health' }).getByRole('checkbox')).toHaveCount(20);
});
test('M-09 Includes Self-harm and Autism', async ({ page }) => {
  await expect(H.chip(page, 'Self-harm')).toBeVisible(); await expect(H.chip(page, 'Autism')).toBeVisible();
});
test('M-10 Same 11 stages as setup', async ({ page }) => {
  await expect(page.locator('#su-stage option')).toHaveCount(11); await expect(page.locator('#su-stage')).toHaveValue('early');
});
test('M-10 Changing the stage saves', async ({ page }) => {
  await page.locator('#su-stage').selectOption('long');
  expect((await H.stored(page)).accounts.quietheron.profile.stage).toBe('long');
});
test('M-11 Fourteen looking-for options', async ({ page }) => {
  await expect(H.screen(page).getByRole('group', { name: "I'm looking for" }).getByRole('checkbox')).toHaveCount(14);
});
test('M-11 Demo has chat, walk and pets on', async ({ page }) => {
  for (const l of ['Someone to chat with', 'A walking buddy', 'Pet walks']) await expect(H.chip(page, l)).toHaveAttribute('aria-checked', 'true');
});
test('M-12 Changing visibility confirms', async ({ page }) => {
  await page.locator('#vis-mh').selectOption('me'); await expect(H.toast(page)).toHaveText('Visibility updated.');
});
test('M-12 Visibility is kept', async ({ page }) => {
  await page.locator('#vis-subs').selectOption('everyone'); await page.reload(); await H.signInDemo(page); await me(page);
  await expect(page.locator('#vis-subs')).toHaveValue('everyone');
});
test('M-13 Show me in Search results toggles', async ({ page }) => {
  const t = H.toggle(page, 'Show me in Search results'); await expect(t).toHaveAttribute('aria-checked', 'true');
  await t.click(); await expect(t).toHaveAttribute('aria-checked', 'false'); await expect(H.toast(page)).toHaveText('Turned off.');
});
test('M-13 The choice is saved', async ({ page }) => {
  await H.toggle(page, 'Show me in Search results').click();
  expect((await H.stored(page)).accounts.quietheron.profile.prefs.searchable).toBe(false);
});
test('M-14 Disappearing messages turns on', async ({ page }) => {
  const t = H.toggle(page, 'Disappearing messages (7 days)'); await t.click();
  await expect(t).toHaveAttribute('aria-checked', 'true'); await expect(H.toast(page)).toHaveText('Turned on.');
});
test('M-14 Explains the 7 days', async ({ page }) => {
  await expect(H.screen(page)).toContainText('Chat messages are deleted for both of you 7 days after they are sent');
});
test('M-15 App lock saves the choice', async ({ page }) => {
  await H.toggle(page, 'App lock with PIN or Face ID').click();
  expect((await H.stored(page)).accounts.quietheron.profile.prefs.lock).toBe(true);
});
test('M-15 App lock is off at first', async ({ page }) => {
  await expect(H.toggle(page, 'App lock with PIN or Face ID')).toHaveAttribute('aria-checked', 'false');
});
const changePw = async (page, cur, next, next2 = next) => {
  await H.btn(page, 'Change').click();
  await page.fill('#pw-cur', cur); await page.fill('#pw-new', next); await page.fill('#pw-new2', next2);
  await H.btn(page, 'Save new password').click();
};
test('M-16 Change password: the new one works, the old one does not', async ({ page }) => {
  await changePw(page, 'quiet heron walks', 'New!password7');
  await expect(H.toast(page)).toHaveText('Password changed. Use your new password next time you sign in.');
  await H.btn(page, 'Sign out').click();
  await H.signIn(page, 'QuietHeron', 'quiet heron walks'); await expect(page.locator('#li-err')).toContainText("don't match");
  await H.signIn(page, 'QuietHeron', 'New!password7'); await expect(H.tab(page, 'Home')).toBeVisible();
});
test('M-16 Change password checks the current one and the rules', async ({ page }) => {
  await changePw(page, 'wrong one', 'New!password7'); await expect(page.locator('#pw-err')).toHaveText("That isn't your current password.");
  await page.fill('#pw-cur', 'quiet heron walks'); await page.fill('#pw-new', 'short'); await page.fill('#pw-new2', 'short');
  await H.btn(page, 'Save new password').click(); await expect(page.locator('#pw-err')).toHaveText('Your new password needs at least 8 characters.');
  await page.fill('#pw-new', 'New!password7'); await page.fill('#pw-new2', 'New!password8');
  await H.btn(page, 'Save new password').click(); await expect(page.locator('#pw-err')).toHaveText("The two new passwords don't match.");
});
test('M-17 Two-step verification shows a message', async ({ page }) => {
  await H.btn(page, 'Set up').click(); await expect(H.toast(page)).toHaveText('Authenticator-app setup (TOTP) opens here.');
});
test('M-17 The row is in Security', async ({ page }) => {
  await expect(H.screen(page).getByText('Two-step verification', { exact: true })).toBeVisible();
});
test('M-18 Demo has a passkey and can remove it', async ({ page }) => {
  await expect(H.screen(page)).toContainText('Saved on this device.'); await H.btn(page, 'Remove').click();
  await expect(H.toast(page)).toHaveText('Passkey removed from this device.'); await expect(H.btn(page, 'Add a passkey')).toBeVisible();
});
test('M-18 Adding a passkey again', async ({ page }) => {
  await H.btn(page, 'Remove').click(); await H.btn(page, 'Add a passkey').click();
  await expect(H.toast(page)).toHaveText('Passkey added. You can now sign in with your face, fingerprint or PIN.'); await expect(H.btn(page, 'Remove')).toBeVisible();
});
const withBlocked = async page => {
  await H.editStore(page, s => { s.accounts.quietheron.blocked = ['MossyOtter', 'NightLark']; });
  await H.signInDemo(page); await H.tab(page, 'Me').click();
};
test('M-19 Nobody blocked says so', async ({ page }) => {
  await expect(page.locator('#blocked')).toContainText('Blocked people (0)'); await expect(page.locator('#blocked')).toContainText('No one is blocked.');
});
test('M-19 Blocked people are listed', async ({ page }) => {
  await withBlocked(page);
  await expect(page.locator('#blocked')).toContainText('Blocked people (2)'); await expect(page.locator('#blocked')).toContainText('MossyOtter');
});
test('M-20 Unblock removes them', async ({ page }) => {
  await withBlocked(page); await page.locator('#blocked').getByRole('button', { name: 'Unblock' }).first().click();
  await expect(page.locator('#blocked')).toContainText('Blocked people (1)'); await expect(H.toast(page)).toHaveText('MossyOtter is unblocked.');
});
test('M-20 Unblocking is kept', async ({ page }) => {
  await withBlocked(page); await page.locator('#blocked').getByRole('button', { name: 'Unblock' }).first().click();
  await expect(H.toast(page)).toBeVisible();
  expect((await H.stored(page)).accounts.quietheron.blocked).toEqual(['NightLark']);
});
test('M-21 Sections in order', async ({ page }) => {
  const heads = await H.screen(page).getByRole('heading').allInnerTexts();
  expect(heads.filter(h => ['QuietHeron', 'Peer support', 'My profile', 'Edit profile', 'Privacy & visibility', 'Security'].includes(h)))
    .toEqual(['QuietHeron', 'Peer support', 'My profile', 'Edit profile', 'Privacy & visibility', 'Security']);
  const text = await H.screen(page).innerText();
  const at = [text.lastIndexOf('Security'), text.indexOf('Sign out'), text.indexOf('Delete account'), text.indexOf('User is peer support, not a medical or emergency service.')];
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});
test('M-21 No Usage section', async ({ page }) => {
  await expect(H.screen(page).getByRole('heading', { name: 'Usage' })).toHaveCount(0);
});
test('M-22 Sign out returns to Welcome', async ({ page }) => {
  await H.btn(page, 'Sign out').click(); await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
});
test('M-22 After signing out there are no tabs', async ({ page }) => {
  await H.btn(page, 'Sign out').click(); await expect(page.locator('#tabs')).toHaveCount(0);
});
test('M-23 Delete account asks first', async ({ page }) => {
  await H.btn(page, 'Delete account').click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Delete your account?' })).toBeVisible();
});
test('M-23 Keep my account closes the sheet', async ({ page }) => {
  await H.btn(page, 'Delete account').click(); await H.btn(page, 'Keep my account').click();
  await expect(H.sheet(page)).toHaveCount(0); await expect(page.getByRole('heading', { name: 'QuietHeron', level: 1 })).toBeVisible();
});
test('M-24 Delete everything erases a new account', async ({ page }) => {
  await H.signOut(page); await H.createAccount(page, 'Gone_1'); await H.finishSetup(page); await me(page);
  await H.btn(page, 'Delete account').click(); await H.btn(page, 'Delete everything').click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
  await H.signIn(page, 'Gone_1', 'Strong!pass9'); await expect(page.locator('#li-err')).toContainText("don't match");
});
test('M-24 The demo account is restored', async ({ page }) => {
  await H.chip(page, 'Music').click(); await H.btn(page, 'Delete account').click(); await H.btn(page, 'Delete everything').click();
  await expect(H.toast(page)).toHaveText('Account deleted. The demo account has been restored for testing.');
  await H.signInDemo(page); await me(page); await expect(H.chip(page, 'Music')).toHaveAttribute('aria-checked', 'false');
});
