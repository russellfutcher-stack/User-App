const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const cont = page => H.btn(page, 'Continue').click();
const err = page => page.locator('#ob-err');
const toStep2 = H.passRules;
test.beforeEach(async ({ page }) => { await H.open(page); await H.startSignup(page); });

test('SN-01 Three segments, first filled', async ({ page }) => {
  await expect(page.getByTestId(/^step/)).toHaveCount(3); await expect(page.getByTestId('step-on')).toHaveCount(1);
});
test('SN-01 Segments fill as you go', async ({ page }) => {
  await toStep2(page); await expect(page.getByTestId('step-on')).toHaveCount(2);
  await H.passCredentials(page); await expect(page.getByTestId('step-on')).toHaveCount(3);
});
test('SN-02 Back from step 2 returns to step 1', async ({ page }) => {
  await toStep2(page); await H.btn(page, 'Back').click();
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
});
test('SN-02 Back from step 1 returns to Welcome, signed out', async ({ page }) => {
  await H.btn(page, 'Back').click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible(); await expect(page.locator('#tabs')).toHaveCount(0);
});
test('SN-03 18+ is required', async ({ page }) => {
  await page.locator('#r-agree').click(); await cont(page);
  await expect(err(page)).toContainText('Please confirm you are 18+');
});
test('SN-03 Ticking both moves on', async ({ page }) => {
  await toStep2(page); await expect(page.getByRole('heading', { name: 'Choose a username and password' })).toBeVisible();
});
test('SN-04 Agreement is required', async ({ page }) => {
  await page.locator('#r-age').click(); await cont(page);
  await expect(err(page)).toContainText('agree to the community agreement');
});
test('SN-04 Four rules, phone caution, no meet-in-public rule', async ({ page }) => {
  await expect(page.locator('#rules > *')).toHaveCount(4);
  await expect(page.locator('#rules')).toContainText('think carefully before sharing a phone number');
  await expect(H.screen(page)).not.toContainText('in public');
});
test('SN-05 Spaces and short names are refused', async ({ page }) => {
  await toStep2(page);
  for (const bad of ['ab', 'has space', 'bad-dash']) {
    await page.fill('#ob-h', bad); await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass9'); await cont(page);
    await expect(err(page)).toContainText('3 to 20 letters, numbers or underscores');
  }
});
test('SN-05 A name over 20 characters is cut to 20', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-h', 'A'.repeat(25)); await expect(page.locator('#ob-h')).toHaveValue('A'.repeat(20));
});
test('SN-06 A sample member name is taken (any case)', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-h', 'mossyotter'); await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass9'); await cont(page);
  await expect(err(page)).toHaveText('That username is taken. Try another, or tap Suggest.');
});
test('SN-06 QuietHeron is taken', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-h', 'QuietHeron'); await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass9'); await cont(page);
  await expect(err(page)).toContainText('That username is taken');
});
test('SN-07 Suggest fills a valid name', async ({ page }) => {
  await toStep2(page); await H.btn(page, 'Suggest').click();
  expect(await page.locator('#ob-h').inputValue()).toMatch(/^[A-Za-z0-9_]{3,20}$/);
});
test('SN-07 Suggest keeps the password', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-p', 'Keep!this9'); await H.btn(page, 'Suggest').click();
  await expect(page.locator('#ob-p')).toHaveValue('Keep!this9');
});
test('SN-08 Short password is refused', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-h', 'Fresh_1'); await page.fill('#ob-p', 'short'); await page.fill('#ob-p2', 'short'); await cont(page);
  await expect(err(page)).toHaveText('Your password needs at least 8 characters.');
});
test('SN-08 Eight characters is enough', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page, 'Fresh_2', 'abcdefgh');
});
test('SN-09 Meter and hint change with strength', async ({ page }) => {
  await toStep2(page);
  await expect(page.locator('#ph')).toHaveText('At least 8 characters. Never reuse a password from another app.');
  await page.fill('#ob-p', 'abc'); await expect(page.locator('#ph')).toHaveText('5 more characters needed.');
  await page.fill('#ob-p', 'Strong!pass9'); await expect(page.locator('#ph')).toHaveText('Strong. Stored only as a salted hash.');
});
test('SN-09 Meter width grows', async ({ page }) => {
  await toStep2(page); const w = () => page.locator('#pm').evaluate(e => e.getBoundingClientRect().width);
  await page.fill('#ob-p', 'abc'); const a = await w(); await page.fill('#ob-p', 'abcdefgh1!'); expect(await w()).toBeGreaterThan(a);
});
test('SN-10 Passwords must match', async ({ page }) => {
  await toStep2(page); await page.fill('#ob-h', 'Fresh_3'); await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass8'); await cont(page);
  await expect(err(page)).toHaveText("The two passwords don't match.");
});
test('SN-10 Matching passwords move on', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page, 'Fresh_4');
});
test('SN-11 Passkey step explains passkeys, no recovery codes', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page);
  await expect(H.screen(page)).toContainText("It's stored by your phone or computer, never by User.");
  await expect(H.screen(page)).not.toContainText('recovery code');
});
test('SN-11 Passkey step shows both choices', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page);
  await expect(H.btn(page, 'Create a passkey')).toBeVisible(); await expect(H.btn(page, 'Create account without a passkey')).toBeVisible();
});
test('SN-12 Create a passkey shows Passkey saved', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page); await H.btn(page, 'Create a passkey').click();
  await expect(H.screen(page).getByText('Passkey saved', { exact: true })).toBeVisible();
});
test('SN-12 The button becomes Create account', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page); await H.btn(page, 'Create a passkey').click();
  await expect(H.btn(page, 'Create account')).toBeVisible(); await expect(H.btn(page, 'Create account without a passkey')).toHaveCount(0);
});
test('SN-12 Once the passkey is saved, Back is hidden', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page); await H.btn(page, 'Create a passkey').click();
  await expect(H.screen(page).getByText('Passkey saved', { exact: true })).toBeVisible(); await expect(H.btn(page, 'Back')).toHaveCount(0);
});
test('SN-13 Skipping the passkey creates the account', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page); await H.btn(page, 'Create account without a passkey').click();
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
});
test('SN-13 Without a passkey, Me offers Add a passkey', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page); await H.btn(page, 'Create account without a passkey').click();
  await H.finishSetup(page); await H.tab(page, 'Me').click(); await expect(H.btn(page, 'Add a passkey')).toBeVisible();
});
test('SN-14 Create account opens profile setup', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page, 'Maker_1'); await H.btn(page, 'Create a passkey').click(); await H.btn(page, 'Create account').click();
  await expect(page.getByText("Welcome, Maker_1. Let's set up your profile.")).toBeVisible();
  await expect(H.toast(page)).toHaveText('Account created. Now set up your profile.');
});
test('SN-14 Only a salted hash is stored (32-character salt, SHA-256)', async ({ page }) => {
  await toStep2(page); await H.passCredentials(page, 'Maker_2', 'Strong!pass9'); await H.btn(page, 'Create account without a passkey').click();
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
  const a = (await H.stored(page)).accounts.maker_2;
  expect(a.salt).toMatch(/^[0-9a-f]{32}$/); expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(await H.stored(page))).not.toContain('Strong!pass9');
});
test('SN-15 What is a salted hash? opens', async ({ page }) => {
  await page.getByRole('button', { name: 'What is a salted hash?' }).click();
  await expect(page.locator('#salt')).toContainText('User never keeps your actual password.');
});
test('SN-15 The explanation is closed at first', async ({ page }) => {
  await expect(page.locator('#salt')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'What is a salted hash?' })).toHaveAttribute('aria-expanded', 'false');
});
