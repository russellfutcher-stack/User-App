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

**Step 2 (done).** Built in `app/`: the 100 sample members (`app/src/data/people.ts`, copied from the prototype), the match score (`app/src/lib/match.ts`), the matches screen after profile setup, the Search page and Home. On the real server, `find_members()` in `supabase/migrations/20261029000000_matching.sql` works out the same score from all of a member's tags but only shows the tags they allow; the two versions give the same score for 6,000 test pairs, and `app/scripts/live-matching.js` passes on the real server. The sample members (`supabase/seed/sample_members.sql`) stay after launch, marked "Sample member" and with no peer supporter badges, until there are 500 real members (Rusty, 12 Nov 2026); the arbitrator is emailed then. Agreed: hidden drug use and mental health tags still count towards the match score but are never shown or searchable (Rusty, 28 Oct 2026).

**Step 3 (done).** Built in `app/`: the Chats list (newest first, New tags, swipe to delete with Undo, the Blocked section), one-to-one chats (starters, the dealing and contact filter, crisis help, typing and sample replies, Safety & options with Mute and Block), the unread dot, and Rooms (one type at a time, Your rooms with swipe to leave or delete, room requests, posting). Say hi on a profile opens the chat. The server side is `supabase/migrations/20261030000000_chats_rooms.sql` (chats, messages, rooms, posts and requests, all changed only through checked functions, with Realtime), plus `supabase/seed/sample_community.sql` (sample replies and room posts). "People I chat with" now means both people have sent a message. 247 tests pass against the in-browser version. Still to do in step 3:
- ~~Run the step 3 files on the real server.~~ Done 29 Oct 2026 by Max with `app/scripts/supabase-sql.js`; `app/scripts/live-chats.js` and `app/scripts/live-matching.js` pass, and a browser check on the real server (sign up, Say hi, reply, room post) works.
- ~~Disappearing messages.~~ `supabase/migrations/20261030000001_disappearing.sql`: an hourly pg_cron job deletes messages older than 7 days in any chat where either person has it on.
- Until step 4: the wording checks run in the app, not on the server; Report shows "Reporting opens here." and "Ask for a review" shows "Reviews open here."; room requests are approved straight away (at most 5 a day per member).

**Step 4 (done).** Every chat message and room post now goes through the safety check before anyone sees it: the rule filter, then Claude Haiku 5.5 at low effort, then Claude Opus 5.5 at medium effort for anything unclear (Rusty chose Haiku first, 29 Oct 2026). Blocked messages say why and offer a review; crisis messages are sent and open the Help sheet; the strike ladder warns, mutes, suspends or pauses for removal. Reports (7 reasons; danger and under-18 raise an urgent review automatically) and reviews (decided automatically at high effort; under 85% confidence the safest outcome is kept and the case is flagged) work in the demo and on the server. Room requests are checked by the room check, which can refuse near-duplicates and correct the type. Server side: `supabase/functions` (send, report, review, request-room, deployed with `app/scripts/supabase-deploy.js`) and `supabase/migrations/20261031000000_safety.sql` (applied; members can no longer send directly). Still to do in step 4:
- ~~Add the Anthropic API key to the functions' secrets, run `supabase/tests/moderation-eval.ts` and `app/scripts/live-safety.js`.~~ Done 29 Oct 2026 by Max: the key is in the functions' secrets, `moderation-eval.ts` gets 28 of 28 right (run inside Supabase, where the key is), and `live-safety.js` passes 17 of 17. Its room-request example now asks for a knitting room, because the allotment one was rightly refused as a near-duplicate of Green Fingers. The temporary `moderation-eval` function in Supabase is switched off and can be deleted.
- ~~The check-in for danger cases, the age check for under-18 cases, and the nightly re-check.~~ Done 29 Oct 2026 by Max, in `supabase/migrations/20261101000000_safety_followups.sql` (applied) and `supabase/functions/nightly-recheck` (deployed). Agreed with Rusty: after a danger report, the Help sheet opens once with "Someone here is thinking of you…" (HS-07); a sign of being under 18 pauses the account until the member ticks "I am 18 or older" (HS-08, HS-09), a second sign after that pauses it for review, a report after confirming doesn't pause them again (so members can't pause each other by reporting), and accounts not confirmed in 7 days are removed. Each night (2:23am Sydney) about 100 of the day's sent messages are checked again by Claude Opus 5.5 through the Batch API, roughly $0.30 a night (an estimate); misses are logged for the arbitrator, never punished automatically, and the text isn't kept from chats with disappearing messages on. 275 tests pass against the in-browser version; `app/scripts/live-age-checkin.js` (18 checks) and `app/scripts/live-safety.js` pass on the real server, and the first nightly batch was sent and collected (69 checked, none missed).
- Fixed on the way: a member paused "while it is reviewed" could still send messages, because the pause has no end date and the send check couldn't read it.
- Next, in step 5: the arbitrator's view of decisions, flagged cases and nightly misses.
- Not yet covered: paused or muted members can still request rooms and reviews, and make reports.

