const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); await H.tab(page, 'Me').click(); });
const score = (page, id) => H.data(page, i => match(person(i)).pct, id);

test('M-01 Username and byline at the top', async ({ page }) => {
  await expect(page.locator('.me-name')).toHaveText('QuietHeron');
  await expect(page.locator('#me-byline')).toContainText('New here.');
});
test('M-01 Header has only those two parts', async ({ page }) => {
  await expect(page.locator('.me-head > *')).toHaveCount(2);
  await expect(page.locator('#su-bio')).toHaveCount(0);
});
test('M-02 Change byline saves', async ({ page }) => {
  await page.getByRole('button', { name: 'Change byline' }).click(); await page.fill('#by-in', 'Early riser');
  await page.getByRole('button', { name: 'Save byline' }).click();
  await expect(H.toast(page)).toHaveText('Byline saved.'); await expect(page.locator('#me-byline')).toHaveText('Early riser');
});
test('M-02 Cancel keeps the old byline', async ({ page }) => {
  await page.getByRole('button', { name: 'Change byline' }).click(); await page.fill('#by-in', 'Not saved');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('#me-byline')).toContainText('New here.');
});
test('M-03 Peer support can be turned off', async ({ page }) => {
  await page.locator('#pe-want').uncheck();
  await expect(H.toast(page)).toHaveText('Peer support turned off.'); expect((await H.state(page)).me.wantsPeer).toBe(false);
});
test('M-03 Turning it off lowers a peer supporter\'s score by 12', async ({ page }) => {
  const on = await score(page, 'p4'); await page.locator('#pe-want').uncheck(); const off = await score(page, 'p4');
  expect(on - off).toBe(12);
});
test('M-04 Nominating shows the commitment and badge', async ({ page }) => {
  await expect(page.locator('label[for="pe-be"]')).toContainText('never give medical or dosing advice');
  await page.locator('#pe-be').check();
  await expect(H.toast(page)).toHaveText('You are now a peer supporter. Thank you.');
  await expect(page.locator('.peer-card .peer-on')).toContainText('can now be matched with you');
});
test('M-04 Nominating raises scores of people who want support by 8', async ({ page }) => {
  const before = await score(page, 'p2'); await page.locator('#pe-be').check(); const after = await score(page, 'p2');
  expect(after - before).toBe(8);
});
test('M-05 Tapping a tag adds and removes it', async ({ page }) => {
  const c = H.chip(page, 'Cooking & food');
  await c.click(); expect((await H.state(page)).me.tags).toContain('I08');
  await c.click(); expect((await H.state(page)).me.tags).not.toContain('I08');
});
test('M-05 Tag changes survive switching tabs', async ({ page }) => {
  await H.chip(page, 'Fishing').click(); await H.tab(page, 'Home').click(); await H.tab(page, 'Me').click();
  await expect(H.chip(page, 'Fishing')).toHaveAttribute('aria-pressed', 'true');
});
test('M-06 Interest counter updates', async ({ page }) => {
  await expect(page.locator('#cnt-interests')).toHaveText('3 added'); await H.chip(page, 'Gaming').click();
  await expect(page.locator('#cnt-interests')).toHaveText('4 added');
});
test('M-06 Drug use counter updates', async ({ page }) => {
  await expect(page.locator('#cnt-drugs')).toHaveText('2 added'); await H.chip(page, 'Cannabis').click();
  await expect(page.locator('#cnt-drugs')).toHaveText('3 added');
});
test('M-07 Twenty interests', async ({ page }) => { await expect(page.locator('button[onclick^="App.meTag(\'I"]')).toHaveCount(20); });
test('M-07 Includes the newer interests', async ({ page }) => {
  for (const t of ['Cycling', 'Photography', 'Volunteering & community']) await expect(H.chip(page, t)).toHaveCount(1);
});
test('M-08 Drug use counts 20, 10 and 4', async ({ page }) => {
  await expect(page.locator('button[onclick^="App.meTag(\'M"]')).toHaveCount(20);
  await expect(page.locator('button[onclick^="App.meTag(\'S"]')).toHaveCount(10);
  await expect(page.locator('button[onclick^="App.meTag(\'O"]')).toHaveCount(4);
});
test('M-08 Drug use headings', async ({ page }) => {
  for (const g of ['Medications', 'Other Substances', 'Alcohol, nicotine & gambling']) await expect(page.locator('#screen .label', { hasText: g })).toBeVisible();
});
test('M-09 Twenty mental health conditions', async ({ page }) => { await expect(page.locator('button[onclick^="App.meTag(\'D"]')).toHaveCount(20); });
test('M-09 Includes panic disorder and self-harm', async ({ page }) => {
  for (const t of ['Panic disorder', 'Self-harm']) await expect(H.chip(page, t)).toHaveCount(1);
});
test('M-10 Eleven stages', async ({ page }) => { await expect(page.locator('#su-stage option')).toHaveCount(11); });
test('M-10 Changing the stage shows on Home', async ({ page }) => {
  await page.locator('#su-stage').selectOption('early3'); await H.tab(page, 'Home').click();
  await expect(page.locator('#screen h2').first().locator('xpath=following-sibling::p')).toHaveText('Early recovery (under 3 months)');
});
test('M-11 Fourteen looking-for options', async ({ page }) => { await expect(page.locator('button[onclick^="App.meLook"]')).toHaveCount(14); });
test('M-11 Looking-for choices save', async ({ page }) => {
  await H.chip(page, 'A book buddy').click(); expect((await H.state(page)).me.looking).toContain('books');
});
test('M-12 Visibility change confirms', async ({ page }) => {
  await page.locator('#vis-subs').selectOption('me'); await expect(H.toast(page)).toHaveText('Visibility updated.');
});
test('M-12 Visibility change is kept', async ({ page }) => {
  await page.locator('#vis-mh').selectOption('everyone'); await H.tab(page, 'Home').click(); await H.tab(page, 'Me').click();
  await expect(page.locator('#vis-mh')).toHaveValue('everyone');
});
test('M-13 Show me in Search results saves', async ({ page }) => {
  await page.locator('#t-searchable').uncheck(); expect((await H.state(page)).prefs.searchable).toBe(false);
});
test('M-13 Label wording', async ({ page }) => { await expect(page.locator('label[for="t-searchable"]')).toContainText('Show me in Search results'); });
test('M-14 Disappearing messages hides old messages', async ({ page }) => {
  await page.evaluate(() => { S.convos.p1.unshift({ f: 'them', t: 'An old message from last month', ts: Date.now() - 8 * 86400000 }); });
  await page.locator('#t-disappearing').check(); await H.openChatWith(page, 'MossyOtter');
  await expect(page.getByText('Disappearing messages are on.')).toBeVisible();
  await expect(page.getByText('An old message from last month')).toHaveCount(0);
});
test('M-14 With it off, old messages stay', async ({ page }) => {
  await page.evaluate(() => { S.convos.p1.unshift({ f: 'them', t: 'An old message from last month', ts: Date.now() - 8 * 86400000 }); });
  await H.openChatWith(page, 'MossyOtter');
  await expect(page.getByText('An old message from last month')).toBeVisible();
  await expect(page.getByText('Disappearing messages are on.')).toHaveCount(0);
});
test('M-15 App lock confirms', async ({ page }) => { await page.locator('#t-lock').check(); await expect(H.toast(page)).toHaveText('Turned on.'); });
test('M-15 App lock choice is saved', async ({ page }) => { await page.locator('#t-lock').check(); expect((await H.state(page)).prefs.lock).toBe(true); });
test('M-16 Change password shows a message', async ({ page }) => {
  await page.locator('.line', { hasText: 'Password' }).getByRole('button', { name: 'Change' }).click();
  await expect(H.toast(page)).toContainText('Password change');
});
test('M-16 Password line is in Security', async ({ page }) => {
  await expect(page.locator('.card', { hasText: 'Security' }).locator('.line', { hasText: 'Password' })).toBeVisible();
});
test('M-17 Two-step verification shows a message', async ({ page }) => {
  await page.getByRole('button', { name: 'Set up' }).click(); await expect(H.toast(page)).toContainText('Authenticator');
});
test('M-17 Two-step line is in Security', async ({ page }) => { await expect(page.locator('.line', { hasText: 'Two-step verification' })).toBeVisible(); });
test('M-18 Passkey can be removed and added back', async ({ page }) => {
  await page.locator('.line', { hasText: 'Passkey' }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.line', { hasText: 'Passkey' })).toContainText('Not set up');
  await page.locator('.line', { hasText: 'Passkey' }).getByRole('button', { name: 'Add a passkey' }).click();
  await expect(page.locator('.line', { hasText: 'Passkey' })).toContainText('Saved on this device');
});
test('M-18 Without a passkey, passkey sign-in is refused', async ({ page }) => {
  await page.locator('.line', { hasText: 'Passkey' }).getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await expect(page.locator('#li-err')).toContainText('No passkey');
});
test('M-19 Nobody blocked at first', async ({ page }) => { await expect(page.getByText('No one is blocked.')).toBeVisible(); });
test('M-19 Blocked people are listed', async ({ page }) => {
  await page.evaluate(() => { S.blocked = ['p3', 'm20']; render(); });
  await expect(page.getByText('Blocked people (2)')).toBeVisible();
  await expect(page.locator('.line', { hasText: 'PaperFern' })).toBeVisible();
});
test('M-20 Unblock removes them from the list', async ({ page }) => {
  await page.evaluate(() => { S.blocked = ['p3']; render(); });
  await page.locator('.line', { hasText: 'PaperFern' }).getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText('No one is blocked.')).toBeVisible();
});
test('M-20 Unblocked people are back in Search', async ({ page }) => {
  await page.evaluate(() => { S.blocked = ['p3']; render(); });
  await page.locator('.line', { hasText: 'PaperFern' }).getByRole('button', { name: 'Unblock' }).click();
  await H.tab(page, 'Search').click(); await expect(page.locator('#match-count')).toHaveText('100 people');
});
test('M-21 Section order', async ({ page }) => {
  expect(await page.locator('#screen .card h2, #screen .card h3').allTextContents()).toEqual(['Peer support', 'My profile', 'Edit profile', 'Privacy & visibility', 'Security']);
  expect(await page.locator('#screen > .btn').allTextContents()).toEqual(['Sign out', 'Delete account']);
});
test('M-21 No Usage section', async ({ page }) => {
  await expect(page.locator('#screen')).not.toContainText('Usage'); await expect(page.locator('.stat')).toHaveCount(0);
});
test('M-22 Sign out returns to Welcome', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
});
test('M-22 You can sign back in', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign out' }).click(); await H.signIn(page);
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('M-23 Delete asks for confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Delete your account?' })).toBeVisible();
  await expect(H.sheet(page).getByRole('button')).toHaveText(['Delete everything', 'Keep my account']);
});
test('M-23 Keep my account cancels', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete account' }).click();
  await H.sheet(page).getByRole('button', { name: 'Keep my account' }).click(); await expect(H.sheet(page)).toHaveCount(0);
});
test('M-24 Delete everything returns to Welcome and restores the demo', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete account' }).click();
  await H.sheet(page).getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
  await H.signIn(page); await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('M-24 Delete everything clears your changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Change byline' }).click(); await page.fill('#by-in', 'to be deleted'); await page.getByRole('button', { name: 'Save byline' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click(); await H.sheet(page).getByRole('button', { name: 'Delete everything' }).click();
  await H.signIn(page); await H.tab(page, 'Me').click();
  await expect(page.locator('#me-byline')).not.toHaveText('to be deleted');
});
