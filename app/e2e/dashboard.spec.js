const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page }) => { await H.open(page); });
const asArbitrator = async page => { await H.signIn(page, 'Arbitrator', 'fair review'); await expect(page.getByRole('heading', { name: 'Arbitrator dashboard' })).toBeVisible(); };
const caseRow = (page, id) => page.getByTestId('case').filter({ hasText: id });
const check = async (page, id) => { await caseRow(page, id).getByRole('button', { name: 'Check' }).click(); await expect(H.sheet(page)).toBeVisible(); };
// A member asks for a review, then signs out so the arbitrator can sign in.
const memberReview = async (page, text = 'My message about my naloxone training was blocked.') => {
  await H.signInDemo(page); await H.tab(page, 'Support').click(); await H.btn(page, 'Ask for a review').click();
  await page.fill('#hr-text', text); await H.btn(page, 'Request a review').click();
  await expect(page.locator('#rv-status')).toContainText('Reviewed automatically', { timeout: 6000 }); await H.btn(page, 'Done').click();
  await H.signOut(page);
};

test('AD-01 The arbitrator signs in to the dashboard, with no tab bar', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#tabs')).toHaveCount(0);
});
test('AD-01 A wrong arbitrator password is refused', async ({ page }) => {
  await H.signIn(page, 'Arbitrator', 'unfair review');
  await expect(page.getByText("That username and password don't match.", { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Arbitrator dashboard' })).toHaveCount(0);
});
test('AD-02 Summary figures', async ({ page }) => {
  await asArbitrator(page);
  for (const t of ['1,284', 'active today', 'active in the last 7 days', 'new members this week', 'peer supporters', 'members who want peer support', 'flagged for a check', 'urgent cases'])
    await expect(page.locator('#kpis')).toContainText(t);
});
test('AD-02 Urgent and flagged counts come from the cases', async ({ page }) => {
  await asArbitrator(page);
  const urgent = await page.getByTestId('case').filter({ hasText: 'Urgent' }).count();
  await expect(page.locator('#kpis')).toContainText(`${urgent}urgent cases`);
  const flagged = await page.getByTestId('case').filter({ hasText: 'Flagged' }).count();
  await expect(page.getByText(`${flagged} flagged`, { exact: true })).toBeVisible();
});
test('AD-03 One Decided table with every case', async ({ page }) => {
  await asArbitrator(page);
  await expect(page.getByTestId('case')).toHaveCount(9); await expect(page.getByRole('heading', { name: 'Decided (9)' })).toBeVisible();
  await expect(caseRow(page, 'HR-0991')).toContainText('Urgent'); await expect(caseRow(page, 'HR-0978')).not.toContainText('Urgent');
});
test("AD-03 Cases raised in this browser are marked 'This browser'", async ({ page }) => {
  await memberReview(page); await asArbitrator(page);
  await expect(page.getByTestId('case')).toHaveCount(10);
  await expect(caseRow(page, 'HR-1001')).toContainText('This browser'); await expect(caseRow(page, 'HR-1001')).toContainText('QuietHeron');
});
test('AD-13 The AI Review Agent decides every case; naloxone is overturned', async ({ page }) => {
  await asArbitrator(page);
  await expect(caseRow(page, 'HR-0978')).toContainText('Decided: Overturned'); await expect(caseRow(page, 'HR-0983')).toContainText('Decided: Overturned');
  await expect(caseRow(page, 'HR-0989')).toContainText('Decided: Action changed');
});
test('AD-13 Under 85% it keeps a decision and flags the case', async ({ page }) => {
  await asArbitrator(page);
  await expect(caseRow(page, 'HR-0968')).toContainText('Flagged'); await expect(caseRow(page, 'HR-0968')).toContainText('80% confident');
  await expect(caseRow(page, 'HR-0978')).not.toContainText('Flagged');
});
test('AD-04 Changing a decision needs a note', async ({ page }) => {
  await asArbitrator(page); await check(page, 'HR-0978');
  await expect(H.sheet(page)).toContainText('AI Review Agent'); await expect(H.sheet(page)).toContainText('Recovery or harm-reduction context');
  await H.btn(page, 'Uphold the decision').click();
  await expect(page.locator('#arb-err')).toHaveText('Add a short note explaining your decision.');
});
test("AD-04 The case then shows 'by Arbitrator'", async ({ page }) => {
  await asArbitrator(page); await check(page, 'HR-0974');
  await page.fill('#arb-note', 'Telegram details are not allowed, even for groups.'); await H.btn(page, 'Change the action').click();
  await expect(H.toast(page)).toHaveText('HR-0974 decided: Action changed.');
  await expect(caseRow(page, 'HR-0974')).toContainText('Decided: Action changed'); await expect(caseRow(page, 'HR-0974')).toContainText('by Arbitrator');
});
test('AD-05 The decision reaches the member on the Support page', async ({ page }) => {
  await memberReview(page, 'I am not sure why this happened to me.'); await asArbitrator(page); await check(page, 'HR-1001');
  await page.fill('#arb-note', 'Looked again: your message was fine, the block is removed.'); await H.btn(page, 'Overturn it').click();
  await H.btn(page, 'Sign out').click(); await H.signInDemo(page); await H.tab(page, 'Support').click();
  await expect(page.getByTestId('my-review')).toContainText('Decided: Overturned');
  await expect(page.getByTestId('my-review')).toContainText('Arbitrator: Looked again: your message was fine, the block is removed.');
});
test('SP-10 An arbitrator decision is kept after signing in again', async ({ page }) => {
  await asArbitrator(page); await check(page, 'HR-0971');
  await page.fill('#arb-note', 'Spam adverts are removed.'); await H.btn(page, 'Uphold the decision').click();
  await H.btn(page, 'Sign out').click(); await asArbitrator(page);
  await expect(caseRow(page, 'HR-0971')).toContainText('by Arbitrator');
});
test('AD-06 Message safety figures', async ({ page }) => {
  await asArbitrator(page);
  for (const t of ['182,406', 'messages checked', 'messages blocked', 'times Help was shown after crisis words']) await expect(page.locator('#safety')).toContainText(t);
});
test('AD-06 Blocked messages by reason', async ({ page }) => {
  await asArbitrator(page);
  const list = page.getByRole('list', { name: 'Blocked messages by reason' });
  await expect(list.getByRole('listitem')).toHaveCount(5); await expect(list).toContainText('Buying or selling drugs');
});
test('AD-07 Reports by reason (7)', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#reports').getByRole('listitem')).toHaveCount(7);
});
test('AD-07 Includes danger and under-18 reports', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#reports')).toContainText('Seems to be in danger'); await expect(page.locator('#reports')).toContainText('Under 18');
});
test('AD-08 Blocks, mutes and pauses', async ({ page }) => {
  await asArbitrator(page);
  for (const t of ['blocks this week', 'members muted', 'members paused']) await expect(H.screen(page)).toContainText(t);
});
test('AD-08 Most-blocked members', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#top-blocked')).toContainText('GreyFalcon'); await expect(page.locator('#top-blocked')).toContainText('blocked by 11 · 4 reports');
});
test('AD-09 Members by country (8 rows)', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#countries').getByRole('listitem')).toHaveCount(8);
});
test('AD-09 Says it comes from the country members choose', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#countries')).toContainText('United Kingdom');
  await expect(H.screen(page)).toContainText("Based on the country members choose on the Support page. User doesn't track location.");
});
test('AD-10 Peer support figures', async ({ page }) => {
  await asArbitrator(page);
  await expect(page.getByRole('heading', { name: 'Peer support' })).toBeVisible();
  await expect(H.screen(page)).toContainText('chats started with a peer supporter this week');
});
test('AD-10 Peer figures are marked as samples in the demo', async ({ page }) => {
  await asArbitrator(page); await expect(H.screen(page).getByText('Sample', { exact: true })).toHaveCount(6);
});
test('AD-11 Rooms and system health', async ({ page }) => {
  await asArbitrator(page);
  for (const t of ['rooms', 'room requests approved this week', 'room requests refused this week', 'reviews overdue']) await expect(page.locator('#health')).toContainText(t);
});
test('AD-11 Shows what the nightly re-check found', async ({ page }) => {
  await asArbitrator(page); await expect(page.locator('#health')).toContainText('missed by the first check, found by the nightly re-check');
});
test('AD-12 Sign out goes back to the Welcome page', async ({ page }) => {
  await asArbitrator(page); await H.btn(page, 'Sign out').click();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
});
test('AD-12 A member signing in afterwards sees the member pages', async ({ page }) => {
  await asArbitrator(page); await H.btn(page, 'Sign out').click(); await H.signInDemo(page);
  await expect(H.tab(page, 'Home')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Arbitrator dashboard' })).toHaveCount(0);
});
