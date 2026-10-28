const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.createAccount(page, 'Setup_User', 'Strong!pass9'); });
const save = page => page.getByRole('button', { name: 'Save profile and see my matches' }).click();

test('FP-01 Four numbered sections and no tabs', async ({ page }) => {
  await expect(page.locator('#screen .card h3')).toHaveText(['1. About you', '2. Peer support', '3. Your three choices', '4. Who can see what']);
  await expect(page.locator('#tabs')).toBeHidden();
});
test('FP-01 Shows again on sign-in until saved', async ({ page }) => {
  await page.reload(); await H.signIn(page, 'Setup_User', 'Strong!pass9');
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
});
test('FP-02 Byline saves as you type, up to 240', async ({ page }) => {
  await expect(page.locator('#su-bio')).toHaveAttribute('maxlength', '240');
  await page.locator('#su-bio').fill('Hello from setup');
  expect((await H.state(page)).me.bio).toBe('Hello from setup');
});
test('FP-02 Byline shows on the Me page after setup', async ({ page }) => {
  await page.locator('#su-bio').fill('Morning walker'); await H.finishSetup(page);
  await H.tab(page, 'Me').click(); await expect(page.locator('#me-byline')).toHaveText('Morning walker');
});
test('FP-03 Eleven stages, default Prefer not to say', async ({ page }) => {
  await expect(page.locator('#su-stage option')).toHaveCount(11);
  await expect(page.locator('#su-stage')).toHaveValue('na');
});
test('FP-03 Includes the new early-recovery stages', async ({ page }) => {
  for (const s of ['I just gave up', 'Early recovery (under 3 months)', 'Early recovery (under 6 months)', 'Early recovery (under a year)'])
    await expect(page.locator('#su-stage option', { hasText: s })).toHaveCount(1);
});
test('FP-04 Fourteen options that toggle', async ({ page }) => {
  await expect(page.locator('button[onclick^="App.meLook"]')).toHaveCount(14);
  const b = H.chip(page, 'A book buddy'); await b.click(); await expect(b).toHaveAttribute('aria-pressed', 'true');
});
test('FP-04 Someone to chat with is selected to start', async ({ page }) => {
  await expect(H.chip(page, 'Someone to chat with')).toHaveAttribute('aria-pressed', 'true');
});
test('FP-05 Yes and Not right now save the answer', async ({ page }) => {
  await page.check('input[name="su-peer"][value="yes"]'); expect((await H.state(page)).me.wantsPeer).toBe(true);
  await page.check('input[name="su-peer"][value="no"]'); expect((await H.state(page)).me.wantsPeer).toBe(false);
});
test('FP-05 Neither answer is picked to start', async ({ page }) => {
  await expect(page.locator('fieldset.ask legend')).toHaveText('Would you like peer support?');
  await expect(page.locator('input[name="su-peer"]:checked')).toHaveCount(0);
});
test('FP-06 Counters update', async ({ page }) => {
  await H.chip(page, 'Music').click(); await expect(page.locator('#cnt-interests')).toHaveText('1 added');
  await H.chip(page, 'ADHD').click(); await expect(page.locator('#cnt-mh')).toHaveText('1 added');
});
test('FP-06 Full lists: 20 interests, 34 drug use, 20 mental health', async ({ page }) => {
  await expect(page.locator('button[onclick^="App.meTag(\'I"]')).toHaveCount(20);
  await expect(page.locator('button[onclick^="App.meTag(\'M"], button[onclick^="App.meTag(\'S"], button[onclick^="App.meTag(\'O"]')).toHaveCount(34);
  await expect(page.locator('button[onclick^="App.meTag(\'D"]')).toHaveCount(20);
});
test('FP-07 Three settings with three options', async ({ page }) => {
  for (const id of ['#vis-interests', '#vis-subs', '#vis-mh']) await expect(page.locator(id + ' option')).toHaveCount(3);
});
test('FP-07 Private defaults for drug use and mental health', async ({ page }) => {
  await expect(page.locator('#vis-interests')).toHaveValue('everyone');
  await expect(page.locator('#vis-subs')).toHaveValue('matches');
  await expect(page.locator('#vis-mh')).toHaveValue('matches');
});
test('FP-08 Peer support answer is required', async ({ page }) => {
  await save(page); await expect(page.locator('#su-err')).toHaveText('Please answer whether you would like peer support.');
});
test('FP-08 An interest is required', async ({ page }) => {
  await page.check('input[name="su-peer"][value="no"]'); await save(page);
  await expect(page.locator('#su-err')).toContainText('Pick at least one interest');
});
test('FP-09 Matches screen lists all 100, highest first, no tabs', async ({ page }) => {
  await H.finishSetup(page, 'Walking & hiking', { stayOnMatches: true });
  await expect(page.locator('#tabs')).toBeHidden();
  const rows = page.locator('#match-list .person'); await expect(rows).toHaveCount(100);
  const p = (await rows.locator('.match').allTextContents()).map(t => parseInt(t));
  expect([...p].sort((a, b) => b - a)).toEqual(p);
});
test('FP-09 Peer supporters are marked and both buttons work', async ({ page }) => {
  await H.finishSetup(page, 'Walking & hiking', { wantsPeer: true, stayOnMatches: true });
  await expect(page.locator('#match-list .pill.peer')).toHaveCount(21);
  await expect(page.getByText('Peer supporters are marked, because you asked for peer support.')).toBeVisible();
  await page.getByRole('button', { name: 'Refine on the Search page' }).click();
  await expect(H.tab(page, 'Search')).toHaveAttribute('aria-current', 'page');
});
