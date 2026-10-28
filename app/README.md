# User: the app

Expo (React Native and TypeScript). The web app comes first; iPhone and Android apps use the same code later.

## Run it

```
npm install
npx expo start --web          # opens the app in a browser
npm run typecheck
CHROMIUM_PATH=/opt/pw-browsers/chromium npm test   # builds the web app and runs the end-to-end tests
```

Without Supabase settings the app keeps data in the browser, with the demo account QuietHeron / quiet heron walks. With `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` set (the Publishable key; see `.env.example` and `../docs/SUPABASE-SETUP.md`) it uses the real server in Sydney, and there is no demo account.

## Where things are

- `App.tsx`: the frame, header, page switching and tab bar.
- `src/screens/`: Welcome, sign-up, profile setup, Me, Help now, quick exit.
- `src/components/`: buttons, chips, toggles, fields, sheets and toasts in the prototype's style.
- `src/backend/`: `local.ts` (browser storage, for the demo and tests) and `supabase.ts` (the real server), behind one interface.
- `src/data/reference.ts`: the lists (interests, drug use, mental health, stages, looking for, privacy).
- `../supabase/migrations/`: the database tables and security rules.
- `e2e/`: Playwright tests. Each test name starts with its function ID from `../docs/User-function-list.csv`.

Pages change with app state rather than URLs, like the prototype, so nothing about a member shows in the address bar or browser history.
