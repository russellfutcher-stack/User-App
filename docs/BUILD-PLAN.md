# Build plan

## Stack

| Part | Choice | Why |
|---|---|---|
| App | **Expo (React Native) with TypeScript** | One codebase for the web app now and iPhone and Android apps later |
| Database, accounts, live chat, file storage | **Supabase, Sydney region** | Postgres with row-level security; members' data stays in Australia |
| AI agents | **Claude API** (`claude-opus-5-5`) in Supabase Edge Functions | AI Moderator, AI Room Agent, AI Review Agent, AI Support Agent, AI Operations Agent (see `AI-agents-spec.md`) |
| Web hosting | Expo web build on a static host, chosen at step 6 | |
| Tests | Playwright for the web app, carried over from `tests/` | |

## Phase 1 steps

Each step ships with its own tests and is reviewed before the next one starts.

1. **Project setup and accounts:** anonymous sign-up (username and password, then passkeys), the community agreement, profile setup (byline, stage, looking for, peer support, the three choices, privacy), Me page.
2. **Matching and Search:** the 100 sample members as seed data, the matching score, Search with the three choices and Looking for, the matches screen, Home.
3. **Chats and rooms:** live one-to-one chat, rooms, room requests, swipe to delete or leave, blocking.
4. **Safety:** the AI Moderator on every message, crisis help, reports, the AI Review Agent and review requests.
5. **Support and arbitrator:** the Support page (help services by country, overdose information, peer supporters) and the arbitrator dashboard with live figures.
6. **Launch readiness:** installable web app (offline shell, home-screen icon, notifications), the public information website, an independent security and privacy review, and checking every helpline number.

## Progress

**Step 1 (in progress).** Built in `app/`: Welcome and sign-in, the 3-step sign-up, profile setup, the Me page, the header with Exit and Help now, and the tab bar. The database tables and security rules are in `supabase/migrations/`. 139 tests (at least 2 for each of the 69 functions in this step) pass against the in-browser version. Still to do in step 1:
- ~~Connect the real Supabase project and run the tests against it.~~ Done 28 Oct 2026: the Sydney project is connected, and sign-up, sign-in, saving the profile, changing the password and deleting the account all work on the real server.
- Real passkeys (WebAuthn): built, using Supabase's passkeys. Waiting for passkeys to be switched on in Supabase (step 7 of `SUPABASE-SETUP.md`), then checked on the real server with `app/scripts/live-passkey.js`.
- Until step 2 builds the matches screen, saving the profile opens Home.

Agreed changes from the prototype: the sign-in error now says "Check for typos, or sign in with a passkey." (also fixed in the prototype), and Change password on the Me page really changes the password. On sign-up step 3, tapping Create a passkey now creates the account first (a passkey needs an account to belong to), so Back is hidden after that.

## Phase 2

iPhone and Android apps from the same Expo code, with a neutral icon option, Face ID app lock, push notifications and store listings rated 18+.

## Accounts needed

- GitHub (done)
- Supabase, project in the Sydney region (step 1)
- Anthropic API key (step 4)
- Hosting (step 6)

Secrets are never committed. They go in the environment's secret settings.
