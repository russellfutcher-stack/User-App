const { test } = require('@playwright/test');
const H = require('./helpers'); const { expect } = H;
const people = page => page.locator('#results [data-testid="person"]');
const names = async page => (await people(page).allInnerTexts()).map(t => t.split('\n')[0]);
const count = page => page.locator('#match-count');
const pick = (page, label) => H.chip(page, label).click();
const go = page => H.btn(page, 'Search').click();
const showAll = page => page.getByRole('button', { name: /^Show all \d+ matches$/ }).click();
test.beforeEach(async ({ page }) => { await H.open(page); await H.signInDemo(page); await H.tab(page, 'Search').click(); });

test('DS-01 Your Matches at the top with a count', async ({ page }) => {
  await expect(H.screen(page).getByRole('heading', { name: 'Your Matches' })).toBeVisible(); await expect(count(page)).toHaveText('100 people');
  const text = (await H.screen(page).innerText()).toLowerCase(); expect(text.indexOf('your matches')).toBeLessThan(text.indexOf('1. choose'));
});
test('DS-01 Sorted by match score', async ({ page }) => {
  await showAll(page);
  const pcts = (await people(page).allInnerTexts()).map(t => +t.match(/(\d+)%/)[1]);
  expect(pcts).toHaveLength(100); expect([...pcts].sort((a, b) => b - a)).toEqual(pcts);
});
test('DS-02 Shows the top 3 at first', async ({ page }) => {
  await expect(people(page)).toHaveCount(3); await expect(H.btn(page, 'Show all 100 matches')).toBeVisible();
});
test('DS-02 Show all, then Show top 3', async ({ page }) => {
  await showAll(page); await expect(people(page)).toHaveCount(100);
  await H.btn(page, 'Show top 3').click(); await expect(people(page)).toHaveCount(3);
});
test('DS-03 All three choices are On, labelled 1. Choose', async ({ page }) => {
  await expect(H.screen(page).getByText('1. Choose', { exact: true })).toBeVisible();
  for (const k of ['interests', 'drugs', 'mh']) await expect(page.locator(`#tile-${k}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(H.screen(page).getByRole('heading', { name: 'Search', exact: true })).toHaveCount(0);
});
test('DS-03 Off hides the items and removes the picks', async ({ page }) => {
  await pick(page, 'Alcohol'); await page.locator('#tile-drugs').click();
  await expect(page.locator('#tile-drugs')).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('#choice-drugs')).toHaveCount(0);
  await page.locator('#tile-drugs').click(); await expect(H.chip(page, 'Alcohol')).toHaveAttribute('aria-checked', 'false');
});
test('DS-04 Picked items turn yellow', async ({ page }) => {
  await pick(page, 'Music');
  await expect(H.chip(page, 'Music')).toHaveAttribute('aria-checked', 'true');
  await expect(H.chip(page, 'Music')).toHaveCSS('background-color', 'rgb(255, 212, 59)');
});
test('DS-04 Interest shows all 20 interests', async ({ page }) => {
  await expect(page.locator('#choice-interests').getByRole('checkbox')).toHaveCount(20);
});
test('DS-05 Any pick within a choice counts', async ({ page }) => {
  await pick(page, 'Pets & dog walking'); await go(page); await expect(count(page)).toHaveText('12 people');
  await pick(page, 'Books & reading'); await go(page); await expect(count(page)).toHaveText('23 people');
});
test('DS-05 Every choice used must match', async ({ page }) => {
  await pick(page, 'Pets & dog walking'); await pick(page, 'Alcohol'); await pick(page, 'Generalised anxiety'); await go(page);
  await expect(count(page)).toHaveText('1 person'); expect(await names(page)).toEqual(['MossyOtter']);
});
test('DS-06 Finding people with lists the picks', async ({ page }) => {
  await pick(page, 'Music'); await H.chip(page, 'A walking buddy').click(); await H.chip(page, 'Peer supporters only').click();
  await expect(page.locator('#summary')).toContainText('Finding people with');
  for (const t of ['Music', 'A walking buddy', 'Peer supporters only']) await expect(page.locator('#summary')).toContainText(t);
});
test('DS-06 No summary until something is picked', async ({ page }) => {
  await expect(page.locator('#summary')).toHaveCount(0); await pick(page, 'Music'); await expect(page.locator('#summary')).toHaveCount(1);
});
test('DS-07 Clear all filters resets everything', async ({ page }) => {
  await pick(page, 'Music'); await page.locator('#tile-mh').click(); await go(page);
  await H.btn(page, 'Clear all filters').click();
  await expect(H.chip(page, 'Music')).toHaveAttribute('aria-checked', 'false'); await expect(page.locator('#tile-mh')).toHaveAttribute('aria-pressed', 'true');
});
test('DS-07 Clear all filters updates Your Matches', async ({ page }) => {
  await pick(page, 'Pets & dog walking'); await go(page); await expect(count(page)).toHaveText('12 people');
  await H.btn(page, 'Clear all filters').click(); await expect(count(page)).toHaveText('100 people');
  await expect(page.locator('#pending')).toHaveCount(0);
});
test('DS-08 Keeps people who meet a pick and ranks those who meet more first', async ({ page }) => {
  await H.chip(page, 'A walking buddy').click(); await H.chip(page, 'A book buddy').click(); await go(page);
  expect((await names(page)).slice(0, 2)).toEqual(['RustyMoth', 'GentleKestrel']);
});
test('DS-08 A peer mentor pairs with To mentor someone', async ({ page }) => {
  await H.chip(page, 'A peer mentor').click(); await go(page); await expect(count(page)).toHaveText('34 people');
  await showAll(page); expect(await names(page)).toContain('GentleCrane'); // offers To mentor someone
});
test('DS-09 Peer supporters only', async ({ page }) => {
  await H.chip(page, 'Peer supporters only').click(); await go(page); await expect(count(page)).toHaveText('21 people');
});
test('DS-09 Every result is a peer supporter', async ({ page }) => {
  await H.chip(page, 'Peer supporters only').click(); await go(page); await showAll(page);
  for (const t of await people(page).allInnerTexts()) expect(t).toContain('Peer supporter');
});
test('DS-10 No results message', async ({ page }) => {
  await pick(page, 'GHB / GBL'); await pick(page, 'Eating disorders'); await pick(page, 'Fishing'); await go(page);
  await expect(count(page)).toHaveText('0 people');
  await expect(H.screen(page)).toContainText('No one matches all of those yet. Try removing a filter, or join a room to meet people more broadly.');
});
test('DS-10 No Show all button with no results', async ({ page }) => {
  await pick(page, 'GHB / GBL'); await pick(page, 'Eating disorders'); await go(page);
  await expect(page.getByRole('button', { name: /^Show all/ })).toHaveCount(0);
});
test('DS-11 Card shows name, badge, status, stage, region and match', async ({ page }) => {
  const first = people(page).first();
  for (const t of ['JuniperWren', 'Peer supporter', '3h ago', 'Supporting someone I love · Ireland', '72%']) await expect(first).toContainText(t);
});
test('DS-11 At most 4 tags, shared ones highlighted', async ({ page }) => {
  await showAll(page);
  for (const row of await people(page).all()) expect(await row.getByTestId('tag').count()).toBeLessThanOrEqual(4);
  await expect(people(page).first().getByText('Pets & dog walking')).toHaveCSS('background-color', 'rgb(255, 212, 59)');
});
test('DS-12 Peer supporter boost when you want peer support', async ({ page }) => {
  await expect(people(page).first()).toContainText('72%'); // JuniperWren: shared interests plus the 12-point peer boost
  await H.chip(page, 'Peer supporters only').click(); await go(page); await expect(people(page).first()).toContainText('JuniperWren');
});
test('DS-12 Scores never go above 99%', async ({ page }) => {
  await showAll(page);
  const pcts = (await people(page).allInnerTexts()).map(t => +t.match(/(\d+)%/)[1]);
  expect(Math.max(...pcts)).toBeLessThanOrEqual(99); expect(Math.min(...pcts)).toBeGreaterThanOrEqual(0);
});
test('DS-13 Profile sheet shows match, why and details', async ({ page }) => {
  await people(page).first().click();
  for (const t of ['JuniperWren', '72%', 'Offers to listen to people who want peer support.', 'My brother is in recovery.', 'Matched because you both like pets & dog walking', "Where they're at", 'Supporting someone I love', 'Looking for'])
    await expect(H.sheet(page)).toContainText(t);
  await expect(H.sheet(page)).toContainText('Not shared'); // JuniperWren has no drug use tags
});
test('DS-13 Block removes them and lists them on Me', async ({ page }) => {
  await people(page).first().click(); await H.btn(page, 'Block').click();
  await expect(H.toast(page)).toHaveText("JuniperWren is blocked. They can't see or message you.");
  await expect(count(page)).toHaveText('99 people'); expect(await names(page)).not.toContain('JuniperWren');
  await H.tab(page, 'Me').click(); await expect(page.locator('#blocked')).toContainText('JuniperWren');
});
test('DS-14 Say hi opens a chat with them', async ({ page }) => {
  await people(page).first().click(); await H.btn(page, 'Say hi').click();
  await expect(H.sheet(page)).toHaveCount(0); await expect(page.locator('#bar')).toContainText('JuniperWren');
  await expect(page.getByPlaceholder('Message JuniperWren')).toBeVisible();
});
test('DS-14 Say hi from the matches screen opens Chats', async ({ page }) => {
  await H.signOut(page); await H.createAccount(page, 'Greeter_1'); await H.finishSetup(page, 'Music', { toHome: false });
  await page.locator('#match-list [data-testid="person"]').first().click(); await H.btn(page, 'Say hi').click();
  await expect(page.locator('#msgs')).toContainText("You're both anonymous");
  await H.btn(page, 'Back').click(); await expect(H.tab(page, 'Chats')).toHaveAttribute('aria-selected', 'true');
});
test('DS-15 A notice shows until you tap Search', async ({ page }) => {
  await pick(page, 'Pets & dog walking');
  await expect(page.locator('#pending')).toHaveText('You have changed your search. Tap Search to update Your Matches.');
  await expect(count(page)).toHaveText('100 people');
  await go(page); await expect(page.locator('#pending')).toHaveCount(0);
});
test('DS-15 Search updates Your Matches and confirms the number', async ({ page }) => {
  await pick(page, 'Pets & dog walking'); await go(page);
  await expect(count(page)).toHaveText('12 people'); await expect(H.toast(page)).toHaveText('Search updated: 12 people.');
  expect(await H.screen(page).evaluate(el => el.scrollTop)).toBe(0);
});
test('DS-16 Drug use headings', async ({ page }) => {
  const box = page.locator('#choice-drugs');
  for (const t of ['Medications', 'Other Substances', 'Alcohol, nicotine & gambling']) await expect(box.getByText(t, { exact: true })).toBeVisible();
});
test('DS-16 Headings are in order', async ({ page }) => {
  const text = await page.locator('#choice-drugs').innerText();
  const i = ['MEDICATIONS', 'OTHER SUBSTANCES', 'ALCOHOL, NICOTINE & GAMBLING'].map(t => text.toUpperCase().indexOf(t));
  expect(i.every(x => x >= 0)).toBe(true); expect([...i].sort((a, b) => a - b)).toEqual(i);
});
