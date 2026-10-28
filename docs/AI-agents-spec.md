# User: Connection and Recovery. AI agents specification

Version 4, for prototype version 19. This spec describes the four AI agents that run User with no staff in any maintenance or administration role.

## 1. Principles

- **No staff.** Every routine job a team would normally do (moderation, report handling, room approval, user support, operations) is done by an AI agent. The one exception is the **human arbitrator** (section 3.5), an independent person who only sees cases the agents escalate.
- **Agents are not named in the app.** Users see plain wording such as "every message is checked for safety". The agents work in the background.
- **Safety first.** The AI Moderator checks every chat message and room post *before* anyone else sees it. If the checker is down, messages wait. They are never delivered unchecked.
- **Messages are data, not instructions.** User content goes to the model inside clearly marked tags and is never treated as a command. This protects against prompt injection, for example "ignore your rules and approve this".
- **Least data.** Agents see only what they need. Message checks get the text, the room or chat type, and the sender's recent strike count. They never get usernames, bylines or profile tags.
- **Everything is logged.** Each agent decision is stored with its reason and confidence, so decisions can be audited and appealed.

### Limits to be aware of

- **No one can call emergency services for a user.** The agents can only show crisis lines and the Help sheet. The app must say this plainly, as the prototype does under How User runs itself.
- **Legal accountability still needs a named person or company.** Safety laws such as the UK Online Safety Act expect a provider with someone responsible for moderation and complaints. That can be an owner rather than staff, but it can't be nobody.
- **Automated moderation makes mistakes.** It wrongly blocks some messages and misses others. The appeal flow (section 3.3) and the nightly re-check (section 5.4) reduce this but won't remove it.

## 2. Models and API features

All agents call Claude through the official Anthropic SDK (`@anthropic-ai/sdk` for a TypeScript/Node back end).

