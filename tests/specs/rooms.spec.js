const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const CATALOGUE = [["Dog Walkers' Bench", 'Book Nook', 'Movie Night Fridays', "Gamers' Lounge", 'Green Fingers'],
  ['Early Days', 'Taper Together', 'Alcohol-Free Evenings', 'Harm Reduction Space', 'Family & Friends'],
  ['Anxiety Corner', 'Low Mood & Depression', 'PTSD Peer Space', 'ADHD Hangout']];
const typeSection = page => page.locator('#screen .section').filter({ has: page.locator('.ghead') });
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); await H.tab(page, 'Rooms').click(); });
async function request(page, { name = 'Cyclists in Recovery', type = 'interests', desc = 'Weekend rides and chat for people in recovery.' } = {}) {
  await page.getByRole('button', { name: 'Request a new room' }).click();
  await page.fill('#rq-name', name); await page.locator('#rq-cat').selectOption(type); await page.fill('#rq-desc', desc);
  await H.sheet(page).getByRole('button', { name: 'Send request' }).click();
}

test('R-01 One type at a time', async ({ page }) => {
  await page.locator('.room-path').nth(2).click();
  await expect(page.locator('.room-path[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('.room-path').nth(2)).toHaveAttribute('aria-pressed', 'true');
});
test('R-01 The chosen type is remembered', async ({ page }) => {
  await page.locator('.room-path').nth(1).click(); await H.tab(page, 'Me').click(); await H.tab(page, 'Rooms').click();
  await expect(page.locator('.room-path').nth(1)).toHaveAttribute('aria-pressed', 'true');
});
test('R-02 Row shows type, name and members', async ({ page }) => {
  await page.locator('.room-path').nth(1).click();
  const row = typeSection(page).locator('.person', { hasText: 'Early Days' });
  await expect(row.locator('.tag')).toHaveText('Drug use'); await expect(row).toContainText('96 members');
});
test('R-02 No Moderated tags', async ({ page }) => {
  for (let i = 0; i < 3; i++) { await page.locator('.room-path').nth(i).click(); await expect(page.locator('#screen')).not.toContainText('Moderated'); }
});
test('R-03 Room names by type', async ({ page }) => {
  for (let i = 0; i < 3; i++) { await page.locator('.room-path').nth(i).click(); await expect(typeSection(page).locator('.person .name')).toHaveText(CATALOGUE[i]); }
});
test('R-03 Tile counts 5, 5 and 4', async ({ page }) => {
  await expect(page.locator('.room-path .pc')).toHaveText(['5 rooms', '5 rooms', '4 rooms']);
});
test('R-04 Your rooms lists joined rooms', async ({ page }) => {
  await expect(page.locator('#screen .section', { hasText: 'Your rooms' }).locator('.person .name')).toHaveText(["Dog Walkers' Bench", 'Book Nook']);
});
test('R-04 Joining adds a room to Your rooms', async ({ page }) => {
  await page.locator('.room-path').nth(2).click(); await typeSection(page).locator('.person', { hasText: 'ADHD Hangout' }).click();
  await page.getByRole('button', { name: 'Join room to post' }).click(); await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('#screen .section', { hasText: 'Your rooms' }).locator('.person .name')).toContainText(['ADHD Hangout']);
});
test('R-05 Room shows its description and safety note', async ({ page }) => {
  await page.locator('#screen .person', { hasText: 'Book Nook' }).first().click();
  await expect(page.locator('#bar .title')).toHaveText('Book Nook');
  await expect(page.locator('#msgs .bubble.sys').first()).toContainText('Every message is checked for safety.');
});
test('R-05 Room shows all its posts, including sample members', async ({ page }) => {
  const n = await H.data(page, () => ROOMS.find(r => r.id === 'r5').seed.length);
  await page.locator('#screen .person', { hasText: 'Book Nook' }).first().click();
  await expect(page.locator('.bubble.them')).toHaveCount(n); expect(n).toBeGreaterThanOrEqual(4);
});
test('R-06 Join shows the message box', async ({ page }) => {
  await page.locator('.room-path').nth(1).click(); await typeSection(page).locator('.person', { hasText: 'Early Days' }).click();
  await page.getByRole('button', { name: 'Join room to post' }).click();
  await expect(H.toast(page)).toContainText('Joined.'); await expect(page.locator('#msg')).toBeVisible();
});
test('R-06 Before joining there is no message box', async ({ page }) => {
  await page.locator('.room-path').nth(1).click(); await typeSection(page).locator('.person', { hasText: 'Early Days' }).click();
  await expect(page.locator('#msg')).toHaveCount(0);
});
test('R-07 Posting adds your post', async ({ page }) => {
  await page.locator('#screen .person', { hasText: 'Book Nook' }).first().click(); await H.send(page, "Loving this month's book");
  await expect(page.locator('.bubble.me').last()).toHaveText("Loving this month's book");
});
test('R-07 Room posts use the same filter and crisis help', async ({ page }) => {
  await page.locator('#screen .person', { hasText: 'Book Nook' }).first().click();
  await H.send(page, 'anyone selling?'); await expect(page.locator('.warnbox')).toContainText('Message not sent');
  await H.send(page, 'I want to die'); await expect(H.sheet(page).getByRole('heading', { name: "You don't have to hold this alone" })).toBeVisible();
});
test('R-08 Request form fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Request a new room' }).click();
  await expect(page.locator('#rq-name')).toHaveAttribute('maxlength', '40');
  await expect(page.locator('#rq-cat option')).toHaveText(['Interest', 'Drug use', 'Mental health']);
  await expect(page.locator('#rq-desc')).toHaveAttribute('maxlength', '160');
});
test('R-08 No moderator option', async ({ page }) => {
  await page.getByRole('button', { name: 'Request a new room' }).click();
  await expect(H.sheet(page)).not.toContainText(/moderator|\bAI\b/i);
});
for (const [label, input, msg] of [['short name', { name: 'ab' }, 'at least 3 characters'], ['short purpose', { desc: 'short' }, 'at least 10 characters'], ['dealing words', { desc: 'Somewhere to sell and swap pills cheaply' }, "can't mention buying or selling"], ['existing name', { name: 'book nook' }, 'already exists']]) {
  test(`R-09 Refused: ${label}`, async ({ page }) => { await request(page, input); await expect(page.locator('#rq-err')).toContainText(msg); });
}
test('R-10 Request sent successfully', async ({ page }) => {
  await request(page, { type: 'mh' });
  await expect(H.sheet(page).getByRole('heading', { name: 'Request sent successfully' })).toBeVisible();
  await expect(page.locator('#rq-status')).toHaveText('Checking…');
});
test('R-10 The request is listed', async ({ page }) => {
  await request(page, { type: 'mh' });
  await expect(page.locator('[aria-label="Your room requests"] .line')).toContainText('Cyclists in Recovery');
});
test('R-11 Approved, created and joined', async ({ page }) => {
  await request(page, { type: 'mh' });
  await expect(page.locator('#rq-status')).toHaveText('Approved. The room has been created and you have joined it.', { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click(); await page.locator('.room-path').nth(2).click();
  await expect(page.locator('.room-path').nth(2).locator('.pc')).toHaveText('5 rooms');
  await expect(typeSection(page).locator('.person', { hasText: 'Cyclists in Recovery' }).locator('.pill')).toHaveText('Joined');
});
test('R-11 The same name can\'t be requested again', async ({ page }) => {
  await request(page, { type: 'mh' }); await expect(page.locator('#rq-status')).toHaveText(/Approved/, { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click(); await request(page, {});
  await expect(page.locator('#rq-err')).toContainText('already exists');
});
