# Security and privacy review

Done by Max on 29 Oct to 1 Nov 2026. **This is not the independent review the build plan asks for:** Max built the app, so it checks Max's own work. It is a first pass, so an independent reviewer starts from a cleaner app. Give them this file.

## What was checked

- Supabase's own security checks (its "advisors"), before and after the fixes.
- Every table's permissions and row rules, and what each member function can reach.
- The server functions (send, report, review, request-room, nightly-recheck): who can call them and what they trust.
- The whole git history, for passwords, keys and tokens. None found. Only the publishable key and project address appear, and both are meant to be public.
- The live web build: what it loads, what it stores on the device, and what it talks to.
- Live tests on the real server: `app/scripts/live-*.js` all pass after the fixes.

## Found and fixed

1. **Hidden tags were shown to everyone (serious, privacy).** Mental health and drug use tags set to "People I chat with" showed to every member once any two members anywhere had chatted. The function that checks "have these two chatted?" used argument names (a, b) that were the same as its table's columns, so it compared the table with itself. Fixed in `supabase/migrations/20261103000000_hardening.sql` and the original file. `live-matching.js` and `live-chats.js` now check both sides: hidden from strangers, shown once both have written. Introduced in step 3. Members' data before the fix should be treated as having been visible to other members.
2. **No limit on use (cost).** Each message is checked by Claude, so a script could run up the Anthropic bill. Now: 60 messages or posts an hour, 20 reports and 10 reviews a day per member, and 5 room requests a day (already there).
3. **Signed-out visitors could call member functions.** They did nothing without a sign-in, but are now closed. Only "is this username taken?" stays open, for sign-up. New functions are closed to signed-out visitors by default.
4. **Unneeded table permissions.** Signed-out visitors had read rights on tables (row rules stopped them reading anything), and members had rights such as emptying a table that the app's interface can't use. All removed.
5. **Paused members could still send** (found in step 4, fixed then): the "paused while reviewed" date couldn't be read by the send check.
6. **A browser security policy on the live site:** it only runs its own code and only talks to its own Supabase project. Added by `app/scripts/deploy-web.sh`. Sign-up, profile setup and a checked message work with it on.

## Already sound

- Row rules: members read only their own profile, chats, messages, blocks, room memberships and requests. Room posts are readable by all members, by design. Members change their profile only through a fixed list of fields; the safety fields (pauses, age check, check-in) can't be changed by them.
- Sending, posting, reports, reviews and room requests only go through the server functions, which check the sign-in, then use the service key that only they hold.
- The arbitrator's figures, cases and decisions check the caller is listed in `public.arbitrators`, which only the server can change.
- The nightly re-check can only be started with a random key that never leaves the database.
- No real names, emails or phone numbers are collected. Sign-in uses a made-up address built from the username.
- Members' data is in Supabase, Sydney. Deleting an account deletes everything linked to it.
- The offline file on the device (`app/public/sw.js`) keeps only the app's own files, never anything from the server.

## Added after the review (8 Nov 2026)

- **Optional email for password resets.** Kept in its own table that only its owner can read or change; signed-out visitors and other members can't see it. The `reset-password` function is the only one that signed-out visitors can call besides "is this username taken?". It always gives the same reply whether or not the username and email match (even when it sends nothing because a code was sent in the last 2 minutes or 5 were sent today), emails in the background so a match isn't slower, keeps only a hash of the 6-digit code, and allows 5 tries in 15 minutes. Checked with `app/scripts/live-reset-rooms.js`, and a full reset checked by hand.
- **Reset emails need a sending domain before launch.** They go through Resend from its test address, which only delivers to the Resend account's own email (Rusty's). To reach members, verify a domain in Resend and set the `RESET_FROM` secret (for example `User <reset@yourdomain>`).
- **Room activity** (people active in the last 5 minutes) is a count only; nobody can see who.
- **City** follows its own visibility setting in `find_members`; country is shown to all members.

- **Allowed words (Rusty, 12 Nov 2026).** Rusty chose to allow cost, price, sell, sold, buy, other apps' names and links in messages (the table `public.safety_allowed`, which only the server functions can read). Members can now share links and their usernames on other apps, so conversations, and any dealing, can move off User where nothing is checked. Dealing in the message itself is still blocked. The reviewer should look at this choice. The community agreement was changed to match (Rusty, 12 Nov 2026): "Stay anonymous. Don't share real names or home addresses, and think carefully before sharing a phone number or your username on another app."

- **Sample members after launch (Rusty, 12 Nov 2026).** The 100 sample members stay and reply with lines written in advance until there are 500 real members. Rusty first asked for them to appear as real people; he then chose to mark each one "Sample member" (card, profile and chat) and remove their peer supporter badges, so nobody is misled or relies on one for support. The `milestones` function emails the arbitrator once at 500 real members.

- **Sample members write their own replies (Rusty, 14 Nov 2026).** When a member messages a sample member, Claude Haiku writes the reply in character from the sample member's profile, with the last 16 messages of that chat (`supabase/functions/_shared/samples.ts`). It's told never to give dosing advice, arrange drugs or meetings, or share contacts; to point anyone at risk to Help; and to say honestly it's a sample member if asked. Replies that trip the word filter fall back to a line written in advance. The member's messages go to Anthropic for this, as they already do for the safety check.

## Needs Rusty (settings Max can't change)

1. **Turn on leaked-password protection** in Supabase: Authentication, then Sign In / Providers or Attack Protection, then "Prevent use of leaked passwords". It stops people using passwords already stolen in other breaches. (It may need a paid Supabase plan.)
2. ~~**Set a monthly spending limit in the Anthropic Console.**~~ Done by Rusty, 7 Nov 2026: $20 a month (platform.claude.com/settings/limits). If it's reached, safety checks stop and messages can't be sent until the next month or the limit is raised.
3. **Delete the old `moderation-eval` function** in Supabase (Edge Functions). It's switched off but can't be deleted from here.

## For the independent reviewer, and decisions for Rusty

- **Claude processes message text outside Australia.** Messages are stored in Sydney, but every message is sent to Anthropic's API to be checked, and Anthropic processes it in other countries. The privacy policy and information website must say so.
- **How long blocked messages are kept:** decided by Rusty, 4 Nov 2026. The text is deleted after 30 days; the record of the decision stays without it.
- **Account sign-up limits.** Anyone can make many accounts; Supabase limits sign-ups per address by default. A CAPTCHA could be added if abuse appears.
- **Two add-ons sit in the main database area** (citext and pg_net), which Supabase flags as a low risk. Moving them is possible but could break things, so it's left for the reviewer.
- Room posts show the poster's username to every member, including in rooms they haven't joined. That's by design (people can look at a room before joining), but worth confirming.
