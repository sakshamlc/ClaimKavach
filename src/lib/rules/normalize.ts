import honorificsData from '../../data/honorifics.json';
import nameAliasesData from '../../data/name-aliases.json';

const honorificsSet = new Set(honorificsData.map((h: string) => h.toLowerCase()));

// Map alias variant -> canonical
const aliasMap = new Map<string, string>();
for (const entry of nameAliasesData) {
  aliasMap.set(entry.canonical.toLowerCase(), entry.canonical.toLowerCase());
  for (const variant of entry.variants) {
    aliasMap.set(variant.toLowerCase(), entry.canonical.toLowerCase());
  }
}

/**
 * Normalizes a name string:
 * - Unicode NFKC
 * - Lowercase
 * - Replace . - _ , ' / with space
 * - Strip ONLY allowed honorifics from honorifics.json (NEVER kumar, kumari, singh, etc.)
 * - Apply name aliases (e.g. mohd -> mohammad)
 * - Collapse whitespace
 */
export function normalizeName(s: string): string {
  if (!s) return '';

  const normalized = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.\-_,'/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ').filter(Boolean);

  const filtered = tokens
    .filter((token) => !honorificsSet.has(token))
    .map((token) => aliasMap.get(token) || token);

  return filtered.join(' ');
}

/**
 * Normalizes Indian English phonetic variations for transliteration comparison.
 * Applied ONLY during TRANSLITERATION_VARIANT checks.
 */
export function normalizeIndianPhonetics(token: string): string {
  if (!token) return '';
  let t = token.toLowerCase();

  // Transliteration collapsing
  t = t.replace(/ou/g, 'au');
  t = t.replace(/aa/g, 'a');
  t = t.replace(/ee/g, 'i');
  t = t.replace(/oo/g, 'u');
  t = t.replace(/chh/g, 'ch');
  t = t.replace(/sh/g, 's');
  t = t.replace(/ph/g, 'f');
  t = t.replace(/v/g, 'w');
  t = t.replace(/th/g, 't');
  t = t.replace(/dh/g, 'd');
  t = t.replace(/bh/g, 'b');
  t = t.replace(/gh/g, 'g');
  t = t.replace(/kh/g, 'k');

  // Trailing y -> i (e.g. choudhary -> choudhari)
  if (t.endsWith('y')) {
    t = t.slice(0, -1) + 'i';
  }

  return t;
}

/**
 * Standard Jaro-Winkler string similarity calculation.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix adjustment (max 4 characters)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  const p = 0.1; // standard scaling factor
  return jaro + prefix * p * (1 - jaro);
}
