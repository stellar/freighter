import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { TransactionBuilder } from "stellar-sdk";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getMemoRequiredAccounts as internalGetMemoRequiredAccounts } from "@shared/api/internal";
import { MemoRequiredAccount } from "@shared/api/types";

import { TRANSACTION_WARNING } from "constants/transaction";
import { isMainnet } from "helpers/stellar";
import {
  settingsNetworkDetailsSelector,
  settingsPreferencesSelector,
} from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

/**
 * Checks if a memo is required by querying cached memo-required accounts
 *
 * @param {ReturnType<typeof TransactionBuilder.fromXDR>} transaction - The transaction to check
 * @param {MemoRequiredAccount[]} memoRequiredAccounts - List of memo-required accounts
 * @returns {boolean} True if a memo is required, false otherwise
 */
const checkMemoRequiredFromCache = (
  transaction: ReturnType<typeof TransactionBuilder.fromXDR>,
  memoRequiredAccounts: MemoRequiredAccount[],
): boolean => {
  // Find destination from any operation that has a destination field
  const destination = transaction.operations.find(
    (operation) => "destination" in operation,
  )?.destination;

  if (!destination) {
    return false;
  }

  // Check if the destination address is in the memo-required accounts list
  const matchingAccount = memoRequiredAccounts.find(
    ({ address }) => address === destination,
  );

  if (!matchingAccount) {
    return false;
  }

  // Check if the account has the memo-required tag
  return matchingAccount.tags.some(
    (tag) => tag === (TRANSACTION_WARNING.memoRequired as string),
  );
};

/**
 * Checks if a memo is required using Stellar SDK's built-in validation
 * This is a fallback method when cache validation fails
 *
 * @param {ReturnType<typeof TransactionBuilder.fromXDR>} transaction - The transaction to check
 * @param {string} networkUrl - The network URL for the Stellar server
 * @param {string} networkPassphrase - The network passphrase
 * @returns {Promise<boolean>} True if a memo is required, false otherwise
 */
const checkMemoRequiredFromStellarSDK = async (
  transaction: ReturnType<typeof TransactionBuilder.fromXDR>,
  networkUrl: string,
  networkPassphrase: string,
): Promise<boolean> => {
  const server = stellarSdkServer(networkUrl, networkPassphrase);

  try {
    await server.checkMemoRequired(transaction as any);
    return false;
  } catch (e: any) {
    if ("accountId" in e) {
      return true;
    }
    return false;
  }
};

/**
 * Hook to validate transaction memos for addresses that require them
 *
 * This hook checks if a transaction destination address requires a memo by:
 * 1. Checking a cached list of memo-required addresses from StellarExpert API
 * 2. Falling back to Stellar SDK's checkMemoRequired method
 * 3. Only validating on mainnet when memo validation is enabled in preferences
 *
 * @param {string | null | undefined} incomingXdr - The transaction XDR string to validate
 * @returns {Object} Validation state and results
 * @returns {boolean} returns.isMemoMissing - Whether a required memo is missing
 * @returns {boolean} returns.isValidatingMemo - Whether validation is currently in progress
 *
 * @example
 * ```tsx
 * const { isMemoMissing, isValidatingMemo } = useValidateTransactionMemo(transactionXDR);
 *
 * if (isMemoMissing && !isValidatingMemo) {
 *   // Show warning that memo is required
 * }
 * ```
 */
