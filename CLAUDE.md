# User app: notes for Claude

- The owner is Rusty. He calls Claude "Max". He is not a developer: explain in plain words and keep replies short.
- `prototype/index.html` is the source of truth for screens, wording and behaviour. When the real app and the prototype differ, ask before changing either.
- The plan is in `docs/BUILD-PLAN.md`. Work one Phase 1 step at a time, and ask before starting the next.
- Every function has an ID in `docs/User-function-list.csv`. Tests name the ID first, for example `DS-05 ...`, and every function has at least two tests.
- App wording never mentions AI agents, staff, moderators or Night Owls. It says "every message is checked for safety".
- Privacy: drug use and mental health tags default to "People I chat with". Store members' data in Australia (Supabase, Sydney). No real names, emails or phone numbers are required.
- Never commit secrets or API keys.
