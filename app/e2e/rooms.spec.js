const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const list = page => page.locator('#room-list').getByTestId('room');
const yours = page => page.locator('#your-rooms').getByTestId('room');
const yourRow = (page, name) => page.locator('#your-rooms').getByRole('button', { name, exact: true });
const open = (page, name) => page.locator('#room-list').getByRole('button', { name, exact: true }).click();
const type = (page, k) => page.locator(`#roomtype-${k}`);
test.beforeEach(async ({ page }) => { await H.open(page); await H.signInDemo(page); await H.tab(page, 'Rooms').click(); });
async function request(page, name, desc, cat) {
  await H.btn(page, 'Request a new room').click(); await page.fill('#rq-name', name); await page.fill('#rq-desc', desc);
  if (cat) await page.locator('#rq-cat').selectOption(cat);
  await H.btn(page, 'Send request').click();
}

test('R-01 One type at a time', async ({ page }) => {
  await expect(type(page, 'interests')).toHaveAttribute('aria-pressed', 'true');
  await type(page, 'drugs').click();
  await expect(type(page, 'drugs')).toHaveAttribute('aria-pressed', 'true'); await expect(type(page, 'interests')).toHaveAttribute('aria-pressed', 'false');
  await expect(list(page).first()).toContainText('Early Days');
});
test('R-01 The chosen type is remembered', async ({ page }) => {
  await type(page, 'mh').click(); await H.tab(page, 'Home').click(); await H.tab(page, 'Rooms').click();
  await expect(type(page, 'mh')).toHaveAttribute('aria-pressed', 'true'); await expect(list(page).first()).toContainText('Anxiety Corner');
});
test('R-02 Room row: type, name, Joined, description, members', async ({ page }) => {
  const r = list(page).first();
  for (const t of ['Interest', "Dog Walkers' Bench", 'Joined', 'Share walks and routes', '128 members']) await expect(r).toContainText(t);
});
test('R-02 No Moderated tag', async ({ page }) => {
  await expect(H.screen(page)).not.toContainText('Moderated');
  await expect(list(page).nth(2)).not.toContainText('Joined');
});
test('R-03 Interest 5, Drug use 5, Mental health 4', async ({ page }) => {
  await expect(type(page, 'interests')).toContainText('5 rooms'); await expect(type(page, 'drugs')).toContainText('5 rooms'); await expect(type(page, 'mh')).toContainText('4 rooms');
  await expect(list(page)).toHaveCount(5); await type(page, 'mh').click(); await expect(list(page)).toHaveCount(4);
});
test('R-03 Rooms created for you are added to their type', async ({ page }) => {
  await request(page, 'Cyclists in Recovery', 'Riding together on daytime routes.');
  await H.btn(page, 'Done').click(); await expect(type(page, 'interests')).toContainText('6 rooms');
});
test('R-04 Your rooms lists joined rooms', async ({ page }) => {
  await expect(yours(page)).toHaveCount(2);
  expect((await yours(page).allInnerTexts()).join(' ')).toContain('Book Nook');
});
test('R-04 Joining a room adds it to Your rooms', async ({ page }) => {
  await open(page, 'Green Fingers'); await H.btn(page, 'Join room to post').click(); await H.btn(page, 'Back').click();
  await expect(yours(page)).toHaveCount(3);
});
test('R-05 A room shows its description, safety note and members', async ({ page }) => {
  await open(page, "Dog Walkers' Bench");
  await expect(page.locator('#room-intro')).toHaveText('Share walks and routes, and plan daytime walk-alongs in public places. Every message is checked for safety. 128 members.');
});
test('R-05 A room shows its posts', async ({ page }) => {
  await open(page, "Dog Walkers' Bench");
  await expect(page.getByTestId('theirs')).toHaveCount(6); await expect(page.getByTestId('theirs').first()).toContainText('MossyOtter');
});
test('R-06 Join room to post shows the message box', async ({ page }) => {
  await open(page, 'Movie Night Fridays'); await expect(page.locator('#msg')).toHaveCount(0);
  await H.btn(page, 'Join room to post').click();
  await expect(page.locator('#msg')).toBeVisible(); await expect(H.toast(page)).toHaveText("Joined. Say hello when you're ready.");
});
test('R-06 Joining counts you as a member', async ({ page }) => {
  await open(page, 'Movie Night Fridays'); await H.btn(page, 'Join room to post').click(); await H.btn(page, 'Back').click();
  await expect(list(page).nth(2)).toContainText('Joined');
});
test('R-07 Posting in a room', async ({ page }) => {
  await open(page, 'Book Nook'); await page.fill('#msg', 'Just finished chapter 5!'); await H.btn(page, 'Post').click();
  await expect(page.getByTestId('mine').last()).toHaveText('Just finished chapter 5!');
});
test('R-07 Same filter and crisis help as chats', async ({ page }) => {
  await open(page, 'Book Nook'); await page.fill('#msg', 'dm me on snapchat'); await H.btn(page, 'Post').click();
  await expect(page.locator('#warn')).toContainText('Message not sent');
  await page.fill('#msg', 'I want to end it all'); await H.btn(page, 'Post').click();
  await expect(H.sheet(page)).toContainText('These lines are open now.');
});
test('R-08 Request form: name, type and purpose', async ({ page }) => {
  await H.btn(page, 'Request a new room').click();
  await expect(page.locator('#rq-name')).toHaveAttribute('maxlength', '40'); await expect(page.locator('#rq-desc')).toHaveAttribute('maxlength', '160');
  expect(await page.locator('#rq-cat option').allTextContents()).toEqual(['Interest', 'Drug use', 'Mental health']);
});
test('R-08 Type starts as the type you are looking at', async ({ page }) => {
  await type(page, 'drugs').click(); await H.btn(page, 'Request a new room').click();
  await expect(page.locator('#rq-cat')).toHaveValue('drugs');
});
test('R-09 Short name or purpose is refused', async ({ page }) => {
  await request(page, 'Hi', 'Riding together on daytime routes.'); await expect(page.locator('#rq-err')).toHaveText('Give the room a name of at least 3 characters.');
  await page.fill('#rq-name', 'Cyclists'); await page.fill('#rq-desc', 'Bikes'); await H.btn(page, 'Send request').click();
  await expect(page.locator('#rq-err')).toHaveText('Say what the room is for in at least 10 characters.');
});
test('R-09 Dealing words and existing names are refused', async ({ page }) => {
  await request(page, 'Plug Room', 'Where to buy, cash app welcome.');
  await expect(page.locator('#rq-err')).toHaveText("Room requests can't mention buying or selling, prices, links or contact details.");
  await page.fill('#rq-name', 'book nook'); await page.fill('#rq-desc', 'Another place for readers.'); await H.btn(page, 'Send request').click();
  await expect(page.locator('#rq-err')).toHaveText('A room with that name already exists or has been requested.');
});
test('R-10 Request sent successfully', async ({ page }) => {
  await request(page, 'Cyclists in Recovery', 'Riding together on daytime routes.');
  await expect(page.locator('#request-sent')).toContainText('Request sent successfully');
  await expect(page.locator('#request-sent')).toContainText('Your request for Cyclists in Recovery has been sent.');
});
test('R-10 The request is listed', async ({ page }) => {
  await request(page, 'Cyclists in Recovery', 'Riding together on daytime routes.'); await H.btn(page, 'Done').click();
  await expect(page.locator('#requests')).toContainText('Cyclists in Recovery · Interest');
});
test('R-11 Approved after a moment, and you have joined it', async ({ page }) => {
  await request(page, 'Cyclists in Recovery', 'Riding together on daytime routes.');
  await expect(page.locator('#rq-status')).toHaveText('Checking…');
  await expect(page.locator('#rq-status')).toHaveText('Approved. The room has been created and you have joined it.', { timeout: 4000 });
  await H.btn(page, 'Done').click(); await expect(page.locator('#requests')).toContainText('Approved');
  await expect(yourRow(page, 'Cyclists in Recovery')).toBeVisible();
});
test('R-11 The new room is under its type with a welcome post', async ({ page }) => {
  await request(page, 'Night Thoughts', 'Company for long anxious nights.', 'mh'); await H.btn(page, 'Done').click();
  await type(page, 'mh').click(); await open(page, 'Night Thoughts');
  await expect(page.getByTestId('theirs').first()).toContainText('Welcome to Night Thoughts. This room has just been created. Say hello!');
});
test('R-12 Leave a built-in room, with Undo', async ({ page }) => {
  await H.swipe(page, yourRow(page, 'Book Nook')); await H.btn(page, 'Leave Book Nook').click();
  await expect(H.toast(page)).toContainText('You left Book Nook.'); await expect(yours(page)).toHaveCount(1);
  await H.toast(page).getByRole('button', { name: 'Undo' }).click(); await expect(yours(page)).toHaveCount(2);
});
test('R-12 Delete a room you created; only Your rooms can be swiped', async ({ page }) => {
  await request(page, 'Cyclists in Recovery', 'Riding together on daytime routes.'); await H.btn(page, 'Done').click();
  await H.swipe(page, yourRow(page, 'Cyclists in Recovery')); await H.btn(page, 'Delete Cyclists in Recovery').click();
  await expect(H.toast(page)).toContainText('Room Cyclists in Recovery deleted.'); await expect(type(page, 'interests')).toContainText('5 rooms');
  await expect(page.locator('#room-list').getByTestId('swipe')).toHaveCount(0);
});