export const useValidateTransactionMemo = (incomingXdr?: string | null) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { isMemoValidationEnabled } = useSelector(settingsPreferencesSelector);
  const activePublicKey = useSelector(publicKeySelector);
  const [isValidatingMemo, setIsValidatingMemo] = useState(false);
  const [localTransaction, setLocalTransaction] = useState<ReturnType<
    typeof TransactionBuilder.fromXDR
  > | null>(null);
  const [memoRequiredAccounts, setMemoRequiredAccounts] = useState<
    MemoRequiredAccount[]
  >([]);

  const xdr = useMemo(() => incomingXdr, [incomingXdr]);

  /**
   * Determines if memo validation should be performed
   * Only validates on mainnet when the feature is enabled in preferences
   */
  const shouldValidateMemo = useMemo(
    () => !!(isMemoValidationEnabled && isMainnet(networkDetails)),
    [isMemoValidationEnabled, networkDetails],
  );

  // Start with true to prevent button from being enabled before validation completes
  const [isMemoMissing, setIsMemoMissing] = useState(true);

  /**
   * Effect to fetch memo-required accounts from cache
   */
  useEffect(() => {
    if (!shouldValidateMemo) {
      return;
    }

    const fetchMemoRequiredAccounts = async () => {
      if (!activePublicKey) {
        return;
      }
      try {
        const response = await internalGetMemoRequiredAccounts({
          activePublicKey,
        });
        if (response && !(response instanceof Error)) {
          setMemoRequiredAccounts(response.memoRequiredAccounts || []);
        }
      } catch (error) {
        console.error("Error fetching memo-required accounts:", error);
      }
    };

    fetchMemoRequiredAccounts();
  }, [shouldValidateMemo, activePublicKey]);

  /**
   * Effect to parse XDR and set initial memo validation state
   * Runs when XDR, network, or validation settings change
   */
  useEffect(() => {
    if (!shouldValidateMemo) {
      setIsMemoMissing(false);
      setLocalTransaction(null);
      return;
    }

    if (!xdr || !networkDetails) {
      setLocalTransaction(null);
      return;
    }

    try {
      const transaction = TransactionBuilder.fromXDR(
        xdr,
        networkDetails.networkPassphrase,
      );
      setLocalTransaction(transaction);

      // Check if memo exists in transaction
      const memo =
        "memo" in transaction && transaction.memo.value
          ? String(transaction.memo.value)
          : "";

      // If memo exists, it's not missing
      if (memo) {
        setIsMemoMissing(false);
      }
    } catch (error) {
      console.error("Error parsing transaction XDR:", error);
      setLocalTransaction(null);
    }
  }, [xdr, shouldValidateMemo, networkDetails]);

  /**
   * Effect to perform memo requirement validation
   * Checks both cache and SDK methods to determine if memo is required
   */
  useEffect(() => {
    if (!shouldValidateMemo) {
      setIsMemoMissing(false);
      return;
    }

    if (!localTransaction) {
      return;
    }

    // Check if memo exists in transaction
    const memo =
      "memo" in localTransaction && localTransaction.memo.value
        ? String(localTransaction.memo.value)
        : "";

    // If memo exists, it's not missing
    if (memo) {
      setIsMemoMissing(false);
      return;
    }

    const checkIsMemoRequired = async () => {
      setIsValidatingMemo(true);

      try {
        // Check cache first (memo-required accounts from API)
        const isMemoRequiredFromCache = checkMemoRequiredFromCache(
          localTransaction,
          memoRequiredAccounts,
        );

        // Also check SDK as fallback
        const isMemoRequiredFromSDK = await checkMemoRequiredFromStellarSDK(
          localTransaction,
          networkDetails.networkUrl,
          networkDetails.networkPassphrase,
        );

        // If either method indicates memo is required, set it as missing
        setIsMemoMissing(isMemoRequiredFromSDK || isMemoRequiredFromCache);
      } catch (error) {
        console.error("Error validating memo:", error);

        // If there's any error, we assume the memo is missing to be safe
        // so we prevent loss of funds due to a missing memo.
        setIsMemoMissing(true);
      } finally {
        setIsValidatingMemo(false);
      }
    };

    // Only run validation if we have memo-required accounts loaded or if we're checking via SDK
    // This ensures we check against the API data when available
    checkIsMemoRequired();
  }, [
    localTransaction,
    memoRequiredAccounts,
    shouldValidateMemo,
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  ]);

  return { isMemoMissing, isValidatingMemo };
};
