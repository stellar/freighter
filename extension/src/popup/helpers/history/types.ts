import React from "react";
import { Horizon } from "@stellar/stellar-sdk";
// import { SorobanTokenInterface } from "helpers/soroban";

export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

export enum TransactionType {
  UNKNOWN = "unknown",
  CREATE_ACCOUNT = "createAccount",
  SWAP = "swap",
  PAYMENT = "payment",
  CHANGE_TRUST = "changeTrust",
  CONTRACT = "contract",
  CONTRACT_MINT = "contractMint",
  CONTRACT_TRANSFER = "contractTransfer",
}

export enum TransactionStatus {
  SUCCESS = "success",
  FAILED = "failed",
}

// Base interfaces for transaction details
export interface CreateAccountDetailsType {
  isCreatingExternalAccount: boolean;
  accountPublicKey: string;
  startingBalance: string;
}

export interface SwapDetailsType {
  sourceAssetCode: string;
  sourceAssetIssuer: string;
  destinationAssetCode: string;
  destinationAssetIssuer: string;
  sourceAssetType: string;
  destinationAssetType: string;
  sourceAmount: string;
  destinationAmount: string;
}

export interface PaymentDetailsType {
  assetCode: string;
  assetIssuer: string;
  assetType: string;
  amount: string;
  from: string;
  to: string;
}

export interface TokenTransferDetailsType {
  from: string;
  to: string;
  amount: string;
}

export interface TokenMintDetailsType {
  from: string;
  to: string;
  amount: string;
}

export interface ContractDetailsType {
  sorobanTokenInterface: SorobanTokenInterface;
  contractAddress: string;
  contractName?: string;
  contractSymbol?: string;
  contractDecimals?: number;
  transferDetails?: TokenTransferDetailsType;
  mintDetails?: TokenMintDetailsType;
}

export interface TransactionDetails {
  operation: Horizon.ServerApi.OperationRecord;
  transactionTitle: string;
  transactionType: TransactionType;
  externalUrl: string;
  fee: string;
  status: TransactionStatus;
  //   IconComponent: React.ReactNode;
  //   iconComponent: string | null;
  ActionIconComponent: React.ReactNode | string;
  createAccountDetails?: CreateAccountDetailsType;
  swapDetails?: SwapDetailsType;
  paymentDetails?: PaymentDetailsType;
  contractDetails?: ContractDetailsType;
}

// Additional types for HistoryItem component
export interface HistoryItemData {
  transactionDetails: TransactionDetails;
  rowText: string;
  actionText: string;
  ActionIconComponent: React.ReactElement | null | string;
  dateText: string | null;
  amountText: string | null;
  //   IconComponent: React.ReactElement | null;
  //   iconComponent: string | null;
  transactionStatus: TransactionStatus;
  isAddingFunds: boolean | null;
  operationString: string;
}

export interface HistoryItemProps {
  accountBalances: any; // Using any here to match existing code
  operation: any; // Using any here to match existing code
  publicKey: string;
  networkDetails: any; // Using any here to match existing code
  handleTransactionDetails: (transactionDetail: TransactionDetails) => void;
}