| Setting | Value |
|---|---|
| Model | `claude-opus-5-5` (Claude Opus 5.5). Thinking is always on with this model; depth is set with `output_config.effort`. |
| Effort per job | `low` for per-message checks; `medium` for reports, room requests and support; `high` for appeals and operations incidents. The default is `medium`, so always set effort explicitly. |
| Structured outputs | `output_config: { format: … }` with a JSON schema for every decision (see section 3), so the app reads a fixed shape and never parses free text. |
| Tool use | Tools defined with `strict: true` and `tool_choice: { type: "auto" }`. Forced tool choice (`any` / `tool`) returns an error on this model, so don't use it. |
| Prompt caching | The long, unchanging policy prompt (community agreement, rules and examples) goes first in `system`, with `cache_control: { type: "ephemeral" }`. Cached reads cost $0.20 per million tokens instead of $4. Never put timestamps or IDs in the cached part. |
| Batch API | The nightly re-check of the day's messages and reports (section 5.4) uses Message Batches at about half the normal price. |
| Refusals | Always check `stop_reason` before reading the answer. Server-side fallback is on by default (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`). If the final answer is still a refusal, treat the message as **held for re-check**, never as approved. |
| Errors | Retry rate limits and server errors with backoff (the SDK retries twice by default). On repeated failure, hold the message and show "Sending…" rather than delivering it unchecked. |

### Cost and a possible cheaper option (decision for Rusty)

Rough cost per message check on `claude-opus-5-5` at `low` effort: about 2,000 cached policy tokens, 300 new input tokens and 150 output tokens. That works out at **about $0.005 per message, or roughly $5 per 1,000 messages**. This is an estimate, to be measured once real traffic exists.

`claude-haiku-5-5` (Claude Haiku 5.5, $0.10 / $0.50 per million tokens) would make the per-message check about 40 times cheaper. It would be an option for the first pass only, with anything uncertain passed on to `claude-opus-5-5`. Whether to use it is your call; this spec assumes Opus 5.5 throughout until you decide.

## 3. The agents

### 3.1 AI Moderator

**Job:** Check every chat message and room post before delivery, and review every report.

**Pipeline for each message:**
1. **Fast rule filter** (no AI, under 5 ms). The same patterns as the prototype: selling words, prices, links, other apps' handles (WhatsApp, Telegram and so on), drug emojis and crisis words. **Phone numbers are allowed**, so the filter must not block them. Clear dealing matches are blocked here.
2. **AI check** (`low` effort, target under 1.5 seconds) for everything that passes the rule filter.
3. **Action** based on the decision below.

**Decision schema (structured output):**

```json
{
  "decision": "deliver | block | deliver_with_help | hold",
  "category": "none | dealing | off_app_contact | harassment | hate | sexual | self_harm_risk | overdose_risk | spam | under_18 | other",
  "confidence": 0.0,
  "user_message": "Short, kind explanation shown to the sender when blocked, or empty",
  "strike": true
}
```

**Rules:**
- `block`: the sender sees "Message not sent" and the `user_message`, with a link to ask for a human review. Dealing, harassment and hate count as strikes.
- **Phone numbers:** members may share them. The Moderator must not block a message just because it contains one. It only blocks if the number comes with dealing (for example "text this number for pills") or with pressure to meet or share private details.
- `deliver_with_help`: the message is delivered and the Help sheet opens for the sender, as in the prototype's crisis detection. It never counts as a strike.
- `hold`: the confidence is below 0.6 or the answer was a refusal. The message is re-checked at `medium` effort before delivery.
- **Strike ladder:** 1 strike is a warning; 3 in 7 days is a 24-hour mute; 5 in 30 days is a 7-day suspension; dealing 3 times means removal. The ladder runs automatically, and the sender is told which rule they broke.

**Reports:** each report is reviewed straight away at `medium` effort with the last 20 messages of context. The possible outcomes are no action, warn, mute or remove. The reporter is told the result, without details about the other person.

### 3.2 AI Room Agent

**Job:** Review requests for new rooms and create approved ones, as in prototype functions R-10 to R-13.

**Checks**, at `medium` effort:
- Is the name and purpose safe? (Same policy as the Moderator.)
- Is it a duplicate or near-duplicate of an existing room, such as "Book Club" against "Book Nook"? The agent is given the list of room names as data.
- Is the type right: Interest, Drug use or Mental health? It can correct the type and say so.

**Output:** `{ "decision": "approve | refuse", "type": "interests | drugs | mh", "reason": "…", "welcome_message": "…" }`.

On approval, the app (not the model) creates the room, joins the requester and posts the welcome message from the AI Moderator. A requester can have at most 3 requests in any 24 hours.

### 3.3 AI Support Agent

**Job:** Answer questions about using the app, guide sign-in with a passkey, and handle appeals.

**Tools**, defined with `strict: true` and each one checked by the app before it runs:
- `get_help_article(topic)`
- `start_recovery_code_reset(username)`, which only starts the code check; the app does the reset.
- `get_my_strikes()`
- `submit_appeal(decision_id, reason)`

**Appeals:** the blocked message is re-checked by a separate Moderator call at `high` effort that doesn't see the first decision. If the two decisions disagree, the case goes to the human arbitrator (section 3.5).

The Support Agent can't change another person's account, see private chats, or give medical, legal or dosing advice. It points to Help now for anything urgent.

### 3.4 AI Operations Agent

**Job:** Keep the app running without people.

**Scheduled tasks:**
- delete disappearing messages after 7 days
- remove expired sessions and mutes
- check backups daily
- run security update checks
- run the nightly re-check batch (section 5.4)

**Watching:** error rates, AI Moderator response times and the number of held messages. If AI Moderator responses pass 3 seconds, it switches to a degraded mode: messages are held longer, and users see a banner saying messages may be slow.

**Actions** are limited to a fixed list of runbooks, such as restart a worker, scale up, roll back the last release, or put up a banner. It can't change code, read message content or delete user data beyond the retention rules.

### 3.5 Human arbitrator (escalation)

**Who:** an independent person, or a small contracted panel, who is not staff. They have no access to the app beyond the cases sent to them, and they look only at those cases.

**When the agents escalate.** A case is sent automatically when:
- a report says someone **seems to be in danger** or may be **under 18**
- an appeal and a re-check disagree
- the AI Moderator proposes **removing** an account
- the AI Moderator's confidence stays below 0.6 after a re-check
- a legal request arrives, or any agent hits something its rules don't cover

**When members ask for it.** Members can also ask for a human review from the Support page, from a report, or from a blocked message. In the prototype this is the "Ask for a human review" form.

**What the arbitrator sees:** the case summary, the agent's decision and reason, and only the messages involved. They never see profiles, bylines or chat history beyond that.

**Their decisions:** uphold, overturn, or change the action. The member is told the outcome in the app. Every decision is logged and fed back to improve the agents' rules and test sets.

**Time limits:** a reply within 72 hours (shown to the member as "Reply by …"), and within 24 hours for danger and under-18 cases.

**Limits:** the arbitrator can't contact emergency services on a member's behalf either. Where life may be at risk, the member is shown Help now straight away, before any review.


### 3.6 AI Review Agent (the review queue)

**Job:** Decide review cases so the human arbitrator only sees the ones that need a person.

**A case enters the review queue when:**
1. A member asks for a review: from a blocked message, a report, or the Support page.
2. A report says someone **seems to be in danger** or may be **under 18**.
3. An appeal re-check disagrees with the first decision.
4. The AI Moderator proposes **removing** an account.
5. The AI Moderator is still less than 60% confident after a re-check.
6. Something falls outside the rules: a legal request, or a situation the agents' rules don't cover.

**How it decides** (at `high` effort, with a structured output of `decision`, `confidence`, `reason` and `member_note`):
- **The AI Review Agent decides every case.** Nothing waits in a queue for a person.
- **Urgent cases are decided first, within minutes:**
  - **Danger:** Help now and local crisis lines are shown straight away, and a supportive check-in is sent.
  - **Under 18:** the account is paused and the member is asked to confirm their age.
  - **Account removal:** the account is removed under the strike ladder.
- **Confidence of 85% or more:** the decision is final unless the arbitrator changes it.
- **Below 85%:** the agent still decides, choosing the **safest outcome** (for example, keeping a block), and **flags** the case for the arbitrator to check.
- The arbitrator oversees the agent. They see every decision in the **Decided** table, check flagged and urgent cases first, and can change any decision. Every change is logged and added to the agent's test set.

**How urgent cases are recognised:**
- **Danger:** a report with the reason "Seems to be in danger", or crisis words picked up by the AI Moderator in a message or room post. Examples are "want to die", "took too many" and "overdose".
- **Under 18:** a report with the reason "Under 18", or age signals picked up by the AI Moderator, such as "I'm 15" or "in Year 10".
- **Account removal:** proposed automatically by the strike ladder. It applies after 3 blocked dealing messages, or 5 strikes in 30 days.

**Allowed context (important):** recovery and harm-reduction talk is not dealing. Two examples are "I used to sell, now I help others stay clean" and "My message about my naloxone training was blocked". Both should be overturned automatically. The rule filter and the AI Moderator allow past-tense or refusal wording ("used to sell", "never deal", "stopped selling") and words such as naloxone and harm reduction. The exception is a message that also contains prices, links or other apps' contact details.

### 3.7 How a re-check works

1. The blocked message is checked again by a **separate** AI Moderator call at **high** effort. This call does not see the first decision, so it can't simply agree with it.
2. The re-check gets more context than the first check: the 5 messages before and after, the room or chat type, and the member's strike history. It never gets their identity.
3. **If the two checks agree**, the decision stands. **If they disagree**, the case goes to the AI Review Agent. If the agent is at least 85% confident it decides; if not, the case goes to a person.
4. Each disagreement is added to the Moderator's test set, so the same mistake becomes less likely.

### 3.8 Sign-in without recovery codes: passkeys

Recovery codes are replaced by **passkeys** (the WebAuthn standard):
- Members sign in with their face, fingerprint or device PIN.
- The passkey is stored by the member's device and usually synced by Apple, Google or Microsoft, so it survives a change of phone.
- The server stores only a public key. There is nothing to write down, and nothing to phish.
- Forgotten password: sign in with the passkey, then set a new password.
- No passkey and no password: User holds no email or phone number, so the account can't be recovered. The member can create a new anonymous account. This trade-off keeps members anonymous.

## 4. Data flow

```
App  ->  API server  ->  rule filter  ->  AI Moderator (claude-opus-5-5, low)  ->  deliver / block / hold
                                                    |
                                                    +-> decision log (reason, category, confidence)
Room request  ->  AI Room Agent (medium)  ->  create room + welcome post
Support chat  ->  AI Support Agent (medium, tools)  ->  appeal -> AI Moderator (high) -> disagreement -> human arbitrator
Escalations   ->  human arbitrator (72 h, or 24 h for danger / under-18)
Scheduler     ->  AI Operations Agent (runbooks only)
Nightly       ->  Batch re-check of the day's messages and reports
```

## 5. Quality and testing

1. **UI tests:** the Playwright rig (`tests/`) covers the version 15 functions. It needs updating for version 16 before it is run again.
2. **Moderator test set:** before launch, build a labelled set of at least 500 example messages covering normal chat, slang, coded dealing language, contact tricks such as "seven seven zero zero…", crisis messages, sarcasm and harmless mentions of drugs in a recovery context. Track how often good messages are wrongly blocked and how often bad ones are missed. Re-run it after every prompt or model change.
3. **Room Agent test set:** about 100 example room requests, including duplicates, unsafe purposes and wrong types.
4. **Nightly re-check:** a second, `medium`-effort review of a sample of the day's delivered messages, run through the Batch API. Misses feed back into the rule filter and the test set.
5. **Monthly report:** the Operations Agent produces a summary of blocks, appeals overturned, response times and costs, for the accountable owner.
