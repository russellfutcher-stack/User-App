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
async function addEmail(page) {
  await H.signInDemo(page); await H.tab(page, 'Me').click(); await H.btn(page, 'Add email').click();
  await page.fill('#rec-email', 'quiet@example.com'); await H.btn(page, 'Save email').click();
  await H.btn(page, 'Sign out').click();
}
test('WS-07 Forgot password emails a code and sets a new password', async ({ page }) => {
  await addEmail(page);
  await H.btn(page, 'Forgot password?').click();
  await page.fill('#fp-name', 'QuietHeron'); await page.fill('#fp-email', 'Quiet@Example.com'); await H.btn(page, 'Email me a code').click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const code = (await H.sheet(page).getByText('Demo only').innerText()).match(/\d{6}/)[0];
  await page.fill('#fp-code', code); await page.fill('#fp-pass', 'a brand new pass'); await page.fill('#fp-pass2', 'a brand new pass');
  await H.btn(page, 'Set new password').click();
  await expect(H.toast(page)).toHaveText('Password changed. You are signed in.');
  await H.tab(page, 'Me').click(); await H.btn(page, 'Sign out').click();
  await page.fill('#li-h', 'QuietHeron'); await page.fill('#li-p', 'a brand new pass'); await H.btn(page, 'Sign in').click();
  await expect(H.tab(page, 'Me')).toBeVisible();
});
test('WS-07 A wrong code or an unknown email gives nothing away', async ({ page }) => {
  await addEmail(page);
  await H.btn(page, 'Forgot password?').click();
  await page.fill('#fp-name', 'QuietHeron'); await page.fill('#fp-email', 'someone@else.com'); await H.btn(page, 'Email me a code').click();
  await expect(H.sheet(page)).toContainText('If that username and email match');
  await expect(H.sheet(page).getByText('Demo only')).toHaveCount(0);
  await page.fill('#fp-code', '000000'); await page.fill('#fp-pass', 'a brand new pass'); await page.fill('#fp-pass2', 'a brand new pass');
  await H.btn(page, 'Set new password').click();
  await expect(page.locator('#fp-err')).toContainText("That code didn't work.");
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

test('WS-10 Show password shows what you typed', async ({ page }) => {
  await page.fill('#li-p', 'quiet heron walks'); await expect(page.locator('#li-p')).toHaveAttribute('type', 'password');
  await page.locator('#li-show').click(); await expect(page.locator('#li-p')).not.toHaveAttribute('type', 'password');
  await expect(page.locator('#li-p')).toHaveValue('quiet heron walks');
});
test('WS-10 Tapping it again hides the password', async ({ page }) => {
  await page.locator('#li-show').click(); await page.locator('#li-show').click();
  await expect(page.locator('#li-p')).toHaveAttribute('type', 'password'); await expect(page.locator('#li-show')).toHaveAttribute('aria-checked', 'false');
});
