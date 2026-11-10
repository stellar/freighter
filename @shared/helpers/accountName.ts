/** The longest account name the rename and create sheets accept. */
export const MAX_ACCOUNT_NAME_LENGTH = 24;

/**
 * The default name for a new account: `Account N`, where N starts one past
 * the number of accounts and moves up past any name already in use. Counting
 * from the account total keeps names sequential across the wallet; skipping
 * taken names keeps a renamed or reordered wallet from getting a duplicate.
 */
export const getNextDefaultAccountName = (existingNames: string[]): string => {
  const taken = new Set(existingNames);
  let n = existingNames.length + 1;

  while (taken.has(`Account ${n}`)) {
    n += 1;
  }

  return `Account ${n}`;
};

/**
 * A caller-supplied name, trimmed and capped, or null when nothing usable is
 * left, so the caller falls back to the default.
 */
export const normalizeAccountName = (name?: string): string | null => {
  const trimmed = (name || "").trim().slice(0, MAX_ACCOUNT_NAME_LENGTH);
  return trimmed || null;
};
