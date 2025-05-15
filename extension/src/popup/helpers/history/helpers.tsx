import { Horizon } from "@stellar/stellar-sdk";
import { camelCase } from "lodash";

export enum OPERATION_TYPES {
  accountMerge = "Account Merge",
  allowTrust = "Allow Trust",
  beginSponsoringFutureReserves = "Begin Sponsoring Future Reserves",
  bumpSequence = "Bump Sequence",
  changeTrust = "Change Trust",
  claimClaimableBalance = "Claim Claimable Balance",
  clawback = "Clawback",
  clawbackClaimableBalance = "Clawback Claimable Balance",
  createAccount = "Create Account",
  createClaimableBalance = "Create Claimable Balance",
  createPassiveSellOffer = "Create Passive Sell Offer",
  endSponsoringFutureReserves = "End Sponsoring Future Reserves",
  extendFootprintTtl = "Extend Footprint TTL",
  inflation = "Inflation",
  invokeHostFunction = "Invoke Host Function",
  liquidityPoolDeposit = "Liquidity Pool Deposit",
  liquidityPoolWithdraw = "Liquidity Pool Withdraw",
  manageBuyOffer = "Manage Buy Offer",
  manageData = "Manage Data",
  manageSellOffer = "Manage Sell Offer",
  pathPaymentStrictReceive = "Path Payment Strict Receive",
  pathPaymentStrictSend = "Path Payment Strict Send",
  payment = "Payment",
  revokeAccountSponsorship = "Revoke Account Sponsorship",
  revokeClaimableBalanceSponsorship = "Revoke Claimable Balance Sponsorship",
  revokeDataSponsorship = "Revoke Data Sponsorship",
  revokeOfferSponsorship = "Revoke Offer Sponsorship",
  revokeSignerSponsorship = "Revoke Signer Sponsorship",
  revokeSponsorship = "Revoke Sponsorship",
  revokeTrustlineSponsorship = "Revoke Trustline Sponsorship",
  setOptions = "Set Options",
  setTrustLineFlags = "Set Trustline Flags",
  bumpFootprintExpiration = "Bump Footprint Expiration",
  restoreFootprint = "Restore Footprint",
}

/**
 * Formats date for transaction history
 */
export const formatTransactionDate = (createdAt: string): string =>
  new Date(Date.parse(createdAt))
    .toDateString()
    .split(" ")
    .slice(1, 3)
    .join(" ");

/**
 * Creates operation description string
 */
export const createOperationString = (
  type: string,
  operationCount: number,
): string => {
  const operationType = camelCase(type) as keyof typeof OPERATION_TYPES;
  const opTypeStr = OPERATION_TYPES[operationType] || "Transaction";

  return `${opTypeStr}${
    operationCount > 1 ? ` + ${operationCount - 1} ops` : ""
  }`;
};

/**
 * Determines if the operation is a failed transaction
 */
export const isFailedTransaction = (
  transactionSuccessful: boolean | undefined,
): boolean => transactionSuccessful === false;

/**
 * Determines if the operation is a create account operation
 */
export const isCreateAccountOperation = (type: string): boolean =>
  type === Horizon.HorizonApi.OperationResponseType.createAccount;

/**
 * Determines if the operation is a change trust operation
 */
export const isChangeTrustOperation = (type: string): boolean =>
  type === Horizon.HorizonApi.OperationResponseType.changeTrust;
