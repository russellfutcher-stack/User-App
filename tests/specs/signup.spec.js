const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const cont = page => page.getByRole('button', { name: 'Continue' }).click();
const err = page => page.locator('#ob-err');
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.startSignup(page); });

test('SN-01 Three segments, first filled', async ({ page }) => {
  await expect(page.locator('.steps span')).toHaveCount(3);
  await expect(page.locator('.steps span.on')).toHaveCount(1);
});
test('SN-01 Segments fill as you go', async ({ page }) => {
  await H.passRules(page); await expect(page.locator('.steps span.on')).toHaveCount(2);
  await H.passCredentials(page); await expect(page.locator('.steps span.on')).toHaveCount(3);
});
test('SN-02 Back from step 2 returns to step 1', async ({ page }) => {
  await H.passRules(page); await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
});
test('SN-02 Back from step 1 returns to Welcome, signed out', async ({ page }) => {
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
});
test('SN-03 18+ is required', async ({ page }) => {
  await page.check('#r-agree'); await cont(page);
  await expect(err(page)).toContainText('Please confirm you are 18+');
});
test('SN-03 Ticking both moves on', async ({ page }) => {
  await H.passRules(page);
  await expect(page.getByRole('heading', { name: 'Choose a username and password' })).toBeVisible();
});
test('SN-04 Agreement is required', async ({ page }) => {
  await page.check('#r-age'); await cont(page);
  await expect(err(page)).toContainText('agree to the community agreement');
});
test('SN-04 Four rules, phone caution, no meet-in-public rule', async ({ page }) => {
  await expect(page.locator('#screen .section.small p')).toHaveCount(4);
  await expect(page.getByText('think carefully before sharing a phone number')).toBeVisible();
  await expect(page.locator('#screen')).not.toContainText('Meet only in public');
});
for (const bad of ['Sam Smith', 'ab', 'a'.repeat(21), 'bad-name!']) {
  test(`SN-05 Username "${bad}" is refused`, async ({ page }) => {
    await H.passRules(page);
    await page.locator('#ob-h').evaluate((el, v) => { el.removeAttribute('maxlength'); el.value = v; el.dispatchEvent(new Event('input')); }, bad);
    await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass9'); await cont(page);
    await expect(err(page)).toContainText('Usernames need 3 to 20');
  });
}
test('SN-05 A valid username is accepted', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Good_Name_7');
  await expect(page.getByRole('heading', { name: 'Protect your account with a passkey' })).toBeVisible();
});
test('SN-06 A sample member name is taken', async ({ page }) => {
  await H.passRules(page);
  const name = await H.data(page, () => PEOPLE[50].handle.toLowerCase());
  await H.passCredentials(page, name.replace(/[^a-z0-9_]/g, ''));
  await expect(err(page)).toContainText('That username is taken');
});
test('SN-06 QuietHeron is taken', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'quietheron');
  await expect(err(page)).toContainText('That username is taken');
});
test('SN-07 Suggest fills a valid name and keeps the password', async ({ page }) => {
  await H.passRules(page); await page.fill('#ob-p', 'Strong!pass9');
  await page.getByRole('button', { name: 'Suggest' }).click();
  await expect(page.locator('#ob-h')).toHaveValue(/^[A-Za-z0-9_]{3,20}$/);
  await expect(page.locator('#ob-p')).toHaveValue('Strong!pass9');
});
test('SN-07 A suggested name can be used', async ({ page }) => {
  await H.passRules(page);
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Suggest' }).click();
    const v = await page.locator('#ob-h').inputValue();
    const taken = await H.data(page, n => PEOPLE.some(p => p.handle.toLowerCase() === n.toLowerCase()) || n.toLowerCase() === 'quietheron', v);
    if (!taken) break;
  }
  await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass9'); await cont(page);
  await expect(page.getByRole('heading', { name: 'Protect your account with a passkey' })).toBeVisible();
});
test('SN-08 Under 8 characters is refused', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Good_Name_7', 'short');
  await expect(err(page)).toContainText('at least 8 characters');
});
test('SN-08 Exactly 8 characters is accepted', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Good_Name_7', 'abcdefgh');
  await expect(page.getByRole('heading', { name: 'Protect your account with a passkey' })).toBeVisible();
});
test('SN-09 Hint changes as the password grows', async ({ page }) => {
  await H.passRules(page);
  await page.fill('#ob-p', 'abc'); await expect(page.locator('#ph')).toContainText('5 more characters needed');
  await page.fill('#ob-p', 'abcdefgh'); await expect(page.locator('#ph')).toContainText('OK.');
  await page.fill('#ob-p', 'Abcdefgh12!x'); await expect(page.locator('#ph')).toContainText('Strong');
});
test('SN-09 Meter grows with capitals, numbers and symbols', async ({ page }) => {
  await H.passRules(page);
  const w = async v => { await page.fill('#ob-p', v); return page.locator('#pm').evaluate(e => parseFloat(e.style.width)); };
  const a = await w('abcdefgh'), b = await w('Abcdefg1'), c = await w('Abcdef1!');
  expect(b).toBeGreaterThan(a); expect(c).toBeGreaterThan(b);
});
test('SN-10 Passwords must match', async ({ page }) => {
  await H.passRules(page);
  await page.fill('#ob-h', 'Good_Name_7'); await page.fill('#ob-p', 'Strong!pass9'); await page.fill('#ob-p2', 'Strong!pass0'); await cont(page);
  await expect(err(page)).toContainText("don't match");
});
test('SN-10 Matching passwords move on', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Good_Name_7', 'Same!pass1');
  await expect(page.locator('.steps span.on')).toHaveCount(3);
});
test('SN-11 Passkey step with no recovery codes', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page);
  await expect(page.getByRole('heading', { name: 'Protect your account with a passkey' })).toBeVisible();
  await expect(page.locator('#screen')).not.toContainText('recovery code');
});
test('SN-11 Three plain reasons to use a passkey', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page);
  await expect(page.locator('.pk-list li')).toHaveCount(3);
});
test('SN-12 Create a passkey shows Passkey saved', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page);
  await page.getByRole('button', { name: 'Create a passkey' }).click();
  await expect(page.locator('.pill', { hasText: 'Passkey saved' })).toBeVisible();
});
test('SN-12 The account remembers the passkey', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page); await H.passCodes(page);
  expect((await H.state(page)).account.passkey).toBe(true);
});
test('SN-13 Skip button wording', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page);
  await expect(page.getByRole('button', { name: 'Create account without a passkey' })).toBeVisible();
});
test('SN-13 Skipping creates the account without a passkey', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'No_Passkey');
  await page.getByRole('button', { name: 'Create account without a passkey' }).click();
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
  expect((await H.state(page)).account.passkey).toBe(false);
});
test('SN-14 Only a salted hash is stored', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Hash_Check', 'Strong!pass9'); await H.passCodes(page);
  const raw = await page.evaluate(() => localStorage.getItem('user-app-prototype-v1'));
  expect(raw).not.toContain('Strong!pass9');
  const a = JSON.parse(raw).account;
  expect(a.passHash).toMatch(/^[0-9a-f]{64}$/); expect(a.salt).toMatch(/^[0-9a-f]{32}$/);
});
test('SN-14 The new account can sign in after reload', async ({ page }) => {
  await H.passRules(page); await H.passCredentials(page, 'Reload_User', 'Strong!pass9'); await H.passCodes(page);
  await page.reload(); await H.signIn(page, 'Reload_User', 'Strong!pass9');
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
});
test('SN-15 Salted hash box opens', async ({ page }) => {
  const d = page.locator('details.salt');
  await expect(d.locator('p').first()).toBeHidden();
  await d.locator('summary').click();
  await expect(d).toContainText('random string of characters called a salt');
});
test('SN-15 Explains why a hash can\'t be reversed', async ({ page }) => {
  await page.locator('details.salt summary').click();
  await expect(page.locator('details.salt')).toContainText("can't be turned back into your password");
});
