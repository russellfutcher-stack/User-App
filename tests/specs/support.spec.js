const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); await H.tab(page, 'Support').click(); });

test('SP-01 Headings in order', async ({ page }) => {
  expect(await page.locator('#screen h2').allTextContents()).toEqual(['Support', 'Peer supporters', 'Help services by country', 'Overdose information', 'Ask for a review']);
});
test('SP-01 Disclaimer last', async ({ page }) => {
  await expect(page.locator('#screen > :last-child')).toHaveText('User is peer support, not a medical or emergency service.');
});
test('SP-02 Five peer supporters with Ask buttons', async ({ page }) => {
  await expect(page.locator('.peer-row')).toHaveCount(5);
  const first = await page.locator('.peer-row .name').first().textContent();
  await page.locator('.peer-row').first().getByRole('button', { name: `Ask ${first} for support` }).click();
  await expect(page.locator('#bar .title')).toHaveText(first);
});
test('SP-02 They are the best-matched peer supporters', async ({ page }) => {
  const want = await H.data(page, () => PEOPLE.filter(p => p.peer).map(p => ({ h: p.handle, s: match(p).pct })).sort((a, b) => b.s - a.s).slice(0, 5).map(x => x.h));
  await expect(page.locator('.peer-row .name')).toHaveText(want);
});
test('SP-03 Another message changes the message', async ({ page }) => {
  const a = await page.locator('#uplift').textContent(); await page.getByRole('button', { name: 'Another message' }).click();
  await expect(page.locator('#uplift')).not.toHaveText(a);
});
test('SP-03 Messages come from the supportive list', async ({ page }) => {
  const t = await page.locator('#uplift').textContent(); expect(await H.data(page, x => UPLIFT.includes(x), t)).toBe(true);
});
test('SP-04 Choosing a country shows its services', async ({ page }) => {
  await expect(page.locator('#country option')).toHaveCount(33); await expect(page.locator('#country')).toHaveValue('United Kingdom');
  await page.locator('#country').selectOption('Australia');
  const b = page.locator('section[aria-labelledby="hs-h"] > .lines');
  await expect(b.locator('.line.em .num')).toHaveText('000'); await expect(b).toContainText('13 11 14');
});
test('SP-04 The country is remembered', async ({ page }) => {
  await page.locator('#country').selectOption('Canada'); await H.tab(page, 'Home').click(); await H.tab(page, 'Support').click();
  await expect(page.locator('#country')).toHaveValue('Canada');
});
test('SP-05 Show all lists 33 countries', async ({ page }) => {
  await page.locator('details.all-countries summary').click(); await expect(page.locator('.country-block')).toHaveCount(33);
});
test('SP-05 Every country has an emergency number', async ({ page }) => {
  await page.locator('details.all-countries summary').click(); await expect(page.locator('.country-block .line.em')).toHaveCount(33);
});
test('SP-06 Overdose headings', async ({ page }) => {
  await expect(page.locator('section.od h3')).toHaveText(['Signs of an opioid overdose', 'Signs of a stimulant overdose', 'What to do', 'Lower your risk']);
});
test('SP-06 Overdose advice covers emergency calls and naloxone', async ({ page }) => {
  await expect(page.locator('section.od')).toContainText('call your emergency number now'); await expect(page.locator('section.od')).toContainText('naloxone');
});
test('SP-07 Review form fields', async ({ page }) => {
  await page.locator('#screen').getByRole('button', { name: 'Ask for a review' }).click();
  await expect(page.locator('#hr-topic option')).toHaveCount(5); await expect(page.locator('#hr-text')).toHaveAttribute('maxlength', '500');
});
test('SP-07 Form explains how reviews are decided', async ({ page }) => {
  await page.locator('#screen').getByRole('button', { name: 'Ask for a review' }).click();
  await expect(H.sheet(page)).toContainText('Every review is decided straight away');
});
test('SP-08 Under 10 characters is refused', async ({ page }) => {
  await H.requestReview(page, 'Something else', 'short'); await expect(page.locator('#hr-err')).toContainText('at least 10 characters');
});
test('SP-08 Ten characters is accepted', async ({ page }) => {
  await H.requestReview(page, 'Something else', '1234567890'); await expect(H.sheet(page).getByRole('heading', { name: 'Review requested' })).toBeVisible();
});
test('SP-09 Review requested with a case number', async ({ page }) => {
  await H.requestReview(page); await expect(H.sheet(page)).toContainText('HR-1001');
});
test('SP-09 Decided within seconds and listed', async ({ page }) => {
  await H.requestReview(page); await expect(page.locator('#rv-status')).not.toHaveText('Checking…', { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('[aria-label="Your reviews"] .line .pill')).toHaveText(/^Decided: /);
});
test('SP-10 Arbitrator changes show with their note', async ({ page }) => {
  await page.evaluate(() => { S.cases = [{ id: 'HR-1001', topic: 'Something else', status: 'Decided: Overturned', note: 'Your message was fine.', by: 'Arbitrator', due: 'Mon' }]; render(); });
  await expect(page.locator('[aria-label="Your reviews"]')).toContainText('Arbitrator: Your message was fine.');
});
test('SP-10 Changed action shows the new outcome', async ({ page }) => {
  await page.evaluate(() => { S.cases = [{ id: 'HR-1002', topic: 'A report I made', status: 'Decided: Action changed', note: 'The member was warned.', by: 'Arbitrator', due: 'Mon' }]; render(); });
  await expect(page.locator('[aria-label="Your reviews"] .pill')).toHaveText('Decided: Action changed');
});
test('SP-11 Naloxone review is overturned automatically', async ({ page }) => {
  await H.requestReview(page, 'A message that was blocked', 'My message about my naloxone training was blocked and I don\'t know why.');
  await expect(page.locator('#rv-status')).toContainText('allowed', { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('[aria-label="Your reviews"] .pill')).toHaveText('Decided: Overturned');
});
test('SP-11 Unclear review keeps the safest outcome', async ({ page }) => {
  await H.requestReview(page, 'A message that was blocked', 'Please look at my blocked message.');
  await expect(page.locator('#rv-status')).toContainText('It will be checked again', { timeout: 5000 });
});
test('SP-12 Show all peer supporters, then fewer', async ({ page }) => {
  await page.getByRole('button', { name: 'Show all 21 peer supporters' }).click(); await expect(page.locator('.peer-row')).toHaveCount(21);
  await page.getByRole('button', { name: 'Show fewer' }).click(); await expect(page.locator('.peer-row')).toHaveCount(5);
});
test('SP-12 Blocked peer supporters are left out', async ({ page }) => {
  await page.evaluate(() => { S.blocked = ['p4']; render(); });
  await page.getByRole('button', { name: /Show all 20 peer supporters/ }).click();
  await expect(page.locator('.peer-row', { hasText: 'SteadyBadger' })).toHaveCount(0);
});
