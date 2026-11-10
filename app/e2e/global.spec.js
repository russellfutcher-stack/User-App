const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page }) => { await H.open(page); });

test('G-01 Header shows the name, Exit and Help', async ({ page }) => {
  const bar = page.locator('#bar');
  await expect(bar).toContainText('User'); await expect(bar).toContainText('CONNECTION AND RECOVERY');
  await expect(H.btn(page, 'Exit to Home')).toBeVisible(); await expect(H.btn(page, 'Help')).toBeVisible();
});
test('G-01 Sign-up shows Back and the page name', async ({ page }) => {
  await H.startSignup(page);
  await expect(H.btn(page, 'Back')).toBeVisible(); await expect(page.locator('#bar')).toContainText('Create account');
});
test('G-02 Help opens the Help sheet', async ({ page }) => {
  await H.btn(page, 'Help').click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Help' })).toBeVisible();
  await expect(H.sheet(page)).toContainText('13 11 14');
});
test('G-02 Help works after signing in', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.btn(page, 'Help').click();
  await expect(H.sheet(page)).toContainText('Grounding, right now');
});
test('G-03 Exit goes to the Home page', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.btn(page, 'Exit to Home').click();
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Shopping list')).toHaveCount(0);
});
test('G-03 Exit closes an open sheet or chat first', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Help').click();
  await H.btn(page, 'Exit to Home').click();
  await expect(H.sheet(page)).toHaveCount(0); await expect(page.locator('#msg')).toHaveCount(0);
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');
});
test('G-04 Signed out, Exit goes to the Welcome page', async ({ page }) => {
  await H.startSignup(page); await H.btn(page, 'Exit to Home').click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
});
test('G-04 Exit from another page keeps you signed in', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Search').click(); await H.btn(page, 'Exit to Home').click();
  await expect(H.tab(page, 'Me')).toBeVisible(); await expect(page.locator('#li-h')).toHaveCount(0); // no sign-in box
});
test('G-04 Exit on the Home page signs out to the sign-in screen', async ({ page }) => {
  await H.signInDemo(page); await H.btn(page, 'Exit to Home').click();
  await expect(page.locator('#li-h')).toBeVisible(); await expect(H.tab(page, 'Home')).toHaveCount(0);
});
test('G-05 Six tabs after sign-in, current one highlighted', async ({ page }) => {
  await H.signInDemo(page);
  await expect(page.getByRole('tab')).toHaveCount(6);
  for (const t of ['Home', 'Me', 'Search', 'Chats', 'Rooms', 'Support']) await expect(H.tab(page, t)).toBeVisible();
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');
  await H.tab(page, 'Me').click(); await expect(H.tab(page, 'Me')).toHaveAttribute('aria-selected', 'true');
});
test('G-05 No tabs on Welcome, sign-up or setup', async ({ page }) => {
  await expect(page.locator('#tabs')).toHaveCount(0);
  await H.startSignup(page); await expect(page.locator('#tabs')).toHaveCount(0);
  await H.passRules(page); await H.passCredentials(page); await H.btn(page, 'Create account without a passkey').click();
  await expect(page.getByText("Let's set up your profile.")).toBeVisible(); await expect(page.locator('#tabs')).toHaveCount(0);
});
test('G-07 A toast appears after an action', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.toggle(page, 'App lock with PIN or Face ID').click();
  await expect(H.toast(page)).toHaveText('Turned on.');
});
test('G-07 The toast goes after about 2.4 seconds', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.toggle(page, 'App lock with PIN or Face ID').click();
  await expect(H.toast(page)).toBeVisible(); await page.waitForTimeout(2700); await expect(H.toast(page)).toHaveCount(0);
});
test('G-08 Sheets close with Escape', async ({ page }) => {
  await H.btn(page, 'Help').click(); await expect(H.sheet(page)).toBeVisible();
  await page.keyboard.press('Escape'); await expect(H.sheet(page)).toHaveCount(0);
});
test('G-08 Sheets close by tapping outside or Close', async ({ page }) => {
  await H.btn(page, 'Help').click();
  const top = (await H.sheet(page).boundingBox()).y, frame = await page.locator('#device').boundingBox();
  await page.mouse.click(frame.x + 20, top - 8);
  await expect(H.sheet(page)).toHaveCount(0);
  await H.btn(page, 'Help').click(); await H.sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(H.sheet(page)).toHaveCount(0);
});
test('G-09 Stays light in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
  const bg = await page.locator('#device').evaluate(e => getComputedStyle(e).backgroundColor);
  expect(bg).toBe('rgb(237, 245, 252)');
});
test('G-09 Text stays dark in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
  const c = await page.getByRole('heading', { name: H.WELCOME }).evaluate(e => getComputedStyle(e).color);
  expect(c).toBe('rgb(10, 30, 61)');
});
test('G-10 Wide screen shows a phone-sized frame', async ({ page }) => {
  const box = await page.locator('#device').boundingBox(); expect(box.width).toBe(400);
});
test('G-10 Phone width fills the screen with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await expect.poll(async () => (await page.locator('#device').boundingBox()).width).toBe(375); // waits for the resize to settle
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test('G-11 Profile changes are kept after a reload', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.chip(page, 'Music').click();
  await page.reload(); await H.signInDemo(page); await H.tab(page, 'Me').click();
  await expect(H.chip(page, 'Music')).toHaveAttribute('aria-checked', 'true');
});
test('G-11 A new account is kept after a reload', async ({ page }) => {
  await H.createAccount(page, 'Keeper_1'); await H.finishSetup(page);
  await page.reload(); await H.signIn(page, 'Keeper_1', 'Strong!pass9');
  await expect(H.tab(page, 'Home')).toBeVisible();
});
test('G-12 Opens signed out', async ({ page }) => {
  await expect(page.locator('#li-h')).toBeVisible(); await expect(page.locator('#tabs')).toHaveCount(0);
});
test('G-12 Reload signs you out; signing in lands on Home', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await page.reload();
  await expect(page.locator('#li-h')).toBeVisible();
  await H.signInDemo(page); await expect(H.tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');
});
test('G-13 No pictures on Welcome', async ({ page }) => {
  await expect(page.locator('#screen img')).toHaveCount(0);
});
test('G-13 No pictures on Me', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await expect(page.locator('#screen img')).toHaveCount(0);
});
const BANNED = /\b(AI|agents?|staff|volunteers?|moderators?|Night Owls?)\b/;
test('G-14 Welcome and sign-up wording', async ({ page }) => {
  expect(await H.screen(page).innerText()).not.toMatch(BANNED);
  await expect(page.getByText('Every message is checked for safety', { exact: false })).toBeVisible();
  await H.startSignup(page); expect(await H.screen(page).innerText()).not.toMatch(BANNED);
});
test('G-14 Setup and Me wording', async ({ page }) => {
  await H.createAccount(page, 'Words_1'); expect(await H.screen(page).innerText()).not.toMatch(BANNED);
  await H.finishSetup(page); await H.tab(page, 'Me').click(); expect(await H.screen(page).innerText()).not.toMatch(BANNED);
});
// G-16 Hide: a quick exit to Google's home page (Rusty, 4 Nov 2026). The jump is caught, so the test needs no internet.
const hidden = async page => { await page.route('https://www.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google</title>' })); };
test('G-16 Hide leaves User for Google', async ({ page }) => {
  await hidden(page); await H.signInDemo(page); await H.btn(page, 'Quick exit: leave User').click();
  await expect(page).toHaveURL('https://www.google.com/'); await expect(page).toHaveTitle('Google');
});
test("G-16 Back doesn't bring User back, and you're signed out", async ({ page }) => {
  await hidden(page); await H.open(page); await H.signInDemo(page); await H.btn(page, 'Quick exit: leave User').click();
  await expect(page).toHaveURL('https://www.google.com/');
  await page.goBack().catch(() => undefined);
  await expect(page.getByRole('tab', { name: 'Home' })).toHaveCount(0);
});
test('G-16 Hide is in the header next to Exit, signed in or out, and fits on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  for (const b of ['Exit to Home', 'Quick exit: leave User', 'Help']) await expect(H.btn(page, b)).toBeInViewport({ ratio: 1 });
  await H.signInDemo(page);
  for (const b of ['Exit to Home', 'Quick exit: leave User', 'Help']) await expect(H.btn(page, b)).toBeInViewport({ ratio: 1 });
  await H.openChat(page, 'SteadyBadger');
  for (const b of ['Back', 'Exit to Home', 'Quick exit: leave User', 'Help']) await expect(H.btn(page, b)).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
