const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); });

// Drag a row left with the mouse (pointer events, the same path a finger uses)
async function swipe(page, row, dx) {
  await row.scrollIntoViewIfNeeded(); await page.waitForTimeout(50);
  const b = await row.boundingBox(); const y = b.y + b.height / 2, x = b.x + b.width - 30;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + dx * i / 8, y);
  await page.mouse.up();
}
// Swipe with touch pointer events, as a phone would send them
async function touchSwipe(row, dx) {
  await row.scrollIntoViewIfNeeded();
  await row.evaluate((el, dx) => {
    const r = el.getBoundingClientRect(), y = r.top + r.height / 2, x = r.right - 30;
    const ev = (type, cx) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: y });
    el.dispatchEvent(ev('pointerdown', x));
    for (let i = 1; i <= 8; i++) el.dispatchEvent(ev('pointermove', x + dx * i / 8));
    el.dispatchEvent(ev('pointerup', x + dx));
  }, dx);
}
const chatRow = (page, name) => page.locator('.swipe[data-kind="chat"]', { hasText: name });
const roomRowIn = (page, name) => page.locator('#screen .section', { hasText: 'Your rooms' }).locator('.swipe', { hasText: name });

test('C-15 Swiping a chat left shows Delete, and Delete removes it', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'MossyOtter');
  await swipe(page, row.locator('.swipe-row'), -140);
  await expect(row).toHaveClass(/open/);
  await expect(page.locator('#bar .title')).toHaveCount(0); // the swipe didn't open the chat
  await row.getByRole('button', { name: 'Delete chat with MossyOtter' }).click();
  await expect(chatRow(page, 'MossyOtter')).toHaveCount(0);
  await expect(H.toast(page)).toContainText('Chat with MossyOtter deleted.');
  expect((await H.state(page)).convos.p1).toBeUndefined();
});
test('C-15 A short swipe snaps back and nothing is deleted', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'MossyOtter');
  await swipe(page, row.locator('.swipe-row'), -30);
  await expect(row).not.toHaveClass(/open/);
  await expect(page.locator('.swipe[data-kind="chat"]')).toHaveCount(6);
});
test('C-15 Works with a finger (touch pointer events)', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'SteadyBadger');
  await touchSwipe(row.locator('.swipe-row'), -140);
  await expect(row).toHaveClass(/open/);
  await row.getByRole('button', { name: 'Delete chat with SteadyBadger' }).click();
  await expect(chatRow(page, 'SteadyBadger')).toHaveCount(0);
});
test('C-15 Tapping an open chat closes it without opening the chat', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'MossyOtter');
  await swipe(page, row.locator('.swipe-row'), -140); await expect(row).toHaveClass(/open/);
  await row.locator('.swipe-row .person').click({ position: { x: 160, y: 20 } });
  await expect(row).not.toHaveClass(/open/);
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
});
test('C-15 Chats page explains the swipe', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  await expect(page.getByText('Swipe a chat to the left to delete it.')).toBeVisible();
});
test('C-16 Undo brings the chat back with its unread tag', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'MossyOtter');
  await swipe(page, row.locator('.swipe-row'), -140);
  await row.getByRole('button', { name: 'Delete chat with MossyOtter' }).click();
  await H.toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(chatRow(page, 'MossyOtter')).toHaveCount(1);
  await expect(chatRow(page, 'MossyOtter').locator('.pill', { hasText: 'New' })).toHaveCount(1);
  expect((await H.state(page)).convos.p1.length).toBe(4);
});
test('C-16 Without Undo, the deleted unread chat leaves Home too', async ({ page }) => {
  await H.tab(page, 'Chats').click();
  const row = chatRow(page, 'MossyOtter');
  await swipe(page, row.locator('.swipe-row'), -140);
  await row.getByRole('button', { name: 'Delete chat with MossyOtter' }).click();
  await H.tab(page, 'Home').click();
  await expect(page.locator('#screen .section', { hasText: 'New messages' }).locator('.person')).toHaveCount(2);
});
test('R-12 Swiping a room in Your rooms shows Leave, and Leave removes it', async ({ page }) => {
  await H.tab(page, 'Rooms').click();
  const row = roomRowIn(page, 'Book Nook');
  await swipe(page, row.locator('.swipe-row'), -140);
  await row.getByRole('button', { name: 'Leave Book Nook' }).click();
  await expect(roomRowIn(page, 'Book Nook')).toHaveCount(0);
  await expect(H.toast(page)).toContainText('You left Book Nook.');
  expect((await H.state(page)).rooms.joined).not.toContain('r5');
});
test('R-12 A room you created shows Delete and is removed completely', async ({ page }) => {
  await H.tab(page, 'Rooms').click();
  await page.getByRole('button', { name: 'Request a new room' }).click();
  await page.fill('#rq-name', 'Cyclists in Recovery'); await page.fill('#rq-desc', 'Weekend rides and chat for people in recovery.');
  await H.sheet(page).getByRole('button', { name: 'Send request' }).click();
  await expect(page.locator('#rq-status')).toHaveText(/Approved/, { timeout: 5000 });
  await H.sheet(page).getByRole('button', { name: 'Done' }).click();
  const row = roomRowIn(page, 'Cyclists in Recovery');
  await swipe(page, row.locator('.swipe-row'), -140);
  await row.getByRole('button', { name: 'Delete Cyclists in Recovery' }).click();
  await expect(H.toast(page)).toContainText('Room Cyclists in Recovery deleted.');
  await expect(page.locator('#screen')).not.toContainText('Cyclists in Recovery');
});
test('R-12 Undo rejoins the room', async ({ page }) => {
  await H.tab(page, 'Rooms').click();
  const row = roomRowIn(page, 'Book Nook');
  await swipe(page, row.locator('.swipe-row'), -140);
  await row.getByRole('button', { name: 'Leave Book Nook' }).click();
  await H.toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(roomRowIn(page, 'Book Nook')).toHaveCount(1);
});
test('R-12 Only rooms in Your rooms can be swiped', async ({ page }) => {
  await H.tab(page, 'Rooms').click();
  await expect(page.locator('#screen .swipe')).toHaveCount(2);
  await expect(page.locator('#screen .section').filter({ has: page.locator('.ghead') }).locator('.swipe')).toHaveCount(0);
});
