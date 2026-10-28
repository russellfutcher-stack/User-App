const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); });
const rows = page => page.locator('table[aria-label="Decided"] tbody tr');
async function memberReview(page, text = 'Please look at my blocked message.') {
  await H.signIn(page); await H.requestReview(page, 'A message that was blocked', text);
  await expect(page.locator('#rv-status')).not.toHaveText('Checking…', { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click(); await H.signOut(page);
}

test('AD-01 Arbitrator sign-in opens the dashboard without tabs', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.getByRole('heading', { name: 'Arbitrator dashboard' })).toBeVisible(); await expect(page.locator('#tabs')).toBeHidden();
});
test('AD-01 Wrong arbitrator password is refused', async ({ page }) => {
  await H.signIn(page, 'Arbitrator', 'wrong'); await expect(page.locator('#li-err')).toContainText("don't match");
});
test('AD-02 Seven summary figures', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('.kpis .fig')).toHaveCount(7);
  await expect(page.locator('.kpis .fig', { hasText: 'active today' })).toContainText('1,284');
});
test('AD-02 Flagged figure matches the flagged rows', async ({ page }) => {
  await H.signInArbitrator(page);
  const n = await rows(page).filter({ has: page.locator('.pill', { hasText: /^Flagged$/ }) }).count();
  await expect(page.locator('.kpis .fig', { hasText: 'flagged for a check' }).locator('b')).toHaveText(String(n));
});
test('AD-03 One Decided table with every case', async ({ page }) => {
  await H.signInArbitrator(page); await expect(rows(page)).toHaveCount(9); await expect(page.locator('tr.urgent')).toHaveCount(2);
  await expect(page.locator('table[aria-label="Needs a person"]')).toHaveCount(0);
});
test('AD-03 A member\'s review appears live', async ({ page }) => {
  await memberReview(page); await H.signInArbitrator(page);
  await expect(rows(page)).toHaveCount(10); await expect(rows(page).first()).toContainText('This browser');
});
test('AD-04 A note is required to change a decision', async ({ page }) => {
  await H.signInArbitrator(page); await rows(page).filter({ hasText: 'HR-0968' }).getByRole('button', { name: 'Check' }).click();
  await H.sheet(page).getByRole('button', { name: 'Overturn it' }).click(); await expect(page.locator('#arb-err')).toContainText('Add a short note');
});
test('AD-04 Changing a decision shows by Arbitrator', async ({ page }) => {
  await H.signInArbitrator(page); await rows(page).filter({ hasText: 'HR-0974' }).getByRole('button', { name: 'Check' }).click();
  await page.fill('#arb-note', 'A group chat invite is fine this time.'); await H.sheet(page).getByRole('button', { name: 'Overturn it' }).click();
  await expect(H.toast(page)).toHaveText('HR-0974 decided: Overturned.');
  const r = rows(page).filter({ hasText: 'HR-0974' }); await expect(r.locator('.pill').first()).toHaveText('Decided: Overturned'); await expect(r).toContainText('by Arbitrator');
});
test('AD-05 The arbitrator\'s decision reaches the member', async ({ page }) => {
  await memberReview(page); await H.signInArbitrator(page);
  await rows(page).filter({ hasText: 'HR-1001' }).getByRole('button', { name: 'Check' }).click();
  await page.fill('#arb-note', 'Your message was fine and has been sent.'); await H.sheet(page).getByRole('button', { name: 'Overturn it' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click(); await H.signIn(page); await H.tab(page, 'Support').click();
  await expect(page.locator('[aria-label="Your reviews"] .pill')).toHaveText('Decided: Overturned');
});
test('AD-05 The member sees the arbitrator\'s note', async ({ page }) => {
  await memberReview(page); await H.signInArbitrator(page);
  await rows(page).filter({ hasText: 'HR-1001' }).getByRole('button', { name: 'Check' }).click();
  await page.fill('#arb-note', 'Checked by a person.'); await H.sheet(page).getByRole('button', { name: 'Uphold the decision' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click(); await H.signIn(page); await H.tab(page, 'Support').click();
  await expect(page.locator('[aria-label="Your reviews"]')).toContainText('Arbitrator: Checked by a person.');
});
test('AD-06 Five reasons for blocked messages', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('[aria-label="Blocked messages by reason"] .hbar')).toHaveCount(5);
});
test('AD-06 Four safety figures', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('section[aria-labelledby="ds-h"] .fig')).toHaveCount(4);
});
test('AD-07 Seven report reasons', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('[aria-label="Reports by reason"] .hbar')).toHaveCount(7);
});
test('AD-07 Reports made in this browser are counted', async ({ page }) => {
  await H.signIn(page); await page.evaluate(() => { S.reported = 2; save(); }); await H.signOut(page); await H.signInArbitrator(page);
  await expect(page.locator('section[aria-labelledby="dr-h"]')).toContainText('Reports made in this browser: 2.');
});
test('AD-08 Three most-blocked members', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('section[aria-labelledby="db-h"] tbody tr')).toHaveCount(3);
});
test('AD-08 Live blocks from this browser', async ({ page }) => {
  await H.signIn(page); await page.evaluate(() => { S.blocked = ['p3']; save(); }); await H.signOut(page); await H.signInArbitrator(page);
  await expect(page.locator('section[aria-labelledby="db-h"]')).toContainText('Blocked by the member in this browser: PaperFern.');
});
test('AD-09 Eight countries, UK first', async ({ page }) => {
  await H.signInArbitrator(page); const b = page.locator('[aria-label="Members by country"] .hbar');
  await expect(b).toHaveCount(8); await expect(b.first()).toContainText('United Kingdom');
});
test('AD-09 Bars are drawn to scale', async ({ page }) => {
  await H.signInArbitrator(page);
  const w = await page.locator('[aria-label="Members by country"] .ht i').evaluateAll(e => e.map(x => parseFloat(x.style.width)));
  expect(w[0]).toBe(100); expect(w[1]).toBeCloseTo(1206 / 1842 * 100, 0);
});
test('AD-10 Three peer support figures', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('section[aria-labelledby="dk-h"] .fig')).toHaveCount(3);
});
test('AD-10 No check-in chart', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('svg.spark')).toHaveCount(0);
});
test('AD-11 Six rooms and health figures', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('section[aria-labelledby="dm-h"] .fig')).toHaveCount(6);
});
test('AD-11 Uptime is shown', async ({ page }) => {
  await H.signInArbitrator(page); await expect(page.locator('section[aria-labelledby="dm-h"]')).toContainText('99.97%');
});
test('AD-12 Sign out returns to Welcome', async ({ page }) => {
  await H.signInArbitrator(page); await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
});
test('AD-12 A member can sign in afterwards', async ({ page }) => {
  await H.signInArbitrator(page); await page.getByRole('button', { name: 'Sign out' }).click(); await H.signIn(page);
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('AD-13 Naloxone and "I used to sell" cases are overturned by the AI Review Agent', async ({ page }) => {
  await H.signInArbitrator(page);
  for (const id of ['HR-0978', 'HR-0983']) { const r = rows(page).filter({ hasText: id }); await expect(r.locator('.pill').first()).toHaveText('Decided: Overturned'); await expect(r).toContainText('by AI Review Agent'); }
});
test('AD-13 Danger, under-18 and removal are decided by the agent; unsure cases are flagged', async ({ page }) => {
  await H.signInArbitrator(page);
  for (const id of ['HR-0991', 'HR-0989', 'HR-0985']) { const r = rows(page).filter({ hasText: id }); await expect(r.locator('.pill').first()).toHaveText('Decided: Action changed'); await expect(r).toContainText('by AI Review Agent'); }
  await expect(rows(page).filter({ hasText: 'HR-0968' }).locator('.pill', { hasText: 'Flagged' })).toHaveCount(1);
});
