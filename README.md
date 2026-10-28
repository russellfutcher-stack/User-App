# User: Connection and Recovery

An anonymous companion app that brings people together through three choices: **Interest**, **Drug use** and **Mental health**. It's for people who use drugs, are in recovery, or live with a mental health condition, and who feel alone.

User is peer support, not a medical or emergency service.

## What's here

| Folder | What it is |
|---|---|
| `prototype/` | The clickable design prototype (`index.html`): every screen and function, with 100 fictional sample members. Open it in any browser. |
| `docs/` | The function list (154 functions, including which need a backend to test fully) and the AI agents spec. |
| `tests/` | Playwright test rig for the prototype: 331 tests, at least two per function. See `tests/README.md`. |

## The plan

- **Phase 1: progressive web app.** Built with Expo (React Native for web), Supabase hosted in Sydney (database, accounts, live chat) and the Claude API (AI agents). See `docs/BUILD-PLAN.md`.
- **Phase 2: iPhone and Android apps** from the same code.
