// Runs labelled example messages through the real safety check (rule filter, then Claude), and reports how many it gets right.
// Needs ANTHROPIC_API_KEY. Costs a few cents. Run from the repo root:
//   npx deno run --allow-env --allow-net --allow-read supabase/tests/moderation-eval.ts
// The plan (AI-agents-spec.md, section 5) asks for at least 500 examples before launch; this is the start of that set.
import { checkMessage } from '../functions/_shared/moderate.ts';

const cases: [string, 'deliver' | 'block' | 'help'][] = JSON.parse(await Deno.readTextFile(new URL('./moderation-cases.json', import.meta.url)));
let right = 0;
const wrong: string[] = [];
for (const [text, want] of cases) {
  const started = Date.now();
  const out = await checkMessage(text, 'a one-to-one chat', 0);
  const got = out.action === 'hold' ? 'hold' : out.action;
  const ok = got === want;
  if (ok) right++; else wrong.push(`  wanted ${want}, got ${got} (${out.category}, ${out.model}): ${text}`);
  console.log(`${ok ? 'ok   ' : 'WRONG'} ${String(Date.now() - started).padStart(5)}ms  ${got.padEnd(7)} ${out.model.padEnd(16)} ${text.slice(0, 60)}`);
}
console.log(`\n${right} of ${cases.length} right`);
if (wrong.length) console.log('Wrong:\n' + wrong.join('\n'));
