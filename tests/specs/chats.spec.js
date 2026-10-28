const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); await H.signIn(page); await H.tab(page, 'Chats').click(); });
const open = (page, name) => page.locator('#screen .person', { hasText: name }).first().click();

test('C-01 Six chats, most recent first', async ({ page }) => {
  const want = await H.data(page, () => Object.keys(S.convos).sort((a, b) => S.convos[b].at(-1).ts - S.convos[a].at(-1).ts).map(id => person(id).handle));
  await expect(page.locator('#screen .person .name')).toHaveText(want);
});
test('C-01 Unread chats carry a New tag', async ({ page }) => {
  await expect(page.locator('#screen .person .pill', { hasText: 'New' })).toHaveCount(3);
});
test('C-02 New account sees the empty message', async ({ page, baseURL }) => {
  await H.openUrl(page, baseURL); await H.createAccount(page, 'Empty_User'); await H.finishSetup(page); await H.tab(page, 'Chats').click();
  await expect(page.getByText('No chats yet.')).toBeVisible();
});
test('C-02 Empty chats button opens Search', async ({ page, baseURL }) => {
  await H.openUrl(page, baseURL); await H.createAccount(page, 'Empty_User2'); await H.finishSetup(page); await H.tab(page, 'Chats').click();
  await page.getByRole('button', { name: 'Search for people' }).click(); await expect(H.tab(page, 'Search')).toHaveAttribute('aria-current', 'page');
});
test('C-03 Safety reminder in a chat', async ({ page }) => {
  await open(page, 'MossyOtter');
  await expect(page.getByText("You're both anonymous, and every message is checked for safety.")).toBeVisible();
});
test('C-03 Opening marks the chat as read', async ({ page }) => {
  await open(page, 'MossyOtter'); expect((await H.state(page)).unread.p1).toBeUndefined();
});
test('C-04 Six starters fill the message box', async ({ page }) => {
  await open(page, 'SteadyBadger'); await expect(page.locator('.ice .chip')).toHaveCount(6);
  await page.locator('.ice .chip').first().click(); await expect(page.locator('#msg')).toHaveValue('What made you smile this week?');
});
test('C-04 No starters once a chat has 3 or more messages', async ({ page }) => {
  await open(page, 'MossyOtter'); await expect(page.locator('.ice')).toHaveCount(0);
});
test('C-05 Sending shows your message', async ({ page }) => {
  await open(page, 'SteadyBadger'); await H.send(page, 'Hello there');
  await expect(page.locator('.bubble.me').last()).toHaveText('Hello there');
});
test('C-05 Empty messages are ignored; 1000-character limit', async ({ page }) => {
  await open(page, 'SteadyBadger'); const n = await page.locator('.bubble.me').count();
  await H.send(page, '   '); await expect(page.locator('.bubble.me')).toHaveCount(n);
  await expect(page.locator('#msg')).toHaveAttribute('maxlength', '1000');
});
test('C-06 A reply arrives after a typing indicator', async ({ page }) => {
  await open(page, 'SteadyBadger'); const n = await page.locator('.bubble.them').count();
  await H.send(page, 'How are you?');
  await expect(page.locator('.typing')).toContainText('SteadyBadger is typing');
  await expect(page.locator('.bubble.them')).toHaveCount(n + 1, { timeout: 8000 });
});
test('C-06 Sample members reply from the general replies', async ({ page }) => {
  const h = await H.data(page, () => person('m15').handle);
  await open(page, h); await H.send(page, 'Hi again');
  await expect(page.locator('.bubble.them')).toHaveCount(2, { timeout: 8000 });
  const last = await page.locator('.bubble.them').last().textContent();
  expect(await H.data(page, t => GENERIC_REPLIES.includes(t), last)).toBe(true);
});
for (const bad of ['I am selling some', 'who is the plug round here', 'its £20 a gram', 'add me on whatsapp', 'see https://example.com', 'got 🔌', 'I used to sell, now I sell on telegram']) {
  test(`C-07 Blocked: "${bad}"`, async ({ page }) => {
    await open(page, 'SteadyBadger'); const n = await page.locator('.bubble.me').count(); await H.send(page, bad);
    await expect(page.locator('.warnbox')).toContainText('Message not sent'); await expect(page.locator('.bubble.me')).toHaveCount(n);
  });
}
for (const ok of ['I used to sell', 'I used to sell, now I help others stay clean', 'I never deal anymore, 2 years clean', 'Did my naloxone training today', 'I walked my dog by the river']) {
  test(`C-07 Allowed: "${ok}"`, async ({ page }) => {
    await open(page, 'SteadyBadger'); await H.send(page, ok);
    await expect(page.locator('.warnbox')).toHaveCount(0); await expect(page.locator('.bubble.me').last()).toHaveText(ok);
  });
}
for (const num of ['call me on 07700 900123', 'ring +44 7700 900123', 'my number is 555-123-4567']) {
  test(`C-08 Phone numbers are allowed: "${num}"`, async ({ page }) => {
    await open(page, 'SteadyBadger'); await H.send(page, num);
    await expect(page.locator('.warnbox')).toHaveCount(0); await expect(page.locator('.bubble.me').last()).toHaveText(num);
  });
}
for (const words of ['I want to die', 'thinking about suicide', 'I took too many, maybe overdose', 'I want to self-harm']) {
  test(`C-09 Crisis words open Help: "${words}"`, async ({ page }) => {
    await open(page, 'SteadyBadger'); await H.send(page, words);
    await expect(page.locator('.bubble.me').last()).toHaveText(words);
    await expect(H.sheet(page).getByRole('heading', { name: "You don't have to hold this alone" })).toBeVisible();
  });
}
test('C-10 Chat options sheet', async ({ page }) => {
  await open(page, 'MossyOtter'); await page.getByRole('button', { name: 'Safety & options' }).click();
  await expect(H.sheet(page).getByText('Meeting up safely')).toBeVisible();
  for (const b of ['Mute', 'Report', 'Block']) await expect(H.sheet(page).getByRole('button', { name: b, exact: true })).toBeVisible();
});
test('C-10 Block from options hides the chat', async ({ page }) => {
  await open(page, 'MossyOtter'); await page.getByRole('button', { name: 'Safety & options' }).click();
  await H.sheet(page).getByRole('button', { name: 'Block', exact: true }).click(); await H.tab(page, 'Chats').click();
  await expect(page.locator('#screen .person', { hasText: 'MossyOtter' })).toHaveCount(0);
});
test('C-11 Mute shows a message', async ({ page }) => {
  await open(page, 'MossyOtter'); await page.getByRole('button', { name: 'Safety & options' }).click();
  await H.sheet(page).getByRole('button', { name: 'Mute' }).click(); await expect(H.toast(page)).toHaveText('Muted for 8 hours.');
});
test('C-11 Mute keeps you in the chat', async ({ page }) => {
  await open(page, 'MossyOtter'); await page.getByRole('button', { name: 'Safety & options' }).click();
  await H.sheet(page).getByRole('button', { name: 'Mute' }).click(); await expect(page.locator('#bar .title')).toHaveText('MossyOtter');
});
test('C-12 Back returns to the chat list', async ({ page }) => {
  await open(page, 'MossyOtter'); await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
});
test('C-12 Back after Say hi also returns to Chats', async ({ page }) => {
  await H.sayHiTo(page, 'PaperFern'); await page.getByRole('button', { name: 'Back' }).click();
  await expect(H.tab(page, 'Chats')).toHaveAttribute('aria-current', 'page');
});
test('C-13 Blocked section with Unblock', async ({ page }) => {
  await page.evaluate(() => { S.blocked = ['p1']; render(); });
  const sec = page.locator('#screen .section', { hasText: 'Blocked (1)' });
  await expect(sec).toContainText('MossyOtter'); await sec.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.locator('#screen .person', { hasText: 'MossyOtter' })).toHaveCount(1);
});
test('C-13 No Blocked section when nobody is blocked', async ({ page }) => {
  await expect(page.getByText(/^Blocked \(/)).toHaveCount(0);
});
test('C-14 Blocked message offers a review', async ({ page }) => {
  await open(page, 'SteadyBadger'); await H.send(page, 'anyone selling?');
  await page.getByRole('button', { name: 'Think this is wrong? Ask for a review' }).click();
  await expect(page.locator('#hr-topic')).toHaveValue('A message that was blocked');
});
test('C-14 That review can be sent', async ({ page }) => {
  await open(page, 'SteadyBadger'); await H.send(page, 'anyone selling?');
  await page.getByRole('button', { name: 'Think this is wrong? Ask for a review' }).click();
  await page.fill('#hr-text', 'I was asking if anyone is selling a bike.'); await H.sheet(page).getByRole('button', { name: 'Request a review' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Review requested' })).toBeVisible();
});
