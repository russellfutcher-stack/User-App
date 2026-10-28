const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); });
async function report(page, reason, who) {
  await H.tab(page, 'Search').click();
  if (who) { await page.getByRole('button', { name: /Show all/ }).click(); await page.locator('#results .person', { hasText: who }).click(); }
  else await page.locator('#results .person').first().click();
  await H.sheet(page).getByRole('button', { name: 'Report' }).click();
  if (reason) await H.sheet(page).getByRole('button', { name: reason }).click();
}

test('HS-01 Seven helplines and grounding', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await expect(H.sheet(page).locator('.line .num')).toHaveCount(7); await expect(H.sheet(page).getByText('Grounding, right now')).toBeVisible();
});
test('HS-01 Emergency advice and Close', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await expect(H.sheet(page)).toContainText('call emergency services now');
  await H.sheet(page).getByRole('button', { name: 'Close' }).click(); await expect(H.sheet(page)).toHaveCount(0);
});
test('HS-02 Help sheet opens the Support page', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await H.sheet(page).getByRole('button', { name: 'See help services for every country' }).click();
  await expect(page.getByRole('heading', { name: 'Help services by country' })).toBeVisible();
});
test('HS-02 Support tab is then current', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await H.sheet(page).getByRole('button', { name: 'See help services for every country' }).click();
  await expect(H.tab(page, 'Support')).toHaveAttribute('aria-current', 'page');
});
test('HS-03 Blocking removes them from Search', async ({ page }) => {
  await H.openChatWith(page, 'MossyOtter'); await page.getByRole('button', { name: 'Safety & options' }).click();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click();
  await H.tab(page, 'Search').click(); await expect(page.locator('#match-count')).toHaveText('99 people');
});
test('HS-03 Blocking from a profile confirms', async ({ page }) => {
  await H.tab(page, 'Search').click(); await page.locator('#results .person').first().click();
  const name = await H.sheet(page).locator('h2').textContent();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click();
  await expect(H.toast(page)).toHaveText(`${name} is blocked. They can't see or message you.`);
});
test('HS-04 Seven reasons and a confirmation', async ({ page }) => {
  await report(page); await expect(H.sheet(page).locator('.lines .btn')).toHaveCount(7);
  await H.sheet(page).getByRole('button', { name: 'Spam or scam' }).click();
  await expect(H.toast(page)).toHaveText("Report sent. We're reviewing it now.");
});
test('HS-04 Reports are counted', async ({ page }) => {
  await report(page, 'Harassment or hate'); expect((await H.state(page)).reported).toBe(1);
});
test('HS-05 Danger reports are reviewed urgently', async ({ page }) => {
  await report(page, 'Seems to be in danger');
  await expect(H.toast(page)).toHaveText('Report sent. Because this may be serious, it is being reviewed urgently.');
  await H.tab(page, 'Support').click(); await expect(page.locator('[aria-label="Your reviews"] .line')).toContainText('raised automatically');
});
test('HS-05 Under-18 reports are reviewed urgently too', async ({ page }) => {
  await report(page, 'Under 18'); expect((await H.state(page)).cases[0].auto).toBe(true);
});
test('HS-06 Report sheet links to a review', async ({ page }) => {
  await report(page); await H.sheet(page).getByRole('button', { name: 'Think a decision is wrong? Ask for a review' }).click();
  await expect(page.locator('#hr-topic')).toHaveValue('A report I made');
});
test('HS-06 That review can be sent', async ({ page }) => {
  await report(page); await H.sheet(page).getByRole('button', { name: 'Think a decision is wrong? Ask for a review' }).click();
  await page.fill('#hr-text', 'I reported someone and nothing seemed to happen.'); await H.sheet(page).getByRole('button', { name: 'Request a review' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Review requested' })).toBeVisible();
});
