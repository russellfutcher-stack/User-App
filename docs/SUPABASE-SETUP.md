# Setting up Supabase (for Rusty)

Supabase is where members' accounts and profiles will be stored. Do these steps once.

1. Go to supabase.com and sign up for a free account.
2. Click **New project**. Name it `User`. Choose a strong database password and keep it in your password manager. Set the **Region** to **Sydney**.
3. When the project is ready, open **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". Members never give an email, so nothing should ever be sent.
4. Open **SQL Editor**, click **New query**, paste everything from `supabase/migrations/20261028000000_accounts.sql`, and click **Run**.
5. Open **Project Settings → API** (or **Data API**). You'll see the **Project URL** and the **anon public** key.
6. Don't paste these into the chat. Add them in this cloud environment's settings (environment menu in the session title bar → Edit) as environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL` = the Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the anon public key
7. Start a new session so the settings are picked up, and tell Max it's done.

Never share the **service_role** key or the database password with anyone, including Max.
