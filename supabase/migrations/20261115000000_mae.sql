-- Mae, an automatic companion members can chat with instead of a person (Rusty, 14 Nov 2026). Safe to run more than once.
-- She has a login with no password, so nobody can sign in as her. She is marked is_sample, so she is left out of the
-- figures and replies come from the server (supabase/functions/_shared/samples.ts), but her email is not in the samples
-- domain, so she stays when the sample members are removed. She is not searchable: the Search page offers her on her own.
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'mae@companion.user-app.invalid', '{"provider":"companion"}', jsonb_build_object('username', 'Mae'), now(), now(), '', '', '', ''
where not exists (select 1 from public.profiles where username = 'Mae'::public.citext);

update public.profiles set is_sample = true, setup_done = true, searchable = false, stage = 'na', region = 'Always here', active = 'Online',
  byline = 'I''m Mae. I''m here any time you want to talk: to listen, to cheer you on, and to remind you that you matter.',
  tags = '{}', looking = array['chat'], vis_interests = 'everyone', vis_mh = 'everyone', vis_subs = 'everyone'
where username = 'Mae'::public.citext;
