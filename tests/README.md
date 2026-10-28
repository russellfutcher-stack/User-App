# User prototype: test rig

Automated browser tests for the User: Connection and Recovery prototype, one or more per function in `function-list.csv`.

## Run the tests

You need Node.js 18 or newer.

```
cd tests
npm install
npx playwright install chromium
npm test
npm run report
```

- `npm test` runs every test in Chromium and prints a pass or fail line for each.
- `npm run report` builds `results/test-report.html` (open it in a browser) and `results/test-results.csv` (the function list with results added).
- Playwright's own detailed report is in `results/html`. Open it with `npx playwright show-report results/html`.

## Test a different copy of the prototype

```
PROTOTYPE=/path/to/User-prototype.html npm test
```

## How the tests are organised

- `specs/*.spec.js`: one file per app area. Each test name starts with the function ID it checks, for example `DS-05`.
- `specs/helpers.js`: shared steps such as signing in to the demo account or creating an account.
- Every test starts in a fresh browser with nothing saved. The clock is fixed at 2pm UTC, or 11pm UTC for late-night tests.
- `report-notes.json`: the change notes and bug notes shown at the top of the report.
