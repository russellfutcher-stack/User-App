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

**Step 1 (done).** Built in `app/`: Welcome and sign-in, the 3-step sign-up, profile setup, the Me page, the header with Exit and Help now, and the tab bar. The database tables and security rules are in `supabase/migrations/`. 139 tests (at least 2 for each of the 69 functions in this step) pass against the in-browser version. Still to do in step 1:
- ~~Connect the real Supabase project and run the tests against it.~~ Done 28 Oct 2026: the Sydney project is connected, and sign-up, sign-in, saving the profile, changing the password and deleting the account all work on the real server.
- ~~Real passkeys (WebAuthn).~~ Done 28 Oct 2026, using Supabase's passkeys: create one at sign-up or on the Me page, sign in with it, remove it. Checked on the real server with `app/scripts/live-passkey.js`. The passkey settings in Supabase are for `localhost` until the app has its web address (step 6).

Agreed changes from the prototype: the sign-in error now says "Check for typos, or sign in with a passkey." (also fixed in the prototype), and Change password on the Me page really changes the password. On sign-up step 3, tapping Create a passkey now creates the account first (a passkey needs an account to belong to), so Back is hidden after that.

**Step 2 (done).** Built in `app/`: the 100 sample members (`app/src/data/people.ts`, copied from the prototype), the match score (`app/src/lib/match.ts`), the matches screen after profile setup, the Search page and Home. On the real server, `find_members()` in `supabase/migrations/20261029000000_matching.sql` works out the same score from all of a member's tags but only shows the tags they allow; the two versions give the same score for 6,000 test pairs, and `app/scripts/live-matching.js` passes on the real server. The sample members (`supabase/seed/sample_members.sql`) must be removed before launch. Agreed: hidden drug use and mental health tags still count towards the match score but are never shown or searchable (Rusty, 28 Oct 2026).

**Step 3 (in progress).** Built in `app/`: the Chats list (newest first, New tags, swipe to delete with Undo, the Blocked section), one-to-one chats (starters, the dealing and contact filter, crisis help, typing and sample replies, Safety & options with Mute and Block), the unread dot, and Rooms (one type at a time, Your rooms with swipe to leave or delete, room requests, posting). Say hi on a profile opens the chat. The server side is `supabase/migrations/20261030000000_chats_rooms.sql` (chats, messages, rooms, posts and requests, all changed only through checked functions, with Realtime), plus `supabase/seed/sample_community.sql` (sample replies and room posts). "People I chat with" now means both people have sent a message. 247 tests pass against the in-browser version. Still to do in step 3:
- Run the step 3 files on the real server, then check them with `app/scripts/live-chats.js`. Max can do this himself once Supabase access is set up (see "Letting Max run Supabase" in `SUPABASE-SETUP.md`).
- Disappearing messages: the app hides messages older than 7 days when it's on, but the server doesn't delete them yet. That needs a scheduled job (pg_cron) on Supabase.
- Until step 4: the wording checks run in the app, not on the server; Report shows "Reporting opens here." and "Ask for a review" shows "Reviews open here."; room requests are approved straight away (at most 5 a day per member).

## Phase 2

iPhone and Android apps from the same Expo code, with a neutral icon option, Face ID app lock, push notifications and store listings rated 18+.

## Accounts needed

- GitHub (done)
- Supabase, project in the Sydney region (step 1)
- Anthropic API key (step 4)
- Hosting (step 6)

Secrets are never committed. They go in the environment's secret settings.
