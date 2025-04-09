import { SERVICE_TYPES } from "@shared/constants/services";

export interface BaseMessage {
  activePublicKey: string;
}

export interface FundAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.FUND_ACCOUNT;
  publicKey: string;
}

export interface CreateAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.CREATE_ACCOUNT;
  password: string;
  isOverwritingAccount: boolean;
}

export interface AddAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_ACCOUNT;
  password: string;
}

export interface ImportAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.IMPORT_ACCOUNT;
  password: string;
  privateKey: string;
}

export type ServiceMessageRequest =
  | FundAccountMessage
  | CreateAccountMessage
  | AddAccountMessage
  | ImportAccountMessage;
