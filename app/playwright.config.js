// End-to-end tests for the web app. They build the app without Supabase settings,
// so it keeps data in the browser, then serve it on port 8091.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  reporter: [['list'], ['json', { outputFile: 'e2e-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:8091',
    viewport: { width: 1000, height: 900 },
    timezoneId: 'UTC',
    locale: 'en-GB',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  outputDir: 'e2e-results/artifacts',
  webServer: {
    command: 'EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_KEY= npx expo export --platform web --output-dir dist-test && node e2e/serve.js dist-test 8091',
    url: 'http://localhost:8091',
    timeout: 300000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
