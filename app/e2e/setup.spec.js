const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const err = page => page.locator('#su-err');
const save = page => H.btn(page, 'Save profile and see my matches').click();
test.beforeEach(async ({ page }) => { await H.open(page); await H.createAccount(page, 'Setter_1'); });

test('FP-01 Welcome line and four numbered sections, no tabs', async ({ page }) => {
  await expect(page.getByRole('heading', { name: "Welcome, Setter_1. Let's set up your profile." })).toBeVisible();
  for (const h of ['1. About you', '2. Peer support', '3. Your three choices', '4. Who can see what']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
  await expect(page.locator('#tabs')).toHaveCount(0);
});
test('FP-01 Signing in before setup is done opens setup again', async ({ page }) => {
  await page.reload(); await H.signIn(page, 'Setter_1', 'Strong!pass9');
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
});
test('FP-02 Byline is optional and saves', async ({ page }) => {
  await page.fill('#su-bio', 'Night walker, cat person.'); await H.finishSetup(page); await H.tab(page, 'Me').click();
  await expect(page.locator('#me-byline')).toHaveText('Night walker, cat person.');
});
test('FP-02 Byline stops at 240 characters', async ({ page }) => {
  await page.fill('#su-bio', 'x'.repeat(300)); await expect(page.locator('#su-bio')).toHaveValue('x'.repeat(240));
});
test('FP-03 Eleven stages including the new ones', async ({ page }) => {
  const opts = await page.locator('#su-stage option').allTextContents();
  expect(opts).toHaveLength(11);
  for (const o of ['I just gave up', 'Early recovery (under 3 months)', 'Early recovery (under 6 months)', 'Early recovery (under a year)']) expect(opts).toContain(o);
});
test('FP-03 Default is Prefer not to say', async ({ page }) => {
  await expect(page.locator('#su-stage')).toHaveValue('na');
  await page.locator('#su-stage').selectOption('quit'); await expect(page.locator('#su-stage')).toHaveValue('quit');
});
test('FP-04 Fourteen looking-for options', async ({ page }) => {
  await expect(H.screen(page).getByRole('group', { name: "I'm looking for" }).getByRole('checkbox')).toHaveCount(14);
});
test('FP-04 Tapping an option turns it on', async ({ page }) => {
  const c = H.chip(page, 'A walking buddy'); await c.click(); await expect(c).toHaveAttribute('aria-checked', 'true');
});
test('FP-05 Must answer the peer support question', async ({ page }) => {
  await H.chip(page, 'Music').click(); await save(page);
  await expect(err(page)).toHaveText('Please answer whether you would like peer support.');
});
test('FP-05 Yes or Not right now can be chosen', async ({ page }) => {
  const yes = page.getByRole('radio', { name: 'Yes, match me with peer supporters' }), no = page.getByRole('radio', { name: 'Not right now' });
  await yes.click(); await expect(yes).toHaveAttribute('aria-checked', 'true');
  await no.click(); await expect(no).toHaveAttribute('aria-checked', 'true'); await expect(yes).toHaveAttribute('aria-checked', 'false');
});
test('FP-06 Three choices with counters', async ({ page }) => {
  for (const k of ['interests', 'drugs', 'mh']) await expect(page.locator(`#cnt-${k}`)).toHaveText('0 added');
  await H.chip(page, 'Music').click(); await H.chip(page, 'Kratom').click();
  await expect(page.locator('#cnt-interests')).toHaveText('1 added'); await expect(page.locator('#cnt-drugs')).toHaveText('1 added');
});
test('FP-06 Same lists as the Me page', async ({ page }) => {
  await expect(H.screen(page).getByRole('checkbox')).toHaveCount(20 + 20 + 10 + 4 + 20 + 14);
});
test('FP-07 Privacy defaults', async ({ page }) => {
  await expect(page.locator('#vis-interests')).toHaveValue('everyone');
  await expect(page.locator('#vis-subs')).toHaveValue('matches'); await expect(page.locator('#vis-mh')).toHaveValue('matches');
});
test('FP-07 Three options each', async ({ page }) => {
  expect(await page.locator('#vis-mh option').allTextContents()).toEqual(['Everyone', 'People I chat with', 'Only me (still used for matching)']);
});
test('FP-08 Needs at least one interest', async ({ page }) => {
  await page.getByRole('radio', { name: 'Not right now' }).click(); await H.chip(page, 'Depression').click(); await save(page);
  await expect(err(page)).toHaveText('Pick at least one interest so we can find people for you.');
});
test('FP-08 Saving opens the app and is kept', async ({ page }) => {
  await H.finishSetup(page); await expect(H.toast(page)).toContainText('Profile saved.');
  await page.reload(); await H.signIn(page, 'Setter_1', 'Strong!pass9'); await expect(H.tab(page, 'Home')).toBeVisible();
});
