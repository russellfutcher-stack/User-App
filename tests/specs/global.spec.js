const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
test.beforeEach(async ({ page, baseURL }) => { await H.openUrl(page, baseURL); });

test('G-01 Header on Welcome shows brand, Exit and Help now', async ({ page }) => {
  await expect(page.locator('#bar .brand')).toContainText('User');
  await expect(page.locator('#bar .brand small')).toHaveText('Connection and Recovery');
  await expect(page.locator('#bar').getByRole('button', { name: 'Help now' })).toBeVisible();
  await expect(page.locator('#bar').getByRole('button', { name: /Quick exit/ })).toBeVisible();
});
test('G-01 Header in a chat shows the word Back and the name', async ({ page }) => {
  await H.signIn(page); await H.openChatWith(page, 'MossyOtter');
  await expect(page.locator('#bar').getByRole('button', { name: 'Back' })).toHaveText('Back');
  await expect(page.locator('#bar .title')).toHaveText('MossyOtter');
  await expect(page.locator('#bar')).not.toContainText('←');
});
test('G-02 Help now opens the Help sheet on Welcome', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Help now' })).toBeVisible();
});
test('G-02 Help now works inside a chat', async ({ page }) => {
  await H.signIn(page); await H.openChatWith(page, 'MossyOtter');
  await page.getByRole('button', { name: 'Help now' }).click();
  await expect(H.sheet(page).getByRole('heading', { name: 'Help now' })).toBeVisible();
});
test('G-03 Quick exit shows the fake Notes screen and hides the app', async ({ page }) => {
  await H.signIn(page); await page.getByRole('button', { name: /Quick exit/ }).click();
  await expect(page.locator('.fake h1')).toHaveText('Shopping list');
  await expect(page.locator('#tabs')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Help now' })).toHaveCount(0);
});
test('G-03 Quick exit also closes an open sheet', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await page.locator('#bar').getByRole('button', { name: /Quick exit/ }).click({ force: true });
  await expect(H.sheet(page)).toHaveCount(0);
  await expect(page.locator('.fake')).toBeVisible();
});
test('G-04 Three taps return to the app, two do not', async ({ page }) => {
  await H.signIn(page); await page.getByRole('button', { name: /Quick exit/ }).click();
  await page.locator('.fake').click(); await page.locator('.fake').click();
  await expect(page.locator('.fake')).toBeVisible();
  await page.locator('.fake').click();
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('G-04 Returns to the same tab', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Rooms').click();
  await page.getByRole('button', { name: /Quick exit/ }).click();
  for (let i = 0; i < 3; i++) await page.locator('.fake').click();
  await expect(H.tab(page, 'Rooms')).toHaveAttribute('aria-current', 'page');
});
test('G-05 Six tabs in order, current tab marked', async ({ page }) => {
  await H.signIn(page);
  await expect(page.locator('.tab')).toHaveText([/Home/, /Me/, /Search/, /Chats/, /Rooms/, /Support/]);
  await H.tab(page, 'Support').click();
  await expect(H.tab(page, 'Support')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.tab[aria-current="page"]')).toHaveCount(1);
});
test('G-05 Tabs hidden on Welcome, in chats and in rooms', async ({ page }) => {
  await expect(page.locator('#tabs')).toBeHidden();
  await H.signIn(page); await H.openChatWith(page, 'MossyOtter');
  await expect(page.locator('#tabs')).toBeHidden();
  await page.getByRole('button', { name: 'Back' }).click(); await H.tab(page, 'Rooms').click();
  await page.locator('#screen .person', { hasText: 'Book Nook' }).first().click();
  await expect(page.locator('#tabs')).toBeHidden();
});
test('G-06 Unread dot shows while chats are unread', async ({ page }) => {
  await H.signIn(page);
  await expect(H.tab(page, 'Chats').locator('.dot')).toBeVisible();
});
test('G-06 Unread dot clears once every unread chat is opened', async ({ page }) => {
  await H.signIn(page);
  const unread = await H.data(page, () => Object.keys(S.unread).map(id => person(id).handle));
  for (const h of unread) { await H.openChatWith(page, h); await page.getByRole('button', { name: 'Back' }).click(); }
  await expect(H.tab(page, 'Chats').locator('.dot')).toHaveCount(0);
});
test('G-07 A toast appears and then disappears', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Me').click();
  await page.locator('#vis-mh').selectOption('everyone');
  await expect(H.toast(page)).toHaveText('Visibility updated.');
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 });
});
test('G-07 The newest toast shows the latest action', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Me').click();
  await page.locator('#t-lock').check(); await page.locator('#t-lock').uncheck();
  await expect(H.toast(page)).toHaveText('Turned off.');
});
test('G-08 Sheets close with Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await page.keyboard.press('Escape'); await expect(H.sheet(page)).toHaveCount(0);
});
test('G-08 Sheets close by tapping outside or Close', async ({ page }) => {
  await page.getByRole('button', { name: 'Help now' }).click();
  await page.locator('#scrim').dispatchEvent('click'); await expect(H.sheet(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Help now' }).click();
  await H.sheet(page).getByRole('button', { name: 'Close' }).click(); await expect(H.sheet(page)).toHaveCount(0);
});
test('G-09 Dark mode device still gets the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
test('G-09 Background stays light in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.device')).backgroundColor)).toBe('rgb(237, 245, 252)');
});
test('G-10 Wide screen shows the information panel', async ({ page }) => {
  await expect(page.locator('.aside')).toBeVisible();
});
test('G-10 Phone width: no panel and no sideways scrolling on any tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.aside')).toBeHidden();
  await H.signIn(page);
  for (const t of ['Home', 'Me', 'Search', 'Chats', 'Rooms', 'Support']) {
    await H.tab(page, t).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), t).toBeLessThanOrEqual(0);
  }
});
test('G-11 Byline is kept after reload', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Me').click();
  await page.getByRole('button', { name: 'Change byline' }).click(); await page.fill('#by-in', 'Persisted line'); await page.getByRole('button', { name: 'Save byline' }).click();
  await page.reload(); await H.signIn(page); await H.tab(page, 'Me').click();
  await expect(page.locator('#me-byline')).toHaveText('Persisted line');
});
test('G-11 Joined rooms are kept after reload', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Rooms').click();
  await page.locator('.room-path').nth(1).click();
  await page.locator('#screen .person', { hasText: 'Early Days' }).first().click();
  await page.getByRole('button', { name: 'Join room to post' }).click();
  await page.reload(); await H.signIn(page);
  expect((await H.state(page)).rooms.joined).toContain('r3');
});
test('G-12 Reload always opens on Welcome, signed out', async ({ page }) => {
  await H.signIn(page); await page.reload();
  await expect(page.getByRole('heading', { name: H.WELCOME })).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
});
test('G-12 Signing in lands on Home', async ({ page }) => {
  await H.signIn(page);
  await expect(H.tab(page, 'Home')).toHaveAttribute('aria-current', 'page');
});
test('G-13 No avatars on any tab', async ({ page }) => {
  await H.signIn(page);
  for (const t of ['Home', 'Me', 'Search', 'Chats', 'Rooms', 'Support']) { await H.tab(page, t).click(); await expect(page.locator('svg[aria-label="Avatar"]'), t).toHaveCount(0); }
});
test('G-13 No avatars in profiles or setup', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Search').click(); await page.locator('#results .person').first().click();
  await expect(page.locator('.sheet svg[aria-label="Avatar"]')).toHaveCount(0);
  await expect(page.getByText(/avatar/i)).toHaveCount(0);
});
const BANNED = /\b(AI|volunteers?|staff|moderat\w*|Night Owls?|User team)\b/;
test('G-14 Member pages never mention AI agents, staff, moderators or Night Owls', async ({ page }) => {
  expect(await page.locator('#screen').innerText()).not.toMatch(BANNED);
  await H.signIn(page);
  for (const t of ['Home', 'Me', 'Search', 'Chats', 'Rooms', 'Support']) { await H.tab(page, t).click(); expect(await page.locator('#screen').innerText(), t).not.toMatch(BANNED); }
  await page.getByRole('button', { name: 'Help now' }).click();
  expect(await H.sheet(page).innerText()).not.toMatch(BANNED);
});
test('G-14 No room says so either, and rooms say every message is checked', async ({ page }) => {
  await H.signIn(page); await H.tab(page, 'Rooms').click();
  const ids = await H.data(page, () => ROOMS.map(r => r.id));
  for (const id of ids) {
    await page.evaluate(i => App.room(i), id);
    const txt = await page.locator('#msgs').innerText();
    expect(txt, id).not.toMatch(BANNED);
    expect(txt, id).toContain('Every message is checked for safety.');
  }
});
test('G-15 100 fictional members with unique names and 21 peer supporters', async ({ page }) => {
  const d = await H.data(page, () => ({ n: PEOPLE.length, u: new Set(PEOPLE.map(p => p.handle.toLowerCase())).size, peers: PEOPLE.filter(p => p.peer).length }));
  expect(d).toEqual({ n: 100, u: 100, peers: 21 });
  await H.signIn(page); await H.tab(page, 'Search').click();
  await expect(page.locator('#match-count')).toHaveText('100 people');
});
test('G-15 Members are active in rooms and chats', async ({ page }) => {
  const lens = await H.data(page, () => ROOMS.map(r => r.seed.length));
  for (const n of lens) expect(n).toBeGreaterThanOrEqual(4);
  await H.signIn(page); await H.tab(page, 'Chats').click();
  await expect(page.locator('#screen .person')).toHaveCount(6);
  await expect(page.locator('#screen .person .pill', { hasText: 'New' })).toHaveCount(3);
});
