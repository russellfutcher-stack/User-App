const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); });

test('WS-01 Name, byline and description', async ({ page }) => {
  await expect(page.locator('.welcome-hero .big')).toHaveText('User');
  await expect(page.locator('.welcome-hero .by')).toHaveText('Connection and Recovery');
  await expect(page.locator('.welcome-hero p')).toContainText('anonymous place to meet people');
});
test('WS-01 Only intro, benefits, how-to and sign-in', async ({ page }) => {
  await expect(page.locator('#screen > *')).toHaveCount(4);
  await expect(page.locator('#screen .path')).toHaveCount(0);
});
test('WS-02 Four benefits', async ({ page }) => {
  await expect(page.locator('.benefits li b')).toHaveText(['Find people who get it.', 'Stay anonymous.', 'Feel less alone, day or night.', 'Safe by design.']);
});
test('WS-02 Benefits mention peer supporters and safety checks', async ({ page }) => {
  await expect(page.locator('.benefits')).toContainText('peer supporters');
  await expect(page.locator('.benefits')).toContainText('Every message is checked for safety');
});
test('WS-03 Five numbered steps', async ({ page }) => {
  await expect(page.locator('ol.howto li')).toHaveCount(5);
  await expect(page.locator('ol.howto li').first()).toContainText('Create an anonymous account');
});
test('WS-03 Last step explains becoming a peer supporter, no check-in step', async ({ page }) => {
  await expect(page.locator('ol.howto li').last()).toContainText('To become a peer supporter');
  await expect(page.locator('ol.howto')).not.toContainText('Check in');
});
test('WS-04 Username and hidden password boxes', async ({ page }) => {
  await expect(page.locator('#li-h')).toBeVisible();
  await expect(page.locator('#li-p')).toHaveAttribute('type', 'password');
});
test('WS-04 Sign in and passkey buttons', async ({ page }) => {
  await expect(page.locator('form').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with a passkey' })).toBeVisible();
});
test('WS-05 Wrong password shows an error', async ({ page }) => {
  await H.signIn(page, 'QuietHeron', 'wrong password');
  await expect(page.locator('#li-err')).toContainText("That username and password don't match");
  await expect(page.locator('#tabs')).toBeHidden();
});
test('WS-05 Username is not case-sensitive', async ({ page }) => {
  await H.signIn(page, 'QUIETHERON', 'quiet heron walks');
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('WS-06 Demo account opens with its greeting', async ({ page }) => {
  await H.signIn(page);
  await expect(page.locator('#screen h2').first()).toContainText('QuietHeron');
});
test('WS-06 Demo account has sample chats and rooms', async ({ page }) => {
  await H.signIn(page);
  const s = await H.state(page);
  expect(Object.keys(s.convos)).toHaveLength(6);
  expect(s.rooms.joined).toEqual(['r1', 'r5']);
});
test('WS-07 Forgot password explains passkeys', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await expect(H.sheet(page)).toContainText("we can't reset your password");
});
test('WS-07 Forgot password leads to passkey sign-in', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await H.sheet(page).getByRole('button', { name: 'Sign in with a passkey' }).click();
  await H.sheet(page).getByRole('button', { name: 'Continue as QuietHeron' }).click();
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('WS-08 New here divider', async ({ page }) => {
  await expect(page.locator('.divider')).toHaveText('New here?');
});
test('WS-08 Create an anonymous account starts sign-up', async ({ page }) => {
  await H.startSignup(page);
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
});
test('WS-09 Sign in with a passkey', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await H.sheet(page).getByRole('button', { name: 'Continue as QuietHeron' }).click();
  await expect(H.toast(page)).toHaveText('Signed in with your passkey.');
});
test('WS-09 No passkey on this device', async ({ page }) => {
  await page.evaluate(() => { S.account.passkey = false; });
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await expect(page.locator('#li-err')).toContainText('No passkey');
});
