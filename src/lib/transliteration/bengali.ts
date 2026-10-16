import { normalizePhoneticWord } from "./phonetic";
import { parseSyllables } from "./syllable";
import { resolveConsonants } from "./consonant-context";
import { resolveVowels } from "./vowel-context";
import { renderSyllables } from "./render";

const WORD_OVERRIDES: Record<string, string> = {
  ekhane: "এখানে",
  eta: "এটা",
  hoy: "হয়",
  hobe: "হবে",
  hoye: "হয়ে",
  jodi: "যদি",
  okhane: "ওখানে",
  sekhane: "সেখানে",
  seta: "সেটা",
  shob: "সব",
  shobai: "সবাই",
  sob: "সব",
  sobai: "সবাই",
  kirokom: "কিরকম",
  kothao: "কোথাও",
  bharat: "ভারত",
  soumyodipto: "সৌম্যদীপ্ত",
};

function transliteratePart(
  part: string,
): string {
  /*
   * Preserve punctuation and symbols at
   * the end of a word.
   *
   * Examples:
   *
   * ami,   → আমি,
   * tumi?  → তুমি?
   * bhalo! → ভালো!
   */

  const match = part.match(
    /^([a-zA-Z]+)([^a-zA-Z]*)$/,
  );

  if (!match) {
    return part;
  }

  const [, word, suffix] = match;
  const override = WORD_OVERRIDES[word.toLowerCase()];

  if (override) {
    return override + suffix;
  }

  const normalized =
    normalizePhoneticWord(word);

  /*
   * 1. Parse phonetic structure.
   */

  const syllables =
    parseSyllables(normalized);

  /*
   * 2. Resolve consonant context.
   */

  const consonantResolved =
    resolveConsonants(syllables);

  /*
   * 3. Resolve vowel context.
   */

  const resolved =
    resolveVowels(
      consonantResolved,
    );

  /*
   * 4. Render Bengali.
   */

  return (
    renderSyllables(resolved) +
    suffix
  );
}

export function transliterateBengali(
  input: string,
): string {
  return input
    .split(/(\s+)/)
    .map((part) => {
      /*
       * Preserve whitespace exactly.
       */

      if (/^\s+$/.test(part)) {
        return part;
      }

      return transliteratePart(part);
    })
    .join("");
}

const SPELLING_VARIANTS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  { pattern: /sh/i, replacement: "s" },
  { pattern: /s/i, replacement: "sh" },
  { pattern: /chh/i, replacement: "ch" },
  { pattern: /ch/i, replacement: "chh" },
  { pattern: /aa/i, replacement: "a" },
  { pattern: /a/i, replacement: "aa" },
  { pattern: /ii/i, replacement: "i" },
  { pattern: /i/i, replacement: "ii" },
  { pattern: /uu/i, replacement: "u" },
  { pattern: /u/i, replacement: "uu" },
];

export function transliterateBengaliCandidates(input: string): string[] {
  const candidates = new Set<string>([transliterateBengali(input)]);

  for (const { pattern, replacement } of SPELLING_VARIANTS) {
    const variant = input.replace(pattern, replacement);

    if (variant !== input) {
      candidates.add(transliterateBengali(variant));
    }

    if (candidates.size >= 6) {
      break;
    }
  }

  return [...candidates];
}