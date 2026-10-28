// Shared helpers. Every test gets a fresh browser context, so local storage starts empty.
const { expect } = require('@playwright/test');

const DAY = '2026-10-23T14:00:00Z';   // 2pm UTC
const WELCOME = 'Why people use User';

async function openUrl(page, baseURL, time = DAY) {
  await page.clock.setFixedTime(new Date(time));
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: WELCOME })).toBeVisible();
}
const tab = (page, name) => page.locator('.tab').filter({ hasText: new RegExp('^' + name + '$') });
const chip = (page, label) => page.locator('#screen button.chip').filter({ hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') });
const toast = page => page.locator('.toast').last();
const sheet = page => page.locator('.sheet');
const state = page => page.evaluate(() => S);
const data = (page, fn, arg) => page.evaluate(fn, arg); // run a function against the app's own data

async function signIn(page, user = 'QuietHeron', pass = 'quiet heron walks') {
  await page.fill('#li-h', user); await page.fill('#li-p', pass);
  await page.locator('form button[type=submit]').click();
}
const signInDemo = signIn;
async function signInArbitrator(page) { await signIn(page, 'Arbitrator', 'fair review'); await expect(page.locator('#bar .brand small')).toHaveText('Arbitrator dashboard'); }
async function signOut(page) { await tab(page, 'Me').click(); await page.getByRole('button', { name: 'Sign out' }).click(); }
async function startSignup(page) { await page.getByRole('button', { name: 'Create an anonymous account' }).click(); }
async function passRules(page) { await page.check('#r-age'); await page.check('#r-agree'); await page.getByRole('button', { name: 'Continue' }).click(); }
async function passCredentials(page, name = 'TestUser_1', pass = 'Strong!pass9') {
  await page.fill('#ob-h', name); await page.fill('#ob-p', pass); await page.fill('#ob-p2', pass);
  await page.getByRole('button', { name: 'Continue' }).click();
}
async function passCodes(page) { // passkey step: create one, then create the account
  await page.getByRole('button', { name: 'Create a passkey' }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}
async function createAccount(page, name = 'TestUser_1', pass = 'Strong!pass9') {
  await startSignup(page); await passRules(page); await passCredentials(page, name, pass); await passCodes(page);
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
}
async function finishSetup(page, interest = 'Music', { wantsPeer = true, stayOnMatches = false } = {}) {
  await page.check(`input[name="su-peer"][value="${wantsPeer ? 'yes' : 'no'}"]`);
  await chip(page, interest).click();
  await page.getByRole('button', { name: 'Save profile and see my matches' }).click();
  await expect(page.getByRole('heading', { name: /^Here are your matches/ })).toBeVisible();
  if (!stayOnMatches) await page.getByRole('button', { name: 'Continue to Home' }).click();
}
const runSearch = page => page.locator('#screen').getByRole('button', { name: 'Search', exact: true }).click();
const count = async page => parseInt(await page.locator('#match-count').textContent());
async function openChatWith(page, handle) { await tab(page, 'Chats').click(); await page.locator('#screen .person', { hasText: handle }).first().click(); }
async function send(page, text) { await page.fill('#msg', text); await page.getByRole('button', { name: /^(Send|Post)$/ }).click(); }
async function sayHiTo(page, handle) {
  await tab(page, 'Search').click(); await page.getByRole('button', { name: /Show all/ }).click();
  await page.locator('#results .person', { hasText: handle }).first().click();
  await sheet(page).getByRole('button', { name: 'Say hi' }).click();
}
async function requestReview(page, topic = 'Something else', text = 'Please check a decision about my message.') {
  await tab(page, 'Support').click();
  await page.locator('#screen').getByRole('button', { name: 'Ask for a review' }).click();
  await page.locator('#hr-topic').selectOption(topic); await page.fill('#hr-text', text);
  await sheet(page).getByRole('button', { name: 'Request a review' }).click();
}

module.exports = { expect, DAY, WELCOME, openUrl, tab, chip, toast, sheet, state, data, signIn, signInDemo, signInArbitrator, signOut, startSignup, passRules, passCredentials, passCodes, createAccount, finishSetup, runSearch, count, openChatWith, send, sayHiTo, requestReview };
