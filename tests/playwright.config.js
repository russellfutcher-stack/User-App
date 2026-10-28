// Playwright test rig for the User: Connection and Recovery prototype.
// Run:  npm install  then  npx playwright install chromium  then  npm test  then  npm run report
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/results.json' }], ['html', { outputFolder: 'results/html', open: 'never' }]],
  use: {
    // The prototype file under test. Override with PROTOTYPE=/path/to/file.html
    baseURL: 'file://' + path.resolve(__dirname, process.env.PROTOTYPE || '../prototype/index.html'),
    viewport: { width: 1000, height: 900 },
    timezoneId: 'UTC',
    locale: 'en-GB',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