**Step 5 (done, 29 Oct 2026).** Built in `app/`: the Support page (`app/src/screens/Support.tsx`: peer supporters, a message for you, help services for 33 countries with the chosen country remembered, overdose information, and your reviews with their decisions) and the arbitrator dashboard (`app/src/screens/Dashboard.tsx`). In the demo the arbitrator signs in as Arbitrator / fair review and sees sample figures, as in the prototype. On the real server an arbitrator is an ordinary account listed in `public.arbitrators` (see `docs/SUPABASE-SETUP.md`); they see live figures and every review case, and can uphold, overturn or change a decision with a note the member sees as "Arbitrator: …". Server side: `supabase/migrations/20261102000000_support.sql` and `20261102000001_arbitrator.sql` (both applied). Also: paused, muted or age-check members can no longer ask for new rooms (reports and reviews stay open to them). 317 tests pass against the in-browser version; `app/scripts/live-arbitrator.js` (17 checks), `live-age-checkin.js` and `live-safety.js` pass on the real server.
- Differences from the prototype's dashboard, because the real server doesn't measure them yet: "average check time" is replaced by "messages held for a re-check", uptime isn't shown, and Peer support shows chats started with a peer supporter rather than matches made. To check with Rusty.
- Figures count real members only: the 100 sample members and arbitrators are left out. A deleted account takes its history with it, so figures only cover current members.
- ~~Choose the real arbitrator and give them an account.~~ Done 7 Nov 2026: Rusty's account `Arbitrator` is listed in `public.arbitrators`.

**Step 6 (in progress).** The app is online at https://userconnect-au.github.io/app/ (moved from the old address 14 Nov 2026 so nothing identifies anyone; GitHub Pages, chosen by Rusty 29 Oct 2026), published from the `main` branch with `bash app/scripts/deploy-web.sh`. It can be installed on a phone's home screen (`app/public/manifest.webmanifest`, a navy "U" icon) and opens offline with Help now working (`app/public/sw.js`, which never stores anything from the server). Members' data stays in Supabase in Sydney.
- ~~Passkey settings in Supabase for the new address.~~ Done by Rusty, 29 Oct 2026.
- ~~Checking every helpline number.~~ Done 29 Oct 2026: all 50 current (`docs/HELPLINE-CHECK.md`); lines that aren't open 24/7 now show their hours, and Poland and Kenya have a 24-hour line (agreed by Rusty). All phoned and passed (Rusty, 4 Nov 2026).
- ~~Security and privacy review (first pass, by Max).~~ Done 1 Nov 2026 (`docs/SECURITY-REVIEW.md`). Fixed: hidden tags were shown to everyone once any two members had chatted (a step 3 bug); use limits so nobody can run up the Anthropic bill; closed member functions to signed-out visitors; a browser security policy on the live site. The independent review is still needed, and three settings need Rusty.
- ~~Text retention.~~ Rusty, 4 Nov 2026: the text of blocked messages (and re-check misses and room requests) is deleted after 30 days, every night (`supabase/migrations/20261104000000_retention.sql`).
- ~~The public information website.~~ Done 4 Nov 2026 at https://userconnect-au.github.io/: about, how it works, safety and the community agreement, and help services for all 33 countries, built from the app's own wording by `app/scripts/make-site.js` on every publish. The privacy policy is written and appears once `app/site/settings.json` names who runs User and a contact email (Rusty chose a placeholder for now).
- ~~Notifications.~~ Done 4 Nov 2026 (Rusty: new messages and reviews). A neutral alert, never names or message text; members turn it on per device on the Me page (M-25); Mute in a chat silences it for 8 hours (C-11). Web Push from `supabase/functions/push` and `_shared/push.ts`; the signing key is made on the server and never leaves it. `app/scripts/live-notify.js` passes on the real server. On iPhone it only works once User is added to the home screen.
- ~~Phoning each helpline; who runs User.~~ Done (Rusty, 4 Nov 2026): every helpline passed; User is run by Logical Rules (no email address is published; questions go through Ask for a review), so the privacy policy is now on the website.
- Still to do before launch: the independent security review, and the three settings in `docs/SECURITY-REVIEW.md`.

- ~~Review email alerts.~~ Done 7 Nov 2026: a question through Ask for a review is answered and closed automatically (SP-13), and Rusty gets an email with the case number only (`supabase/functions/_shared/alert.ts`, via Resend; see `docs/SUPABASE-SETUP.md`). Checked: the test email arrived.
- ~~Terms of Service and Privacy Policy.~~ Written by Max, 14 Nov 2026 (Victoria law, chosen by Rusty): `app/site/legal/terms.html` and `privacy.html`, published at /about/terms/ and /about/privacy/ by `make-site.js`, and linked from sign-up step 1 (SN-16) and the Me page (M-28). A lawyer should read both before launch.
- Safety changes (Rusty, 14 Nov 2026): no message is held (an unsure first check goes to a careful second check, whose decision is final); one ordinary report a day, while danger and under-18 reports can always be made (HS-10); each decision can be reviewed once (SP-15, `supabase/migrations/20261114000000_reviews_once_reports.sql`); the arbitrator sees who made each report (AD-16); the review email now has the case number and topic in the subject, with the username and what the member wrote; and an automatic review decision can no longer overwrite one the arbitrator has already made, which had put finalised cases back in the queue (checked live).
- Changes (Rusty, 14 Nov 2026): Show password on sign-in (WS-10); a link to the website at the bottom of Home (H-11); sample members show a small "Sample" tag and no longer announce what they are in chats, though they answer honestly if sincerely asked (G-17); someone replies to every room post (R-14); and Mae, an automatic companion clearly marked as not a real person, offered on the Search page (DS-18, `supabase/migrations/20261115000000_mae.sql`). Rusty agreed Mae is the one place the app says something is automatic.

## Phase 2

iPhone and Android apps from the same Expo code, with a neutral icon option, Face ID app lock, push notifications and store listings rated 18+.

## Accounts needed

- GitHub (done)
- Supabase, project in the Sydney region (step 1)
- Anthropic API key (step 4)
- Hosting (step 6)

Secrets are never committed. They go in the environment's secret settings.
