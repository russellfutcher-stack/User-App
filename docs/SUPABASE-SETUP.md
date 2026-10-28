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

Never share the **Secret key** (starts with `sb_secret_`), the legacy **service_role** key or the database password. The publishable key is safe in the app because the security rules from step 4 decide what each member can see.
