// import {
//     formatTransactionDate,
//     isFailedTransaction,
//     isCreateAccountOperation,
//     isChangeTrustOperation,
//     isSorobanInvokeHostFunction,
//   } from "components/screens/HistoryScreen/helpers";
import {
  formatTransactionDate,
  isChangeTrustOperation,
  isCreateAccountOperation,
} from "../helpers";
//   import { mapChangeTrustHistoryItem } from "components/screens/HistoryScreen/mappers/changeTrust";
import { mapChangeTrustHistoryItem } from "./changeTrust";

// import { mapCreateAccountHistoryItem } from "components/screens/HistoryScreen/mappers/createAccount";
import { mapCreateAccountHistoryItem } from "./createAccount";
//   import { createDefaultHistoryItemData } from "components/screens/HistoryScreen/mappers/default";
import { createDefaultHistoryItemData } from "./default";
//   import { mapFailedTransactionHistoryItem } from "components/screens/HistoryScreen/mappers/failed";
import { mapPaymentHistoryItem } from "./payment";
//   import { mapSorobanHistoryItem } from "components/screens/HistoryScreen/mappers/soroban";
//   import { mapSwapHistoryItem } from "components/screens/HistoryScreen/mappers/swap";
//   import { HistoryItemData } from "components/screens/HistoryScreen/types";
import { HistoryItemData } from "../types";

//   import { NetworkDetails, NETWORKS } from "config/constants";
import { NetworkDetails } from "@shared/constants/stellar";
//   import { BalanceMap } from "config/types";
//   import { getAttrsFromSorobanHorizonOp } from "helpers/soroban";
//   import { getStellarExpertUrl } from "helpers/stellarExpert";
import { getStellarExpertUrl } from "popup/helpers/account";

/**
 * Main mapper function to convert operation data into history item data
 */
export const mapHistoryItemData = async ({
  operation,
  publicKey,
  networkDetails,
}: {
  operation: any;
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<HistoryItemData> => {
  const {
    created_at: createdAt,
    transaction_attr: { fee_charged: fee },
    //   transaction_successful: transactionSuccessful,
    type,
    //   type_i: typeI,
    isPayment = false,
    //   isSwap = false,
    isCreateExternalAccount = false,
  } = operation;

  // Format date for display
  const date = formatTransactionDate(createdAt);

  // Get URL for transaction viewing
  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  // Handle failed transaction
  // if (isFailedTransaction(transactionSuccessful)) {
  //   return mapFailedTransactionHistoryItem(
  //     operation,
  //     stellarExpertUrl,
  //     date,
  //     fee,
  //     themeColors,
  //   );
  // }

  // Handle create account
  if (isCreateAccountOperation(type)) {
    return mapCreateAccountHistoryItem({
      operation,
      stellarExpertUrl,
      date,
      fee,
      // themeColors,
      isCreateExternalAccount,
    });
  }

  // Handle change trust
  if (isChangeTrustOperation(type)) {
    return mapChangeTrustHistoryItem(
      operation,
      stellarExpertUrl,
      date,
      fee,
      // themeColors,
    );
  }

  // Handle swap
  // if (isSwap) {
  //   return mapSwapHistoryItem({
  //     operation,
  //     stellarExpertUrl,
  //     date,
  //     fee,
  //     networkUrl: networkDetails.networkUrl,
  //     themeColors,
  //   });
  // }

  // Handle payment
  if (isPayment) {
    return mapPaymentHistoryItem(
      operation,
      publicKey,
      stellarExpertUrl,
      date,
      fee,
    );
  }

  // Handle Soroban invoke host function
  // if (isSorobanInvokeHostFunction(typeI)) {
  //   // Get Soroban operation attributes if available
  //   const sorobanAttributes = getAttrsFromSorobanHorizonOp(
  //     operation,
  //     networkDetails,
  //   );

  //   return mapSorobanHistoryItem({
  //     operation,
  //     sorobanAttributes,
  //     accountBalances,
  //     publicKey,
  //     networkDetails,
  //     network,
  //     stellarExpertUrl,
  //     date,
  //     fee,
  //     themeColors,
  //   });
  // }

  // Default case for unrecognized transaction types
  return createDefaultHistoryItemData(
    operation,
    stellarExpertUrl,
    date,
    fee,
    // themeColors,
  );
};
