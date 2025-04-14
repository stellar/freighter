import { MemoRequiredAccount } from "@shared/api/types";
import { STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL } from "background/constants/apiUrls";
import { cachedFetch } from "background/helpers/cachedFetch";
import { CACHED_MEMO_REQUIRED_ACCOUNTS_ID } from "constants/localStorageTypes";

export const getMemoRequiredAccounts = async () => {
  try {
    const resp = await cachedFetch(
      STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL,
      CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
    );
    const memoRequiredAccounts: MemoRequiredAccount[] =
      resp?._embedded?.records || [];
    return { memoRequiredAccounts };
  } catch (e) {
    console.error(e);
    return new Error("Error getting blocked accounts");
  }
};
