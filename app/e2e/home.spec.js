const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const at = async (page, iso) => { await page.clock.setFixedTime(new Date(iso)); await H.open(page); await H.signInDemo(page); };
const heading = (page, name) => H.screen(page).getByRole('heading', { name, exact: true });

test('H-01 Morning greeting with your stage', async ({ page }) => {
  await at(page, '2026-10-28T09:00:00Z');
  await expect(heading(page, 'Good morning, QuietHeron.')).toBeVisible();
  await expect(H.screen(page)).toContainText('Early recovery (under a year)');
});
test('H-01 Greeting follows the time of day', async ({ page }) => {
  await at(page, '2026-10-28T02:00:00Z'); await expect(heading(page, 'Still up, QuietHeron.')).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-10-28T20:00:00Z')); await H.tab(page, 'Me').click(); await H.tab(page, 'Home').click();
  await expect(heading(page, 'Good evening, QuietHeron.')).toBeVisible();
});
test('H-05 Three tiles with member counts', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(page.locator('#tile-interests')).toContainText('100 people');
  await expect(page.locator('#tile-drugs')).toContainText('70 people'); await expect(page.locator('#tile-mh')).toContainText('75 people');
});
test('H-05 A tile opens Search with that choice on', async ({ page }) => {
  await H.open(page); await H.signInDemo(page); await page.locator('#tile-drugs').click();
  await expect(H.tab(page, 'Search')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tile-drugs')).toHaveAttribute('aria-pressed', 'true');
});
test('H-06 No new messages section for a new account', async ({ page }) => {
  await H.open(page); await H.createAccount(page, 'Homer_1'); await H.finishSetup(page);
  await expect(H.screen(page)).not.toContainText('New messages');
});
test('H-06 No new messages section until chats arrive', async ({ page }) => {
  await H.open(page); await H.signInDemo(page); await expect(H.screen(page)).not.toContainText('New messages');
});
test('H-07 Shows Why people use User', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(heading(page, 'Why people use User')).toBeVisible(); await expect(page.locator('#benefits > *')).toHaveCount(4);
});
test('H-07 Shows How to use it', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(heading(page, 'How to use it')).toBeVisible(); await expect(page.locator('#howto > *')).toHaveCount(5);
});
test('H-08 Help is always here card', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(page.locator('#help-card')).toContainText('Tap Help now at the top of any screen, or open the Support page');
});
test('H-08 Help card is the last card, before the disclaimer', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  const text = await H.screen(page).innerText();
  expect(text.indexOf('Help is always here')).toBeGreaterThan(text.indexOf('How to use it'));
  expect(text.indexOf('User is peer support')).toBeGreaterThan(text.indexOf('Help is always here'));
});
test('H-09 Disclaimer at the bottom of Home', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(H.screen(page).getByText('User is peer support, not a medical or emergency service.')).toBeVisible();
});
test('H-09 Disclaimer is the last thing on Home', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  expect((await H.screen(page).innerText()).trim().endsWith('User is peer support, not a medical or emergency service.')).toBe(true);
});
test('H-10 Page order', async ({ page }) => {
  await at(page, '2026-10-28T09:00:00Z');
  const text = (await H.screen(page).innerText()).toLowerCase(); // labels show in capitals
  const order = ['Good morning', 'Find people using these three choices', 'Why people use User', 'How to use it', 'Help is always here', 'User is peer support'].map(t => text.indexOf(t.toLowerCase()));
  expect(order.every(i => i >= 0)).toBe(true); expect([...order].sort((a, b) => a - b)).toEqual(order);
});
test('H-10 No check-in and no Your rooms section', async ({ page }) => {
  await H.open(page); await H.signInDemo(page);
  await expect(H.screen(page)).not.toContainText('check-in', { ignoreCase: true }); await expect(H.screen(page)).not.toContainText('Your rooms');
});

test('FP-09 Saving opens Here are your matches, by score', async ({ page }) => {
  await H.open(page); await H.createAccount(page, 'Matcher_1'); await H.finishSetup(page, 'Music', { toHome: false });
  await expect(page.locator('#tabs')).toHaveCount(0);
  const pcts = (await page.locator('#match-list [data-testid="person"]').allInnerTexts()).map(t => +t.match(/(\d+)%/)[1]);
  expect(pcts).toHaveLength(100); expect([...pcts].sort((a, b) => b - a)).toEqual(pcts);
});
test('FP-09 Continue to Home and Refine on the Search page', async ({ page }) => {
  await H.open(page); await H.createAccount(page, 'Matcher_2'); await H.finishSetup(page, 'Music', { toHome: false });
  await H.btn(page, 'Refine on the Search page').click(); await expect(H.tab(page, 'Search')).toHaveAttribute('aria-selected', 'true');
  await expect(H.screen(page).getByRole('heading', { name: 'Your Matches' })).toBeVisible();
});
test('G-15 100 sample members, 21 peer supporters', async ({ page }) => {
  await H.open(page); await H.signInDemo(page); await H.tab(page, 'Search').click();
  await expect(page.locator('#match-count')).toHaveText('100 people');
  await page.getByRole('checkbox', { name: 'Peer supporters only' }).click(); await H.btn(page, 'Search').click();
  await expect(page.locator('#match-count')).toHaveText('21 people');
});
test('G-15 Sample members are the same every time', async ({ page }) => {
  await H.open(page); await H.signInDemo(page); await H.tab(page, 'Search').click();
  await expect(page.getByTestId('person')).toHaveCount(3);
  expect((await page.getByTestId('person').allInnerTexts()).map(t => t.split('\n')[0])).toEqual(['JuniperWren', 'MossyOtter', 'MossyKestrel']);
});
