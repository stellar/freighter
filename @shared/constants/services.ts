export enum SERVICE_TYPES {
  CREATE_ACCOUNT = "CREATE_ACCOUNT",
  FUND_ACCOUNT = "FUND_ACCOUNT",
  ADD_ACCOUNT = "ADD_ACCOUNT",
  IMPORT_ACCOUNT = "IMPORT_ACCOUNT",
  IMPORT_HARDWARE_WALLET = "IMPORT_HARDWARE_WALLET",
  LOAD_ACCOUNT = "LOAD_ACCOUNT",
  MAKE_ACCOUNT_ACTIVE = "MAKE_ACCOUNT_ACTIVE",
  UPDATE_ACCOUNT_NAME = "UPDATE_ACCOUNT_NAME",
  GET_MNEMONIC_PHRASE = "GET_MNEMONIC_PHRASE",
  CONFIRM_MNEMONIC_PHRASE = "CONFIRM_MNEMONIC_PHRASE",
  RECOVER_ACCOUNT = "RECOVER_ACCOUNT",
  CONFIRM_PASSWORD = "CONFIRM_PASSWORD",
  REJECT_ACCESS = "REJECT_ACCESS",
  GRANT_ACCESS = "GRANT_ACCESS",
  SIGN_TRANSACTION = "SIGN_TRANSACTION",
  HANDLE_SIGNED_HW_TRANSACTION = "HANDLE_SIGNED_HW_TRANSACTION",
  REJECT_TRANSACTION = "REJECT_TRANSACTION",
  SIGN_FREIGHTER_TRANSACTION = "SIGN_FREIGHTER_TRANSACTION",
  ADD_RECENT_ADDRESS = "ADD_RECENT_ADDRESS",
  LOAD_RECENT_ADDRESSES = "LOAD_RECENT_ADDRESSES",
  SIGN_OUT = "SIGN_OUT",
  SHOW_BACKUP_PHRASE = "SHOW_BACKUP_PHRASE",
  SAVE_SETTINGS = "SAVE_SETTINGS",
  LOAD_SETTINGS = "LOAD_SETTINGS",
  GET_CACHED_ASSET_ICON = "GET_CACHED_ASSET_ICON",
  CACHE_ASSET_ICON = "CACHE_ASSET_ICON",
  GET_CACHED_ASSET_DOMAIN = "GET_CACHED_ASSET_DOMAIN",
  CACHE_ASSET_DOMAIN = "CACHE_ASSET_DOMAIN",
  GET_BLOCKED_DOMAINS = "GET_BLOCKED_DOMAINS",
  ADD_CUSTOM_NETWORK = "ADD_CUSTOM_NETWORK",
  CHANGE_NETWORK = "CHANGE_NETWORK",
  REMOVE_CUSTOM_NETWORK = "REMOVE_CUSTOM_NETWORK",
  EDIT_CUSTOM_NETWORK = "EDIT_CUSTOM_NETWORK",
}

export enum EXTERNAL_SERVICE_TYPES {
  REQUEST_ACCESS = "REQUEST_ACCESS",
  SUBMIT_TRANSACTION = "SUBMIT_TRANSACTION",
  REQUEST_NETWORK = "REQUEST_NETWORK",
  REQUEST_NETWORK_DETAILS = "REQUEST_NETWORK_DETAILS",
}

export const EXTERNAL_MSG_REQUEST = "FREIGHTER_EXTERNAL_MSG_REQUEST";
export const EXTERNAL_MSG_RESPONSE = "FREIGHTER_EXTERNAL_MSG_RESPONSE";

declare const DEV_SERVER: string;
const _DEV_SERVER = DEV_SERVER;
export { _DEV_SERVER as DEV_SERVER };
