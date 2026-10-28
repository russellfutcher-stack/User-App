// Username and password rules, copied from the prototype's sign-up.
export const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/;

const ADJ = ['Quiet', 'Steady', 'Gentle', 'Mossy', 'Amber', 'Little', 'Brave', 'Calm', 'Paper', 'Willow', 'Cedar', 'Misty', 'Bright', 'Soft', 'River'];
const ANI = ['Heron', 'Otter', 'Fox', 'Wren', 'Badger', 'Lark', 'Moth', 'Hare', 'Finch', 'Owl', 'Seal', 'Robin', 'Newt', 'Vole', 'Crane'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const genHandle = () => pick(ADJ) + pick(ANI) + (Math.random() < 0.5 ? '' : String(10 + Math.floor(Math.random() * 89)));

export const passStrength = (p: string) =>
  Math.min(100, p.length * 7 + (/[A-Z]/.test(p) ? 10 : 0) + (/[0-9]/.test(p) ? 10 : 0) + (/[^A-Za-z0-9]/.test(p) ? 10 : 0));

export const passHint = (p: string) =>
  !p ? 'At least 8 characters. Never reuse a password from another app.'
    : p.length < 8 ? `${8 - p.length} more characters needed.`
      : passStrength(p) < 80 ? 'OK. Longer is stronger, or add a number or symbol.'
        : 'Strong. Stored only as a salted hash.';
