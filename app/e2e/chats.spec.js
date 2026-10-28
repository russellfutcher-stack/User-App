const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const rows = page => page.locator('#chat-list').getByTestId('chat');
const msgs = page => page.locator('#msgs');
test.beforeEach(async ({ page }) => { await H.open(page); });
const demo = async page => { await H.signInDemo(page); await H.tab(page, 'Chats').click(); };

test('C-01 Six chats, most recent first', async ({ page }) => {
  await demo(page); await expect(rows(page)).toHaveCount(6);
  expect((await rows(page).allInnerTexts()).map(t => t.split('\n')[0])).toEqual(['HollowFox', 'MistyMoth', 'MossyOtter', 'SteadyBadger', 'CalmWren', 'SoftHeron']);
});
test('C-01 New tag on the 3 unread chats', async ({ page }) => {
  await demo(page); await expect(page.locator('#chat-list').getByText('New', { exact: true })).toHaveCount(3);
  await expect(rows(page).nth(3)).not.toContainText('New');
});
test('C-02 No chats yet for a new account', async ({ page }) => {
  await H.createAccount(page, 'Chatty_1'); await H.finishSetup(page); await H.tab(page, 'Chats').click();
  await expect(H.screen(page)).toContainText('No chats yet. Find someone who shares an interest and say hi.');
});
test('C-02 Search for people opens Search', async ({ page }) => {
  await H.createAccount(page, 'Chatty_2'); await H.finishSetup(page); await H.tab(page, 'Chats').click();
  await H.btn(page, 'Search for people').click(); await expect(H.tab(page, 'Search')).toHaveAttribute('aria-selected', 'true');
});
test('C-03 A chat says you are anonymous and messages are checked', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger');
  await expect(msgs(page)).toContainText("You're both anonymous, and every message is checked for safety. Never share your real name or address.");
});
test('C-03 Opening a chat marks it read', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'HollowFox'); await H.btn(page, 'Back').click();
  await expect(rows(page).first()).not.toContainText('New'); await expect(page.locator('#chat-list').getByText('New', { exact: true })).toHaveCount(2);
});
test('C-04 Six starters in a short chat', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'HollowFox');
  await expect(page.locator('#starters').getByRole('button')).toHaveCount(6);
});
test('C-04 A starter fills the message box; none in longer chats', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'HollowFox');
  await H.btn(page, 'Dog, cat, or no pets?').click(); await expect(page.locator('#msg')).toHaveValue('Dog, cat, or no pets?');
  await H.btn(page, 'Back').click(); await H.chatRow(page, 'MossyOtter').click(); await expect(page.locator('#starters')).toHaveCount(0);
});
test('C-05 Sending a message', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'Morning! How are you?');
  await expect(page.getByTestId('mine').last()).toHaveText('Morning! How are you?'); await expect(page.locator('#msg')).toHaveValue('');
});
test('C-05 Empty messages are ignored; up to 1000 characters', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger');
  const before = await page.getByTestId('mine').count(); await H.send(page, '   ');
  await expect(page.getByTestId('mine')).toHaveCount(before);
  await expect(page.locator('#msg')).toHaveAttribute('maxlength', '1000');
});
test('C-06 Typing indicator, then a reply', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'MossyOtter'); await H.send(page, 'Hello again!');
  await expect(page.locator('#typing')).toHaveText('MossyOtter is typing…');
  await expect(page.locator('#typing')).toHaveCount(0, { timeout: 8000 });
  await expect(page.getByTestId('theirs').last()).toHaveText('Do you have a dog, or are you more of a cat person?'); // MossyOtter's third line
});
test('C-06 A reply while you are away shows as New', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'Thanks again'); await H.btn(page, 'Back').click();
  await expect(H.chatRow(page, 'SteadyBadger')).toContainText('New', { timeout: 8000 });
});
test('C-07 Dealing and contact details are not sent', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger');
  for (const t of ['Anyone got any for sale?', 'add me on telegram', 'it is £20', 'see www.example.com']) {
    const before = await page.getByTestId('mine').count(); await H.send(page, t);
    await expect(page.locator('#warn')).toContainText('Message not sent'); await expect(page.getByTestId('mine')).toHaveCount(before);
  }
});
test('C-07 Recovery and harm-reduction context is allowed', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger');
  await H.send(page, 'I used to sell, now I help others stay clean'); await expect(page.locator('#warn')).toHaveCount(0);
  await H.send(page, 'Carry naloxone if you can'); await expect(page.getByTestId('mine').last()).toHaveText('Carry naloxone if you can');
  await H.send(page, 'I used to sell for £20'); await expect(page.locator('#warn')).toContainText('Message not sent');
});
test('C-08 Phone numbers are sent', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'My number is 07700 900123');
  await expect(page.getByTestId('mine').last()).toHaveText('My number is 07700 900123'); await expect(page.locator('#warn')).toHaveCount(0);
});
test('C-08 International numbers are sent too', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'Call me on +61 400 000 000');
  await expect(page.getByTestId('mine').last()).toHaveText('Call me on +61 400 000 000');
});
test('C-09 Crisis words: sent, then the Help sheet opens', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'I want to die');
  await expect(page.getByTestId('mine').last()).toHaveText('I want to die');
  await expect(H.sheet(page).getByRole('heading', { name: "You don't have to hold this alone" })).toBeVisible();
});
test('C-09 Overdose words open the Help sheet', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'I think I took too many');
  await expect(H.sheet(page)).toContainText('If you\'re thinking about ending your life or someone may have overdosed');
});
test('C-10 Safety & options: tips, Mute, Report and Block', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await expect(H.sheet(page)).toContainText('Meeting up safely');
  for (const b of ['Mute', 'Report', 'Block']) await expect(H.sheet(page).getByRole('button', { name: b, exact: true })).toBeVisible();
});
test('C-10 Block from a chat goes back to the list', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click();
  await expect(H.toast(page)).toHaveText("SteadyBadger is blocked. They can't see or message you.");
  await expect(rows(page)).toHaveCount(5);
});
test('C-11 Mute shows a message', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.btn(page, 'Mute').click(); await expect(H.toast(page)).toHaveText('Muted for 8 hours.');
});
test('C-11 Mute keeps the chat open', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.btn(page, 'Mute').click(); await expect(page.locator('#msg')).toBeVisible();
});
test('C-12 Back returns to the chat list', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Back').click();
  await expect(rows(page)).toHaveCount(6); await expect(page.locator('#tabs')).toBeVisible();
});
test('C-12 A chat hides the tab bar and names the person', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger');
  await expect(page.locator('#tabs')).toHaveCount(0); await expect(page.locator('#bar')).toContainText('SteadyBadger');
});
test('C-13 Blocked section with Unblock', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click();
  await expect(page.locator('#chats-blocked')).toContainText('Blocked (1)'); await expect(page.locator('#chats-blocked')).toContainText("SteadyBadger can't message you");
});
test('C-13 Unblocking brings the chat back', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.btn(page, 'Safety & options').click();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click(); await expect(rows(page)).toHaveCount(5);
  await page.locator('#chats-blocked').getByRole('button', { name: 'Unblock' }).click();
  await expect(rows(page)).toHaveCount(6); await expect(page.locator('#chats-blocked')).toHaveCount(0);
});
test('C-14 A blocked message offers a review', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'anyone holding?');
  await expect(page.locator('#warn').getByRole('button', { name: 'Think this is wrong? Ask for a review' })).toBeVisible();
});
test('C-14 Asking for a review (form arrives in step 4)', async ({ page }) => {
  await H.signInDemo(page); await H.openChat(page, 'SteadyBadger'); await H.send(page, 'anyone holding?');
  await H.btn(page, 'Think this is wrong? Ask for a review').click(); await expect(H.toast(page)).toHaveText('Reviews open here.');
});
test('C-15 Swipe left shows Delete; tapping it deletes the chat', async ({ page }) => {
  await demo(page); await H.swipe(page, H.chatRow(page, 'SteadyBadger'));
  await H.btn(page, 'Delete chat with SteadyBadger').click();
  await expect(rows(page)).toHaveCount(5); await expect(H.toast(page)).toContainText('Chat with SteadyBadger deleted.');
  await expect(H.toast(page).getByRole('button', { name: 'Undo' })).toBeVisible();
});
test('C-15 A short swipe snaps back and a swipe never opens the chat', async ({ page }) => {
  await demo(page); const row = H.chatRow(page, 'SteadyBadger'); const x = (await row.boundingBox()).x;
  await H.swipe(page, row, 30); await expect(page.locator('#chat-list')).toBeVisible(); await page.waitForTimeout(400);
  expect((await row.boundingBox()).x).toBe(x);
  await H.swipe(page, H.chatRow(page, 'SteadyBadger')); await expect(page.locator('#chat-list')).toBeVisible();
  await H.chatRow(page, 'SteadyBadger').click(); await expect(page.locator('#chat-list')).toBeVisible(); // a tap closes the open row
});
test('C-16 Undo brings the chat back with its messages and unread state', async ({ page }) => {
  await demo(page); await H.swipe(page, H.chatRow(page, 'MossyOtter')); await H.btn(page, 'Delete chat with MossyOtter').click();
  await H.toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(rows(page)).toHaveCount(6); await expect(H.chatRow(page, 'MossyOtter')).toContainText('New');
  await H.chatRow(page, 'MossyOtter').click(); await expect(page.getByTestId('theirs')).toHaveCount(2);
});
test('C-16 Undo is offered for 5 seconds', async ({ page }) => {
  await demo(page); await H.swipe(page, H.chatRow(page, 'CalmWren')); await H.btn(page, 'Delete chat with CalmWren').click();
  await page.waitForTimeout(3500); await expect(H.toast(page).getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(H.toast(page)).toHaveCount(0, { timeout: 3000 });
});
test('G-06 Unread dot on the Chats tab', async ({ page }) => {
  await H.signInDemo(page); await expect(page.locator('#unread-dot')).toBeVisible();
  for (const n of ['HollowFox', 'MistyMoth', 'MossyOtter']) { await H.openChat(page, n); await H.btn(page, 'Back').click(); }
  await expect(page.locator('#unread-dot')).toHaveCount(0);
});
test('G-06 No dot without unread chats; a new reply adds one', async ({ page }) => {
  await H.createAccount(page, 'Dotty_1'); await H.finishSetup(page); await expect(page.locator('#unread-dot')).toHaveCount(0);
  await H.tab(page, 'Search').click(); await page.getByTestId('person').first().click(); await H.btn(page, 'Say hi').click();
  await H.send(page, 'Hi!'); await H.btn(page, 'Back').click(); await expect(page.locator('#unread-dot')).toBeVisible({ timeout: 8000 });
});
