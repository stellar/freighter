import { TEST_ACCOUNT_WORDS } from "../helpers/credentials";

/**
 * The wallet stored in `pre-v2-storage.json`, captured from a pre-V2 (master)
 * build by `capturePreV2Storage.test.ts`. Its password is `PASSWORD` from
 * `helpers/credentials.ts`.
 */
export const PRE_V2_PHRASE = TEST_ACCOUNT_WORDS;

// Test-only key. Never fund it on mainnet.
export const PRE_V2_IMPORTED_SECRET =
  "SA5B4T73ETDG5LQSQC6H7UB7L7G5L2AT7HBX7Y6APN3Y7Y6NLPECC5T2";

export const PRE_V2_RENAMED_ACCOUNT = "Savings";

// Master's import finds six accounts on this phrase (the stubs report them
// funded); the capture then adds a seventh and renames it.
export const PRE_V2_PHRASE_ACCOUNT_NAMES = [
  "Account 1",
  "Account 2",
  "Account 3",
  "Account 4",
  "Account 5",
  "Account 6",
  PRE_V2_RENAMED_ACCOUNT,
];

// Master names an imported key after the next free index.
export const PRE_V2_IMPORTED_ACCOUNT_NAME = "Account 8";
