/**
 * Normalizes a vocabulary word for deduplication and consistent indexing.
 * - Applies Unicode Normalization (NFKC)
 * - Trims leading/trailing whitespace
 * - Converts to lowercase (en-US locale)
 * - Replaces multiple whitespace characters with a single space
 */
export function normalizeVocabularyWord(word: string): string {
  if (!word) return "";
  return word
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}
