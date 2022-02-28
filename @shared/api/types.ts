import { Horizon } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { SERVICE_TYPES, EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { NetworkDetails } from "../helpers/stellar";

export interface Response {
  error: string;
  messagedId: number;
  applicationState: APPLICATION_STATE;
  publicKey: string;
  privateKey: string;
  hasPrivateKey: boolean;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
  confirmedPassword: boolean;
  password: string;
  mnemonicPhraseToConfirm: string;
  recoverMnemonic: string;
  transaction: {
    sign: (sourceKeys: {}) => void;
  };
  transactionXDR: string;
  signedTransaction: string;
  source: string;
  type: SERVICE_TYPES;
  url: string;
  isDataSharingAllowed: boolean;
  isTestnet: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  networkDetails: NetworkDetails;
  allAccounts: Array<Account>;
  accountName: string;
  assetCode: string;
  iconUrl: string;
  network: string;
}

export interface ExternalRequest {
  transactionXdr: string;
  network: string;
  type: EXTERNAL_SERVICE_TYPES;
}

export interface Account {
  publicKey: string;
  name: string;
  imported: boolean;
}

export interface Settings {
  isDataSharingAllowed: boolean;
  networkDetails: NetworkDetails;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
}

export interface AssetIcons {
  [code: string]: string;
}

export type Balances = Types.BalanceMap | null;

/* eslint-disable camelcase */
export type HorizonOperation = Horizon.PaymentOperationResponse & {
  transaction_attr: Horizon.TransactionResponse;
};
/* eslint-enable camelcase */

export interface AccountBalancesInterface {
  balances: Balances;
  isFunded: boolean | null;
}

export interface AccountHistoryInterface {
  operations: Array<HorizonOperation> | [];
}

export interface ErrorMessage {
  errorMessage: string;
}

declare global {
  interface Window {
    freighter: boolean;
    freighterApi: { [key: string]: any };
  }
}
