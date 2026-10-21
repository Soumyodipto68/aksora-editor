import type { ResolvedConsonantSyllable } from "./consonant-context";

export type ResolvedSyllable = ResolvedConsonantSyllable & {
  resolvedVowel: string | null;
};

function resolveVowel(
  syllable: ResolvedConsonantSyllable,
  index: number,
  syllables: ResolvedConsonantSyllable[],
): string | null {
  const vowel = syllable.vowel;

  if (!vowel) {
    return null;
  }

  // Independent A
  if (syllable.consonant === null && vowel === "a") {
    if (index === 0 && syllables.length > 1) {
      return "aa";
    }

    return "a";
  }

  // Initial / independent O
  if (syllable.consonant === null && vowel === "o") {
    if (syllables.length > 1) {
      return "a";
    }

    return "o";
  }

  // Closed O
  if (
    syllable.consonant !== null &&
    vowel === "o" &&
    syllable.finalConsonant !== null
  ) {
    if (syllables.length === 1) {
      return "o";
    }

    return "a";
  }

  // Consonant + A
  if (syllable.consonant !== null && vowel === "a") {
    return "aa";
  }

  return vowel;
}

export function resolveVowels(
  syllables: ResolvedConsonantSyllable[],
): ResolvedSyllable[] {
  return syllables.map((syllable, index) => ({
    ...syllable,
    resolvedVowel: resolveVowel(syllable, index, syllables),
  }));
}
