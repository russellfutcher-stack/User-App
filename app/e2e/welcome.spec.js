const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page }) => { await H.open(page); });

test('WS-01 Name, byline and description', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'User', exact: true })).toBeVisible();
  await expect(H.screen(page).getByText('Connection and Recovery', { exact: true })).toBeVisible();
  await expect(page.getByText(/A private, anonymous place to meet people/)).toBeVisible();
});
test('WS-01 The description names all three groups', async ({ page }) => {
  await expect(page.getByText(/use drugs, are in recovery, or live with a mental health condition/)).toBeVisible();
});
test('WS-02 Four benefits', async ({ page }) => {
  await expect(page.locator('#benefits [role=listitem]')).toHaveCount(4);
});
test('WS-02 Benefits include anonymity and safety', async ({ page }) => {
  await expect(page.locator('#benefits')).toContainText('Stay anonymous.');
  await expect(page.locator('#benefits')).toContainText('Safe by design.');
});
test('WS-03 Five numbered steps', async ({ page }) => {
  await expect(page.locator('#howto [role=listitem]')).toHaveCount(5);
});
test('WS-03 The last step explains becoming a peer supporter', async ({ page }) => {
  await expect(page.locator('#howto [role=listitem]').last()).toContainText('Nominate myself as a peer supporter');
});
test('WS-04 Username and password boxes', async ({ page }) => {
  await expect(page.locator('#li-h')).toBeVisible(); await expect(page.locator('#li-p')).toBeVisible();
});
test('WS-04 The password is hidden', async ({ page }) => {
  await expect(page.locator('#li-p')).toHaveAttribute('type', 'password');
});
test('WS-05 Wrong details show a message', async ({ page }) => {
  await H.signIn(page, 'QuietHeron', 'wrong password');
  await expect(page.locator('#li-err')).toHaveText("That username and password don't match. Check for typos, or sign in with a passkey.");
  await expect(page.locator('#tabs')).toHaveCount(0);
});
test('WS-05 Username is not case-sensitive', async ({ page }) => {
  await H.signIn(page, 'quietHERON', 'quiet heron walks'); await expect(H.tab(page, 'Home')).toBeVisible();
});
test('WS-06 Demo account signs in to Home', async ({ page }) => {
  await H.signInDemo(page); await expect(H.screen(page)).toContainText('QuietHeron');
});
test('WS-06 Demo account has its sample profile', async ({ page }) => {
  await H.signInDemo(page); await H.tab(page, 'Me').click();
  await expect(page.locator('#me-byline')).toContainText('Anxious in person');
  await expect(H.chip(page, 'Books & reading')).toHaveAttribute('aria-checked', 'true');
});
test('WS-07 Forgot password explains passkeys', async ({ page }) => {
  await H.btn(page, 'Forgot password?').click();
  await expect(H.sheet(page)).toContainText('If you set up a passkey, sign in with it');
  await expect(H.sheet(page)).toContainText('User keeps no email or phone number');
});
test('WS-07 Forgot password offers passkey sign-in', async ({ page }) => {
  await H.btn(page, 'Forgot password?').click(); await H.sheet(page).getByRole('button', { name: 'Sign in with a passkey' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Sign in with a passkey' })).toBeVisible();
});
test('WS-08 Create an anonymous account starts sign-up', async ({ page }) => {
  await H.startSignup(page); await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
});
test('WS-08 Sign-up starts at step 1 of 3', async ({ page }) => {
  await H.startSignup(page); await expect(page.locator('#steps')).toHaveAttribute('aria-label', 'Step 1 of 3');
});
test('WS-09 Passkey sign-in for the demo device', async ({ page }) => {
  await H.btn(page, 'Sign in with a passkey').click();
  await H.sheet(page).getByRole('button', { name: 'Continue as QuietHeron' }).click();
  await expect(H.tab(page, 'Home')).toBeVisible(); await expect(H.toast(page)).toHaveText('Signed in with your passkey.');
});
test('WS-09 No passkey saved says to use the password', async ({ page }) => {
  await H.createAccount(page, 'NoKey_1', 'Strong!pass9', { passkey: false }); await H.finishSetup(page); await H.signOut(page);
  await H.btn(page, 'Sign in with a passkey').click();
  await expect(page.locator('#li-err')).toHaveText('No passkey for User is saved on this device. Sign in with your username and password.');
});
