const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const sheet = H.sheet;
test.beforeEach(async ({ page }) => { await H.open(page); });
const profileOf = async (page, i = 0) => { await H.signInDemo(page); await H.tab(page, 'Search').click(); await page.getByTestId('person').nth(i).click(); };
const reportFromProfile = async page => { await profileOf(page); await sheet(page).getByRole('button', { name: 'Report', exact: true }).click(); };
async function review(page, topic, text) {
  if (topic) await page.locator('#hr-topic').selectOption(topic);
  await page.fill('#hr-text', text); await H.btn(page, 'Request a review').click();
}
const openReviewFromBlocked = async page => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'anyone holding?');
  await H.btn(page, 'Think this is wrong? Ask for a review').click();
};

test('HS-01 Help sheet: emergency advice, 7 helplines, grounding, Support and Close', async ({ page }) => {
  await H.btn(page, 'Help now').click();
  await expect(sheet(page)).toContainText('If you are in danger or someone may have overdosed, call emergency services now.');
  await expect(sheet(page)).toContainText('Grounding, right now');
  for (const l of ['988', '116 123', '13 11 14', '1737', '911 · 999 · 112 · 000', '1-800-484-3731', '0300 123 6600']) await expect(sheet(page)).toContainText(l);
});
test('HS-01 The Help sheet closes', async ({ page }) => {
  await H.btn(page, 'Help now').click(); await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
});
test('HS-02 Help sheet links to the Support page', async ({ page }) => {
  await H.signInDemo(page); await H.btn(page, 'Help now').click();
  await sheet(page).getByRole('button', { name: 'See help services for every country' }).click();
  await expect(H.tab(page, 'Support')).toHaveAttribute('aria-selected', 'true');
});
test('HS-02 From a chat too', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Help now').click();
  await sheet(page).getByRole('button', { name: 'See help services for every country' }).click();
  await expect(H.tab(page, 'Support')).toHaveAttribute('aria-selected', 'true');
});
test('HS-03 Block from a profile hides them from Search and Home counts', async ({ page }) => {
  await profileOf(page); await H.btn(page, 'Block').click();
  await expect(page.locator('#match-count')).toHaveText('99 people');
  await H.tab(page, 'Home').click(); await expect(page.locator('#tile-interests')).toContainText('99 people');
});
test('HS-03 Block from a chat hides them from Chats', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'MossyOtter'); await H.btn(page, 'Safety & options').click();
  await sheet(page).getByRole('button', { name: 'Block', exact: true }).click();
  await expect(H.chatRow(page, 'MossyOtter')).toHaveCount(0);
  await H.tab(page, 'Search').click(); await page.getByRole('button', { name: /^Show all/ }).click();
  await expect(page.getByRole('button', { name: /^MossyOtter, \d+% match$/ })).toHaveCount(0);
});
test('HS-04 Report has 7 reasons', async ({ page }) => {
  await reportFromProfile(page);
  await expect(sheet(page).getByRole('heading', { name: 'Report JuniperWren' })).toBeVisible();
  await expect(page.locator('#report-reasons').getByRole('button')).toHaveCount(7);
});
test('HS-04 A report is sent and reviewed', async ({ page }) => {
  await reportFromProfile(page); await H.btn(page, 'Spam or scam').click();
  await expect(H.toast(page)).toHaveText("Report sent. We're reviewing it now."); await expect(sheet(page)).toHaveCount(0);
});
test('HS-05 Danger reports are reviewed urgently', async ({ page }) => {
  await reportFromProfile(page); await H.btn(page, 'Seems to be in danger').click();
  await expect(H.toast(page)).toHaveText('Report sent. Because this may be serious, it is being reviewed urgently.');
});
test('HS-05 Under 18 reports raise a review automatically', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.btn(page, 'Report').click(); await H.btn(page, 'Under 18').click();
  await expect(H.toast(page)).toContainText('reviewed urgently');
  const cases = await page.evaluate(() => JSON.parse(localStorage.getItem('user-app-v1')).accounts.quietheron.cases);
  expect(cases[0]).toMatchObject({ topic: 'A report I made', auto: true, text: 'Automatic: Under 18' });
});
test('HS-06 Review from a report opens the form with A report I made', async ({ page }) => {
  await reportFromProfile(page); await H.btn(page, 'Think a decision is wrong? Ask for a review').click();
  await expect(page.locator('#hr-topic')).toHaveValue('A report I made');
});
test('HS-06 The report review can be sent', async ({ page }) => {
  await reportFromProfile(page); await H.btn(page, 'Think a decision is wrong? Ask for a review').click();
  await review(page, null, 'The person I reported keeps messaging me.');
  await expect(page.locator('#review-sent')).toContainText('Review requested');
});
test('SP-07 Review form: 5 topics and up to 500 characters', async ({ page }) => {
  await openReviewFromBlocked(page);
  expect(await page.locator('#hr-topic option').allTextContents()).toEqual(['A message that was blocked', 'A report I made', 'A report about me', 'A room request', 'Something else']);
  await expect(page.locator('#hr-text')).toHaveAttribute('maxlength', '500');
});
test('SP-07 Says reviews are decided straight away and checked by an arbitrator', async ({ page }) => {
  await openReviewFromBlocked(page);
  await expect(sheet(page)).toContainText('Every review is decided straight away. An independent arbitrator checks decisions and can change them.');
});
test('SP-08 Under 10 characters is refused', async ({ page }) => {
  await openReviewFromBlocked(page); await review(page, null, 'too short');
  await expect(page.locator('#hr-err')).toHaveText('Please describe what happened in at least 10 characters.');
});
test('SP-08 Empty is refused', async ({ page }) => {
  await openReviewFromBlocked(page); await H.btn(page, 'Request a review').click();
  await expect(page.locator('#hr-err')).toHaveText('Please describe what happened in at least 10 characters.'); await expect(page.locator('#review-sent')).toHaveCount(0);
});
test('SP-09 Review requested with a case number', async ({ page }) => {
  await openReviewFromBlocked(page); await review(page, null, 'I was asking about a support group.');
  await expect(page.locator('#review-sent')).toContainText('Your review HR-1001 has been sent and is being checked now.');
  await expect(page.locator('#rv-status')).toHaveText('Checking…');
});
test('SP-09 The decision note shows a moment later', async ({ page }) => {
  await openReviewFromBlocked(page); await review(page, null, 'I was asking about a support group.');
  await expect(page.locator('#rv-status')).toContainText('Reviewed automatically:', { timeout: 6000 });
});
test('SP-11 A recovery message is overturned', async ({ page }) => {
  await openReviewFromBlocked(page); await review(page, null, 'My message about my naloxone training was blocked.');
  await expect(page.locator('#rv-status')).toContainText('which is allowed', { timeout: 6000 });
});
test('SP-11 An unclear one keeps the safest outcome and will be checked again', async ({ page }) => {
  await openReviewFromBlocked(page); await review(page, 'Something else', 'I am not sure why this happened to me.');
  await expect(page.locator('#rv-status')).toHaveText("Reviewed automatically: we couldn't confirm the message was safe, so the decision stays. It will be checked again.", { timeout: 6000 });
});
