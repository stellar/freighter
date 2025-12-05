/**
 * Utility functions for handling muxed addresses and memo logic
 */
import { NetworkDetails } from "@shared/constants/stellar";
import { getContractSpec } from "@shared/api/internal";
import { isContractId } from "popup/helpers/soroban";
import {
  isMuxedAccount,
  isValidStellarAddress,
  createMuxedAccount,
  getBaseAccount,
} from "helpers/stellar";

export interface CheckContractMuxedSupportParams {
  contractId: string;
  networkDetails: NetworkDetails;
}

/**
 * Checks if a contract's transfer function supports muxed addresses (CAP-0067)
 * by examining the contract specification.
 *
 * A contract supports muxed addresses if the transfer function has a `to_muxed` parameter.
 * This is the CAP-0067 pattern where the transfer signature is:
 * transfer(from: Address, to_muxed: MuxedAddress, amount: i128)
 *
 * @param contractId - The contract ID to check
 * @param networkDetails - Network details
 * @returns Promise resolving to true if contract supports muxed addresses. false otherwise
 */
export async function checkContractMuxedSupport(
  params: CheckContractMuxedSupportParams,
): Promise<boolean> {
  const { contractId, networkDetails } = params;
  try {
    const spec = await getContractSpec({ contractId, networkDetails });

    // Check if transfer function exists
    const definitions = spec.definitions as
      | {
          transfer?: {
            properties?: {
              args?: {
                properties?: Record<string, unknown>;
                required?: string[];
              };
            };
          };
        }
      | undefined;
    const transferDef = definitions?.transfer;
    if (!transferDef) {
      return false;
    }

    // Get args properties and required array
    const argsProperties = transferDef.properties?.args?.properties;
    const required = transferDef.properties?.args?.required;

    // Check if 'to_muxed' parameter exists in properties (CAP-0067 pattern)
    // Use 'in' operator to check if key exists, regardless of value
    if (argsProperties && "to_muxed" in argsProperties) {
      return true;
    }

    // Also check if to_muxed is in the required array (even if property doesn't exist)
    if (Array.isArray(required) && required.includes("to_muxed")) {
      return true;
    }

    return false;
  } catch (error) {
    // If we can't fetch the spec, assume no muxed support for safety
    return false;
  }
}

export interface MemoDisabledStateParams {
  targetAddress: string;
  contractId?: string;
  networkDetails?: NetworkDetails;
  t: (key: string) => string;
}

export interface MemoDisabledState {
  isMemoDisabled: boolean;
  memoDisabledMessage?: string;
}

/**
 * Determines if memo should be disabled for a transaction.
 * Disables memo for all M addresses (memo is encoded in the address).
 *
 * @param params Parameters for determining memo disabled state
 * @returns Object indicating if memo is disabled and optional message
 */
export function getMemoDisabledState(
  params: MemoDisabledStateParams,
): MemoDisabledState {
  const { targetAddress, contractId, networkDetails, t } = params;

  // Disable memo for all M addresses (memo is encoded in the address)
  if (isMuxedAccount(targetAddress)) {
    return {
      isMemoDisabled: true,
      memoDisabledMessage: t("Memo is disabled for this transaction"),
    };
  }

  if (!contractId || !networkDetails) {
    return { isMemoDisabled: false, memoDisabledMessage: undefined };
  }

  if (isContractId(targetAddress)) {
    return {
      isMemoDisabled: true,
      memoDisabledMessage: t("Memo is not supported for this operation"),
    };
  }

  if (!isValidStellarAddress(targetAddress) && !isMuxedAccount(targetAddress)) {
    return {
      isMemoDisabled: true,
      memoDisabledMessage: t("Memo is not supported for this operation"),
    };
  }

  // For Soroban transactions (custom tokens), memo is supported for G addresses
  return { isMemoDisabled: false, memoDisabledMessage: undefined };
}

export interface DetermineMuxedDestinationParams {
  recipientAddress: string;
  transactionMemo?: string;
  contractSupportsMuxed: boolean;
}

/**
 * Determines the final destination address for a transaction.
 * For contracts that support muxed addresses (CAP-0067), creates a muxed address
 * from a G address + memo if needed.
 *
 * @param params Parameters for determining muxed destination
 * @returns The final destination address (may be muxed if memo was provided and contract supports it)
 */
export function determineMuxedDestination(
  params: DetermineMuxedDestinationParams,
): string {
  const { recipientAddress, transactionMemo, contractSupportsMuxed } = params;

  const isRecipientGAddress =
    isValidStellarAddress(recipientAddress) && !isContractId(recipientAddress);
  const isRecipientAlreadyMuxed = isMuxedAccount(recipientAddress);
  const hasValidMemo =
    transactionMemo &&
    typeof transactionMemo === "string" &&
    transactionMemo.length > 0;

  if (contractSupportsMuxed) {
    if (isRecipientGAddress && hasValidMemo) {
      const muxedWithMemo = createMuxedAccount(
        recipientAddress,
        transactionMemo,
      );
      return muxedWithMemo || recipientAddress;
    }

    if (isRecipientGAddress && !hasValidMemo) {
      return recipientAddress;
    }

    if (isRecipientAlreadyMuxed && hasValidMemo) {
      const baseAccount = getBaseAccount(recipientAddress);
      if (
        baseAccount &&
        isValidStellarAddress(baseAccount) &&
        !isContractId(baseAccount)
      ) {
        const muxedWithNewMemo = createMuxedAccount(
          baseAccount,
          transactionMemo,
        );
        return muxedWithNewMemo || recipientAddress;
      }
    }

    if (isRecipientAlreadyMuxed && !hasValidMemo) {
      return recipientAddress;
    }
  } else if (isRecipientAlreadyMuxed) {
    const baseAccount = getBaseAccount(recipientAddress);
    if (
      baseAccount &&
      isValidStellarAddress(baseAccount) &&
      !isContractId(baseAccount)
    ) {
      return baseAccount;
    }
    throw new Error(
      "This contract does not support muxed addresses. Please use a regular address (G... or C...).",
    );
  }

  return recipientAddress;
}
