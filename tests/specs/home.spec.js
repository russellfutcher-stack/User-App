const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
async function at(page, baseURL, time = H.DAY) { await H.openUrl(page, baseURL, time); await H.signIn(page); }

test('H-01 Greeting follows the time of day', async ({ page, baseURL }) => {
  for (const [time, words] of [['2026-10-23T02:00:00Z', 'Still up'], ['2026-10-23T09:00:00Z', 'Good morning'], ['2026-10-23T14:00:00Z', 'Good afternoon'], ['2026-10-23T19:00:00Z', 'Good evening']]) {
    await at(page, baseURL, time); await expect(page.locator('#screen h2').first()).toHaveText(`${words}, QuietHeron.`);
  }
});
test('H-01 Stage shows under the greeting', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('#screen h2').first().locator('xpath=following-sibling::p')).toHaveText('Early recovery (under a year)');
});
test('H-05 Tile counts match the member data', async ({ page, baseURL }) => {
  await at(page, baseURL);
  const want = await H.data(page, () => PATHS.map(g => PEOPLE.filter(p => p.tags.some(t => g.cats.includes(catOf(t)))).length + ' people'));
  await expect(page.locator('#screen .path .pn')).toHaveText(['Interest', 'Drug use', 'Mental health']);
  await expect(page.locator('#screen .path .pc')).toHaveText(want);
});
test('H-05 A tile opens Search with that choice on', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await page.locator('#screen .path', { hasText: 'Mental health' }).click();
  await expect(page.getByRole('heading', { name: 'Search/Find a Companion' })).toBeVisible();
  await expect(page.locator('#screen .path', { hasText: 'Mental health' })).toHaveAttribute('aria-pressed', 'true');
});
test('H-06 Three unread chats are listed', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('#screen .section', { hasText: 'New messages' }).locator('.person')).toHaveCount(3);
});
test('H-06 Opening one leaves two', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await page.locator('#screen .section', { hasText: 'New messages' }).locator('.person').first().click();
  await page.getByRole('button', { name: 'Back' }).click(); await H.tab(page, 'Home').click();
  await expect(page.locator('#screen .section', { hasText: 'New messages' }).locator('.person')).toHaveCount(2);
});
test('H-07 Benefits and how-to are on Home', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('.benefits li')).toHaveCount(4); await expect(page.locator('ol.howto li')).toHaveCount(5);
});
test('H-07 Same wording as the Welcome page', async ({ page, baseURL }) => {
  await H.openUrl(page, baseURL);
  const w = await page.locator('.benefits li b, ol.howto li').allTextContents();
  await H.signIn(page);
  expect(await page.locator('.benefits li b, ol.howto li').allTextContents()).toEqual(w);
});
test('H-08 Help is always here is the last card', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('#screen > .card').last()).toContainText('Help is always here');
});
test('H-08 Help card points to the Support page', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('.help-card')).toContainText('Support');
});
test('H-09 Disclaimer is the last thing on Home', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('#screen > :last-child')).toHaveClass(/disclaimer/);
});
test('H-09 Disclaimer wording', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('#screen .disclaimer')).toHaveText('User is peer support, not a medical or emergency service.');
});
test('H-10 Page order', async ({ page, baseURL }) => {
  await at(page, baseURL);
  const text = (await page.locator('#screen').innerText()).toLowerCase();
  const idx = ['good afternoon', 'find people using these three choices', 'new messages', 'why people use user', 'how to use it', 'help is always here', 'user is peer support'].map(t => text.indexOf(t));
  expect(idx.every(i => i >= 0)).toBe(true); expect([...idx].sort((a, b) => a - b)).toEqual(idx);
});
test('H-10 No check-in and no Your rooms', async ({ page, baseURL }) => {
  await at(page, baseURL);
  await expect(page.locator('.checkin')).toHaveCount(0);
  await expect(page.locator('#screen')).not.toContainText(/Your rooms|How connected/);
});
