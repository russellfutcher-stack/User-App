const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); await H.tab(page, 'Search').click(); });
const pcts = async page => (await page.locator('#results .match').allTextContents()).map(t => parseInt(t));
const has = (ids) => p => ids.some(t => p.tags.includes(t));

test('DS-01 Your Matches at the top with all 100 members', async ({ page }) => {
  expect(await page.locator('#screen h2').nth(1).textContent()).toBe('Your Matches');
  await expect(page.locator('#match-count')).toHaveText('100 people');
});
test('DS-01 Highest score first', async ({ page }) => {
  await page.getByRole('button', { name: /Show all/ }).click();
  const p = await pcts(page); expect([...p].sort((a, b) => b - a)).toEqual(p);
});
test('DS-02 Top 3, then all, then top 3', async ({ page }) => {
  await expect(page.locator('#results .person')).toHaveCount(3);
  await page.getByRole('button', { name: 'Show all 100 matches' }).click(); await expect(page.locator('#results .person')).toHaveCount(100);
  await page.getByRole('button', { name: 'Show top 3' }).click(); await expect(page.locator('#results .person')).toHaveCount(3);
});
test('DS-02 No Show all button when 3 or fewer match', async ({ page }) => {
  await H.chip(page, 'Body dysmorphic disorder').click(); await H.runSearch(page);
  await expect(page.getByRole('button', { name: /Show all/ })).toHaveCount(0);
});
test('DS-03 Tiles start On and turn Off and On', async ({ page }) => {
  const t = page.locator('#screen .path');
  for (let i = 0; i < 3; i++) await expect(t.nth(i)).toHaveAttribute('aria-pressed', 'true');
  await t.nth(2).click(); await expect(t.nth(2).locator('.pc')).toHaveText('Off');
  await t.nth(2).click(); await expect(t.nth(2).locator('.pc')).toHaveText('On');
});
test('DS-03 Turning a choice off removes its picks', async ({ page }) => {
  await H.chip(page, 'Alcohol').click(); await page.locator('#screen .path', { hasText: 'Drug use' }).click();
  await expect(page.getByText('Finding people with')).toHaveCount(0);
});
test('DS-04 Picking Gaming finds the right number after Search', async ({ page }) => {
  const want = await H.data(page, () => PEOPLE.filter(p => p.tags.includes('I06')).length);
  await H.chip(page, 'Gaming').click(); await expect(page.locator('#match-count')).toHaveText('100 people');
  await H.runSearch(page); expect(await H.count(page)).toBe(want);
});
test('DS-04 Interest shows all 20 interests', async ({ page }) => {
  await expect(page.locator('[aria-label="Interest: Interests"] .chip')).toHaveCount(20);
});
test('DS-05 Across choices, every choice must match', async ({ page }) => {
  const want = await H.data(page, () => PEOPLE.filter(p => p.tags.includes('I02') && p.tags.includes('O01') && p.tags.includes('D02')).length);
  for (const c of ['Pets & dog walking', 'Alcohol', 'Generalised anxiety']) await H.chip(page, c).click();
  await H.runSearch(page); expect(await H.count(page)).toBe(want);
});
test('DS-05 Within a choice, any pick counts', async ({ page }) => {
  const want = await H.data(page, () => PEOPLE.filter(p => p.tags.includes('I06') || p.tags.includes('I04')).length);
  await H.chip(page, 'Gaming').click(); await H.chip(page, 'Books & reading').click(); await H.runSearch(page);
  expect(await H.count(page)).toBe(want);
});
test('DS-06 Summary lists choice picks', async ({ page }) => {
  await H.chip(page, 'Music').click(); await H.chip(page, 'Depression').click();
  await expect(page.locator('.card', { hasText: 'Finding people with' }).locator('.tag')).toHaveText(['Music', 'Depression']);
});
test('DS-06 Summary includes Looking for and Peer supporters only', async ({ page }) => {
  await H.chip(page, 'A book buddy').click(); await H.chip(page, 'Peer supporters only').click();
  await expect(page.locator('.card', { hasText: 'Finding people with' }).locator('.tag')).toHaveText(['A book buddy', 'Peer supporters only']);
});
test('DS-07 Clear all brings back all 100', async ({ page }) => {
  await H.chip(page, 'Music').click(); await H.runSearch(page);
  await page.getByRole('button', { name: 'Clear all filters' }).click(); await expect(page.locator('#match-count')).toHaveText('100 people');
});
test('DS-07 Clear all resets picks and tiles', async ({ page }) => {
  await page.locator('#screen .path', { hasText: 'Mental health' }).click(); await H.chip(page, 'Music').click(); await H.chip(page, 'A walking buddy').click();
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.locator('#screen .path[aria-pressed="true"]')).toHaveCount(3);
  await expect(page.locator('#screen button.chip[aria-pressed="true"]')).toHaveCount(0);
});
test('DS-08 Looking for: a walking buddy', async ({ page }) => {
  const want = await H.data(page, () => PEOPLE.filter(p => meets('walk', p.looking)).length);
  await H.chip(page, 'A walking buddy').click(); await H.runSearch(page); expect(await H.count(page)).toBe(want);
});
test('DS-08 Looking for pairs complements and ranks better fits first', async ({ page }) => {
  await H.chip(page, 'Someone to chat with').click(); await H.chip(page, 'Pet walks').click(); await H.runSearch(page);
  await page.getByRole('button', { name: /Show all/ }).click();
  await expect(page.locator('#results .person', { hasText: 'SteadyBadger' })).toHaveCount(1); // offers listening
  const names = await page.locator('#results .person .name').allTextContents();
  const fits = await H.data(page, n => n.map(h => { const p = PEOPLE.find(x => x.handle === h); return ['chat', 'pets'].filter(l => meets(l, p.looking)).length; }), names);
  expect([...fits].sort((a, b) => b - a)).toEqual(fits);
});
test('DS-09 Peer supporters only shows all 21', async ({ page }) => {
  await H.chip(page, 'Peer supporters only').click(); await H.runSearch(page);
  await expect(page.locator('#match-count')).toHaveText('21 people');
});
test('DS-09 Every result has the badge', async ({ page }) => {
  await H.chip(page, 'Peer supporters only').click(); await H.runSearch(page); await page.getByRole('button', { name: /Show all/ }).click();
  await expect(page.locator('#results .person .pill.peer')).toHaveCount(21);
});
test('DS-10 No-results message', async ({ page }) => {
  await H.chip(page, 'Body dysmorphic disorder').click(); await H.runSearch(page);
  await expect(page.getByText('No one matches all of those yet.')).toBeVisible();
});
test('DS-10 Count says 0 people', async ({ page }) => {
  await H.chip(page, 'Body dysmorphic disorder').click(); await H.runSearch(page);
  await expect(page.locator('#match-count')).toHaveText('0 people');
});
test('DS-11 Cards show name, match % and up to 4 tags', async ({ page }) => {
  const card = page.locator('#results .person').first();
  await expect(card.locator('.match')).toHaveText(/^\d{1,2}%match$/i);
  expect(await card.locator('.tag').count()).toBeLessThanOrEqual(4);
});
test('DS-11 Peer supporter badge on SteadyBadger', async ({ page }) => {
  await page.getByRole('button', { name: /Show all/ }).click();
  await expect(page.locator('#results .person', { hasText: 'SteadyBadger' }).locator('.pill.peer')).toHaveText('Peer supporter');
});
test('DS-12 All scores are between 0 and 99', async ({ page }) => {
  await page.getByRole('button', { name: /Show all/ }).click();
  for (const p of await pcts(page)) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(99); }
});
test('DS-12 Peer support adds 12 points', async ({ page }) => {
  const r = await H.data(page, () => { const p = person('p4'); S.me.wantsPeer = true; const on = match(p).pct; S.me.wantsPeer = false; const off = match(p).pct; S.me.wantsPeer = true; return on - off; });
  expect(r).toBe(12);
});
test('DS-13 Profile sheet sections and buttons', async ({ page }) => {
  await page.locator('#results .person').first().click();
  await expect(H.sheet(page).locator('.ghead')).toHaveText(['Interests', 'Drug use', 'Mental health']);
  for (const b of ['Say hi', 'Block', 'Report']) await expect(H.sheet(page).getByRole('button', { name: b, exact: true })).toBeVisible();
});
test('DS-13 Peer supporters say they offer to listen', async ({ page }) => {
  await page.getByRole('button', { name: /Show all/ }).click(); await page.locator('#results .person', { hasText: 'SteadyBadger' }).click();
  await expect(H.sheet(page)).toContainText('Offers to listen to people who want peer support.');
});
test('DS-14 Say hi opens a chat', async ({ page }) => {
  await H.sayHiTo(page, 'PaperFern'); await expect(page.locator('#bar .title')).toHaveText('PaperFern');
});
test('DS-14 The new chat shows in Chats after a message', async ({ page }) => {
  await H.sayHiTo(page, 'PaperFern'); await H.send(page, 'Hi there');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('#screen .person', { hasText: 'PaperFern' })).toHaveCount(1);
});
test('DS-15 Search notice, toast and refresh', async ({ page }) => {
  await H.chip(page, 'Gaming').click();
  await expect(page.getByText('You have changed your search. Tap Search to update Your Matches.')).toBeVisible();
  await H.runSearch(page);
  await expect(H.toast(page)).toHaveText(/^Search updated: \d+ (people|person)\.$/);
  await expect(page.getByText('You have changed your search')).toHaveCount(0);
});
test('DS-15 Search scrolls back to the top', async ({ page }) => {
  await H.chip(page, 'Gaming').click(); await page.evaluate(() => { document.querySelector('#screen').scrollTop = 9999; });
  await H.runSearch(page); expect(await page.evaluate(() => document.querySelector('#screen').scrollTop)).toBe(0);
});
test('DS-16 Drug use headings', async ({ page }) => {
  const d = page.locator('#screen .section').filter({ has: page.locator('.ghead', { hasText: 'Drug use' }) }).last();
  await expect(d.locator('.label.sub')).toHaveText(['Medications', 'Other Substances', 'Alcohol, nicotine & gambling']);
});
test('DS-16 Item counts under each heading', async ({ page }) => {
  await expect(page.locator('[aria-label="Drug use: Medications"] .chip')).toHaveCount(20);
  await expect(page.locator('[aria-label="Drug use: Other Substances"] .chip')).toHaveCount(10);
  await expect(page.locator('[aria-label="Drug use: Alcohol, nicotine & gambling"] .chip')).toHaveCount(4);
});
