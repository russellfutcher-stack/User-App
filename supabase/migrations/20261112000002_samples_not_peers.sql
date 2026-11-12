-- Rusty, 12 Nov 2026: sample members stay after launch, marked "Sample member", but none is a peer supporter,
-- so nobody looking for support relies on someone who isn't real. Safe to run more than once.
update public.profiles p set is_peer = false
  from auth.users u where u.id = p.id and u.email like '%@samples.user-app.invalid' and p.is_peer;
