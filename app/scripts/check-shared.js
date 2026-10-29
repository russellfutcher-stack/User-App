// The Supabase functions keep a copy of the app's safety rules. This fails if the two differ.
//   node scripts/check-shared.js
const fs = require('fs'), path = require('path');
const app = fs.readFileSync(path.join(__dirname, '../src/lib/safety.ts'), 'utf8');
const fn = fs.readFileSync(path.join(__dirname, '../../supabase/functions/_shared/safety.ts'), 'utf8').split('\n').slice(1).join('\n');
if (app !== fn) { console.error('supabase/functions/_shared/safety.ts differs from app/src/lib/safety.ts'); process.exit(1); }
console.log('safety rules match');
