import { TFunction } from "i18next";

// A whole word, so "YieldBlox Pool" counts but "Whirlpool" does not.
const HAS_POOL_WORD = /\bpool\b/i;
// A trailing version, as Blend names its pools on chain: "Fixed v2.1".
const TRAILING_VERSION = /^(.*\S)\s+(v\d+(?:\.\d+)*)$/i;

/**
 * The pool's name for display. Pools are named on chain without the word
 * ("Fixed v2.1"), so the design adds it before the version: "Fixed Pool v2.1".
 * A name with no version reads "<name> Pool", and one that already has the word
 * is shown as it is. "Blend pool" when the pool has no name.
 */
export const formatPoolName = (
  name: string | null | undefined,
  t: TFunction,
): string => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return t("Blend pool");
  }

  if (HAS_POOL_WORD.test(trimmedName)) {
    return trimmedName;
  }

  // React escapes what it renders; escaping here too would show "A/B" as
  // "A&#x2F;B".
  const interpolation = { escapeValue: false };
  const versioned = trimmedName.match(TRAILING_VERSION);

  if (versioned) {
    return t("{{name}} Pool {{version}}", {
      name: versioned[1],
      version: versioned[2],
      interpolation,
    });
  }

  return t("{{name}} Pool", { name: trimmedName, interpolation });
};
