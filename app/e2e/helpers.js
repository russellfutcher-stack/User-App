// Shared helpers. Every test gets a fresh browser, so stored data starts empty.
const { expect } = require('@playwright/test');

const WELCOME = 'Why people use User';
const KEY = 'user-app-v1';

async function open(page, { width } = {}) {
  if (width) await page.setViewportSize({ width, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: WELCOME })).toBeVisible();
}
const screen = page => page.locator('#screen');
const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const btn = (page, name) => page.getByRole('button', { name, exact: true });
const chip = (page, label) => screen(page).getByRole('checkbox', { name: label, exact: true });
const toggle = (page, label) => page.getByRole('switch', { name: label, exact: true });
const toast = page => page.locator('#toast');
const sheet = page => page.locator('#sheet');
const stored = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

async function signIn(page, user = 'QuietHeron', pass = 'quiet heron walks') {
  await page.fill('#li-h', user); await page.fill('#li-p', pass);
  await btn(page, 'Sign in').click();
}
async function signInDemo(page) { await signIn(page); await expect(tab(page, 'Home')).toBeVisible(); }
async function startSignup(page) { await btn(page, 'Create an anonymous account').click(); }
async function passRules(page) {
  await page.locator('#r-age').click(); await page.locator('#r-agree').click();
  await btn(page, 'Continue').click();
}
async function passCredentials(page, name = 'TestUser_1', pass = 'Strong!pass9') {
  await page.fill('#ob-h', name); await page.fill('#ob-p', pass); await page.fill('#ob-p2', pass);
  await btn(page, 'Continue').click();
  await expect(page.getByRole('heading', { name: 'Protect your account with a passkey' })).toBeVisible();
}
async function createAccount(page, name = 'TestUser_1', pass = 'Strong!pass9', { passkey = true } = {}) {
  await startSignup(page); await passRules(page); await passCredentials(page, name, pass);
  if (passkey) { await btn(page, 'Create a passkey').click(); await btn(page, 'Create account').click(); }
  else await btn(page, 'Create account without a passkey').click();
  await expect(page.getByText("Let's set up your profile.")).toBeVisible();
}
async function finishSetup(page, interest = 'Music', { wantsPeer = true, toHome = true } = {}) {
  await page.getByRole('radio', { name: wantsPeer ? 'Yes, match me with peer supporters' : 'Not right now' }).click();
  await chip(page, interest).click();
  await btn(page, 'Save profile and see my matches').click();
  await expect(page.getByRole('heading', { name: /^Here are your matches/ })).toBeVisible();
  if (toHome) { await btn(page, 'Continue to Home').click(); await expect(tab(page, 'Home')).toBeVisible(); }
}
async function signOut(page) { await tab(page, 'Me').click(); await btn(page, 'Sign out').click(); }
// Change what's stored in the browser (for example, add a blocked person), then reload signed out.
async function editStore(page, fn) {
  await page.evaluate(({ key, src }) => { const s = JSON.parse(localStorage.getItem(key)); (new Function('s', src))(s); localStorage.setItem(key, JSON.stringify(s)); }, { key: KEY, src: `(${fn})(s)` });
  await page.reload(); await expect(page.getByRole('heading', { name: WELCOME })).toBeVisible();
}

// Drag a swipe row to the left with the mouse (by `px`), as a finger would.
async function swipe(page, row, px = 140) {
  await row.scrollIntoViewIfNeeded(); const b = await row.boundingBox(); const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width - 20, y); await page.mouse.down();
  await page.mouse.move(b.x + b.width - 20 - px, y, { steps: 8 }); await page.mouse.up();
}
const chatRow = (page, name) => page.getByRole('button', { name: `Chat with ${name}`, exact: true });
async function openChat(page, name) { await tab(page, 'Chats').click(); await chatRow(page, name).click(); await expect(page.locator('#msg')).toBeVisible(); }
async function send(page, text) { await page.fill('#msg', text); await btn(page, 'Send').click(); }

module.exports = { swipe, chatRow, openChat, send, expect, WELCOME, KEY, open, screen, tab, btn, chip, toggle, toast, sheet, stored, signIn, signInDemo, startSignup, passRules, passCredentials, createAccount, finishSetup, signOut, editStore };
