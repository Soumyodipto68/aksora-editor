import {
  CONSONANT_KEYS,
  SPECIAL_CONSONANT_KEYS,
  VOWEL_KEYS,
} from "./rules";

export type Syllable = {
  consonant: string | null;
  vowel: string | null;
  finalConsonant: string | null;
  joined: boolean;
  needsVirama: boolean;
};

function matchLongest(
  input: string,
  index: number,
  keys: string[],
): string | null {
  for (const key of keys) {
    if (input.startsWith(key, index)) {
      return key;
    }
  }

  return null;
}

function matchConsonant(input: string, index: number): string | null {
  return (
    matchLongest(input, index, SPECIAL_CONSONANT_KEYS) ??
    matchLongest(input, index, CONSONANT_KEYS)
  );
}

export function parseSyllables(input: string): Syllable[] {
  const syllables: Syllable[] = [];

  let index = 0;

  while (index < input.length) {
    /*
     * ================================================
     * 1. Independent vowel
     * ================================================
     */

    const vowel = matchLongest(input, index, VOWEL_KEYS);

    if (vowel) {
      syllables.push({
        consonant: null,
        vowel,
        finalConsonant: null,
        joined: false,
        needsVirama: false,
      });

      index += vowel.length;

      continue;
    }

    /*
     * ================================================
     * 2. Consonant
     * ================================================
     */

    const consonant = matchConsonant(input, index);

    if (consonant) {
      const consonantEnd = index + consonant.length;

      /*
       * Look for a vowel immediately after
       * the consonant.
       */

      const nextVowel = matchLongest(input, consonantEnd, VOWEL_KEYS);

      if (nextVowel) {
        const afterVowel = consonantEnd + nextVowel.length;

        /*
         * Check whether another consonant
         * follows this syllable.
         */

        const nextConsonant = matchConsonant(input, afterVowel);

        if (nextConsonant) {
          const afterNextConsonant = afterVowel + nextConsonant.length;
          const consonantAfterNext = matchConsonant(
            input,
            afterNextConsonant,
          );

          /*
           * If another vowel follows the
           * next consonant, then that consonant
           * belongs to the next syllable.
           *
           * Example:
           *
           * tumi
           *
           * tu + mi
           */

          const vowelAfterNext = matchLongest(
            input,
            afterNextConsonant,
            VOWEL_KEYS,
          );

          if (
            !vowelAfterNext &&
            (!consonantAfterNext || nextConsonant === "ng")
          ) {
            /*
             * Final consonant.
             *
             * Example:
             *
             * kemon
             *
             * ke + mon
             */

            syllables.push({
              consonant,
              vowel: nextVowel,
              finalConsonant: nextConsonant,
              joined: false,
              needsVirama: false,
            });

            index = afterNextConsonant;

            continue;
          }
        }

        /*
         * Normal consonant + vowel.
         */

        syllables.push({
          consonant,
          vowel: nextVowel,
          finalConsonant: null,
          joined: false,
          needsVirama: false,
        });

        index = consonantEnd + nextVowel.length;

        continue;
      }

      /*
       * ==============================================
       * 3. Consonant without explicit vowel
       * ==============================================
       */

      const nextConsonant = matchConsonant(input, consonantEnd);

      if (nextConsonant) {
        const afterNextConsonant = consonantEnd + nextConsonant.length;

        const vowelAfterNext = matchLongest(
          input,
          afterNextConsonant,
          VOWEL_KEYS,
        );

        if (vowelAfterNext) {
          /*
           * Structurally joined consonant.
           *
           * Example:
           *
           * apni
           *
           * a + p + ni
           *
           * This consonant ends in a virama before
           * the next consonant begins.
           */

          syllables.push({
            consonant,
            vowel: null,
            finalConsonant: null,
            joined: true,
            needsVirama: true,
          });

          index = consonantEnd;

          continue;
        }
      }

      /*
       * Standalone consonant.
       */

      syllables.push({
        consonant,
        vowel: null,
        finalConsonant: null,
        joined: false,
        needsVirama: Boolean(nextConsonant),
      });

      index = consonantEnd;

      continue;
    }

    /*
     * ================================================
     * 4. Unknown character
     * ================================================
     *
     * Punctuation is preserved by bengali.ts.
     */

    index += 1;
  }

  return syllables;
}
