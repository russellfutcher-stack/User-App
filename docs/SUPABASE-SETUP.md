# Setting up Supabase (for Rusty)

Supabase is where members' accounts and profiles will be stored. Do these steps once. Menu names can shift slightly; if something isn't where it says, look for the nearest match.

1. **Sign up.** Go to supabase.com, click **Start your project**, and sign up (signing in with GitHub is easiest).
2. **Create the project.** Click **New project**.
   - Name: `User`
   - Database password: click **Generate**, then save it in your password manager. Don't send it to anyone, including Max.
   - Region: **Sydney** (Asia-Pacific). This keeps members' data in Australia.
   - Plan: **Free** is fine for now.
   Click **Create new project** and wait a minute or two.
3. **Turn off email confirmation.** Open **Authentication → Sign In / Providers → Email**, switch **Confirm email** off, and click **Save**. Members never give an email, so nothing should ever be sent.
4. **Add the tables.** Open **SQL Editor**, click **New query**, paste everything from `supabase/migrations/20261028000000_accounts.sql` (on GitHub: open the file, click **Raw**, select all, copy), then click **Run**. It should say "Success. No rows returned."
5. **Find the two values Max needs.** Click **Connect** at the top of the project (or **Project Settings → API Keys**). Note:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **Publishable key** (starts with `sb_publishable_`)
6. **Give them to Max safely, not in chat.** In this Claude session, open the environment menu in the title bar, then **Edit**, and add two environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL` = the Project URL
   - `EXPO_PUBLIC_SUPABASE_KEY` = the Publishable key
   Save, then start a new session and tell Max it's done.

## Turning on passkeys

7. **Switch passkeys on.** Open **Authentication → Passkeys** (or **Sign In / Providers → Passkeys**) and turn it on. Fill in:
   - Display name: `User`
   - Relying Party ID: `localhost`
   - Origins: `http://localhost:3000`
   Click **Save**, then tell Max it's done.

   These are test settings while the app isn't on the internet yet. At step 6, when the app gets its real web address, they change to that address. Passkeys are tied to the address, so any made before then (only test ones) stop working.

## Matching and the sample members (step 2)

8. **Add matching.** In **SQL Editor**, click **New query**, paste everything from `supabase/migrations/20261029000000_matching.sql`, and click **Run**.
9. **Add the 100 sample members.** New query again, paste everything from `supabase/seed/sample_members.sql`, and click **Run**. It should say `sample_members_added 100`. Running it again is harmless.

   The sample members are fictional and nobody can sign in as them. Before the app goes public (step 6), remove them with:
   `delete from auth.users where email like '%@samples.user-app.invalid';`

## Letting Max run Supabase for you (done 29 Oct 2026)

Once this is set up, Max can add tables and run checks on Supabase himself, so you don't need to paste SQL.

**Now done with the Supabase connector instead (29 Oct 2026).** On claude.ai, **Settings → Connectors → Supabase → Connect**, then sign in and authorize. Nothing needs pasting, and steps 10 and 11 below aren't needed. The Anthropic key is in Supabase under **Edge Functions → Secrets** as `ANTHROPIC_API_KEY`.

The nightly re-check (step 4) needs its address registered once, after `supabase/migrations/20261101000000_safety_followups.sql` has run (done 29 Oct 2026):
`insert into public.jobs (name, url) values ('nightly-recheck', 'https://prpbhfzsjxcburgzxzgl.supabase.co/functions/v1/nightly-recheck') on conflict (name) do nothing;`

Older way, with a token:

10. **Make an access token.** Open https://supabase.com/dashboard/account/tokens (or click your account picture → **Account preferences** → **Access Tokens**) and click **Generate new token**. Name it `Max`, choose an expiry date (for example 30 days), and copy the token. It starts with `sbp_`.
    This token can change anything in your Supabase account, so treat it like a password: never paste it into the chat. You can delete it on the same page at any time, and Max stops having access.
11. **Give it to Max safely.** In this Claude session, open the environment menu in the title bar, then **Edit**:
    - add an environment variable `SUPABASE_ACCESS_TOKEN` = the token
    - under **Network access**, add `api.supabase.com` to **Allowed domains** (leave the package managers box ticked)
    Save, then start a new session and tell Max it's done.

## The arbitrator (step 5)

The arbitrator signs in like a member, with a username and password, and sees the dashboard instead. Their account shouldn't be used as a member. Once they have made an account (after step 6, when the app has its web address), Max lists it as an arbitrator in **SQL Editor**:
`insert into public.arbitrators (member) select id from public.profiles where username = '<their username>';`
To remove them: `delete from public.arbitrators where member = (select id from public.profiles where username = '<their username>');`

To check the dashboard on the server: `ARB_USER=<username> ARB_PASS=<password> node scripts/live-arbitrator.js` from `app/`.

## Deleting a test account

If deleting a user under **Authentication → Users** fails, delete it in **SQL Editor** instead, using its exact email. For example:
`delete from auth.users where email = 'zzpk123456@members.user-app.invalid';`

Never share the **Secret key** (starts with `sb_secret_`), the legacy **service_role** key or the database password. The publishable key is safe in the app because the security rules from step 4 decide what each member can see.
