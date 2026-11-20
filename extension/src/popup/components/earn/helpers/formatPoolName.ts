import { TFunction } from "i18next";

// A whole word, so "YieldBlox Pool" counts but "Whirlpool" does not.
const ENDS_WITH_POOL = /\bpool$/i;

/**
 * The pool's name for display. Pools are named on chain without the word
 * ("Fixed v2.1"), so it reads "Fixed v2.1 Pool" here, unless the name already
 * ends with it. "Blend pool" when the pool has no name.
 */
export const formatPoolName = (
  name: string | null | undefined,
  t: TFunction,
): string => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return t("Blend pool");
  }

  if (ENDS_WITH_POOL.test(trimmedName)) {
    return trimmedName;
  }

  return t("{{name}} Pool", {
    name: trimmedName,
    // React escapes what it renders; escaping here too would show "A/B" as
    // "A&#x2F;B".
    interpolation: { escapeValue: false },
  });
};
