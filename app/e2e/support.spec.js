const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page }) => { await H.open(page); await H.signInDemo(page); await H.tab(page, 'Support').click(); });
const heads = page => H.screen(page).getByRole('heading', { level: 2 }).allTextContents();

test('SP-01 Page order', async ({ page }) => {
  await expect(H.screen(page).getByRole('heading', { name: 'Overdose information' })).toBeVisible();
  expect(await heads(page)).toEqual(['Support', 'Peer supporters', 'Help services by country', 'Overdose information', 'Ask for a review']);
  await expect(H.screen(page)).toContainText('A message for you');
});
test('SP-01 Ends with the disclaimer', async ({ page }) => {
  await expect(H.screen(page)).toContainText('User is peer support, not a medical or emergency service.');
});
test('SP-02 The 5 best-matched peer supporters, each with a button', async ({ page }) => {
  await expect(page.getByTestId('peer')).toHaveCount(5);
  await expect(page.getByTestId('peer').first()).toContainText('Peer supporter');
  await expect(page.getByTestId('peer').first().getByRole('button', { name: /^Ask \w+ for support$/ })).toBeVisible();
  await expect(H.screen(page)).toContainText('You asked for peer support, so they appear first in your matches.');
  await expect(H.screen(page)).toContainText('Want to help others? Nominate yourself under Peer support on the Me page.');
});
test('SP-02 Ask … for support opens a chat', async ({ page }) => {
  const name = (await page.getByTestId('peer').first().getByRole('button', { name: /^Ask/ }).textContent()).replace(/^Ask | for support$/g, '');
  await page.getByTestId('peer').first().getByRole('button', { name: /^Ask/ }).click();
  await expect(page.locator('#msg')).toBeVisible(); await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
});
test('SP-12 Show all peer supporters, then fewer', async ({ page }) => {
  await H.btn(page, 'Show all 21 peer supporters').click(); await expect(page.getByTestId('peer')).toHaveCount(21);
  await H.btn(page, 'Show fewer').click(); await expect(page.getByTestId('peer')).toHaveCount(5);
});
test('SP-12 Shows when you are a peer supporter too', async ({ page }) => {
  await H.tab(page, 'Me').click(); await H.toggle(page, 'Nominate myself as a peer supporter').click();
  await H.tab(page, 'Support').click(); await expect(H.screen(page)).toContainText('You are listed as a peer supporter too.');
});
test('SP-03 A message for you, and Another message shows the next one', async ({ page }) => {
  const first = await page.locator('#uplift').textContent(); expect(first.length).toBeGreaterThan(20);
  await H.btn(page, 'Another message').click(); await expect(page.locator('#uplift')).not.toHaveText(first);
});
test('SP-03 The message changes daily', async ({ page }) => {
  const today = await page.locator('#uplift').textContent();
  await page.clock.install({ time: new Date(Date.now() + 86400000) }); await page.reload(); await H.signInDemo(page); await H.tab(page, 'Support').click();
  await expect(page.locator('#uplift')).not.toHaveText(today);
});
test('SP-04 Help services for the chosen country', async ({ page }) => {
  await expect(page.locator('#services')).toContainText('999 or 112'); await expect(page.locator('#services')).toContainText('116 123');
  await page.locator('#country').selectOption('Australia');
  await expect(page.locator('#services')).toContainText('000'); await expect(page.locator('#services')).toContainText('13 11 14');
});
test('SP-04 The country is remembered', async ({ page }) => {
  await page.locator('#country').selectOption('New Zealand'); await expect(page.locator('#services')).toContainText('1737');
  await H.signOut(page); await H.signInDemo(page); await H.tab(page, 'Support').click();
  await expect(page.locator('#country')).toHaveValue('New Zealand');
  expect((await H.stored(page)).accounts.quietheron.profile.country).toBe('New Zealand');
});
test('SP-04 Lines that are not open all day show their hours, with a 24-hour line where there is one', async ({ page }) => {
  await page.locator('#country').selectOption('Poland');
  await expect(page.locator('#services')).toContainText('Crisis line for adults (2pm to 10pm)'); await expect(page.locator('#services')).toContainText('800 70 22 22');
});
test('SP-05 Show all 33 countries', async ({ page }) => {
  await H.btn(page, 'Show all 33 countries').click();
  await expect(page.locator('#all-countries').getByRole('heading')).toHaveCount(33);
  for (const t of ['Kenya', '+254 722 178 177', 'Japan', '03-5774-0992']) await expect(page.locator('#all-countries')).toContainText(t);
});
test('SP-05 And hide them again', async ({ page }) => {
  await H.btn(page, 'Show all 33 countries').click(); await H.btn(page, 'Hide other countries').click();
  await expect(page.locator('#all-countries')).toHaveCount(0);
});
test('SP-06 Overdose signs and what to do, including naloxone', async ({ page }) => {
  for (const t of ['If you think someone has overdosed, call your emergency number now.', 'Signs of an opioid overdose', 'Tiny, pinpoint pupils', 'Signs of a stimulant overdose', 'If you have naloxone, give it.'])
    await expect(H.screen(page)).toContainText(t);
});
test('SP-06 Lowering risk', async ({ page }) => {
  for (const t of ['Lower your risk', "Don't use alone.", 'Mixing opioids, benzodiazepines and alcohol greatly raises the risk.', 'Carry naloxone.'])
    await expect(H.screen(page)).toContainText(t);
});
test('SP-07 Ask for a review from the Support page', async ({ page }) => {
  await H.btn(page, 'Ask for a review').click();
  await expect(page.locator('#hr-topic')).toHaveValue('A message that was blocked');
  await expect(H.sheet(page)).toContainText('Every review is decided straight away.');
});
test('SP-09 Your reviews are listed with their decision', async ({ page }) => {
  await H.btn(page, 'Ask for a review').click();
  await page.fill('#hr-text', 'My message about my naloxone training was blocked.'); await H.btn(page, 'Request a review').click();
  await expect(page.locator('#rv-status')).toContainText('which is allowed', { timeout: 6000 }); await H.btn(page, 'Done').click();
  await expect(page.getByTestId('my-review')).toHaveCount(1);
  await expect(page.getByTestId('my-review')).toContainText('HR-1001 · A message that was blocked');
  await expect(page.getByTestId('my-review')).toContainText('Decided: Overturned');
});
