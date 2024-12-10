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
  CONFIRM_MIGRATED_MNEMONIC_PHRASE = "CONFIRM_MIGRATED_MNEMONIC_PHRASE",
  RECOVER_ACCOUNT = "RECOVER_ACCOUNT",
  CONFIRM_PASSWORD = "CONFIRM_PASSWORD",
  REJECT_ACCESS = "REJECT_ACCESS",
  GRANT_ACCESS = "GRANT_ACCESS",
  SIGN_TRANSACTION = "SIGN_TRANSACTION",
  SIGN_BLOB = "SIGN_BLOB",
  SIGN_AUTH_ENTRY = "SIGN_AUTH_ENTRY",
  HANDLE_SIGNED_HW_PAYLOAD = "HANDLE_SIGNED_HW_PAYLOAD",
  REJECT_TRANSACTION = "REJECT_TRANSACTION",
  SIGN_FREIGHTER_TRANSACTION = "SIGN_FREIGHTER_TRANSACTION",
  SIGN_FREIGHTER_SOROBAN_TRANSACTION = "SIGN_FREIGHTER_SOROBAN_TRANSACTION",
  ADD_RECENT_ADDRESS = "ADD_RECENT_ADDRESS",
  LOAD_RECENT_ADDRESSES = "LOAD_RECENT_ADDRESSES",
  LOAD_LAST_USED_ACCOUNT = "LOAD_LAST_USED_ACCOUNT",
  SIGN_OUT = "SIGN_OUT",
  SHOW_BACKUP_PHRASE = "SHOW_BACKUP_PHRASE",
  SAVE_ALLOWLIST = "SAVE_ALLOWLIST",
  SAVE_SETTINGS = "SAVE_SETTINGS",
  SAVE_EXPERIMENTAL_FEATURES = "SAVE_EXPERIMENTAL_FEATURES",
  LOAD_SETTINGS = "LOAD_SETTINGS",
  GET_CACHED_ASSET_ICON = "GET_CACHED_ASSET_ICON",
  CACHE_ASSET_ICON = "CACHE_ASSET_ICON",
  GET_CACHED_ASSET_DOMAIN = "GET_CACHED_ASSET_DOMAIN",
  CACHE_ASSET_DOMAIN = "CACHE_ASSET_DOMAIN",
  GET_MEMO_REQUIRED_ACCOUNTS = "GET_MEMO_REQUIRED_ACCOUNTS",
  ADD_CUSTOM_NETWORK = "ADD_CUSTOM_NETWORK",
  CHANGE_NETWORK = "CHANGE_NETWORK",
  REMOVE_CUSTOM_NETWORK = "REMOVE_CUSTOM_NETWORK",
  EDIT_CUSTOM_NETWORK = "EDIT_CUSTOM_NETWORK",
  RESET_EXP_DATA = "RESET_EXP_DATA",
  ADD_TOKEN_ID = "ADD_TOKEN_ID",
  GET_TOKEN_IDS = "GET_TOKEN_IDS",
  REMOVE_TOKEN_ID = "REMOVE_TOKEN_ID",
  GET_MIGRATABLE_ACCOUNTS = "GET_MIGRATABLE_ACCOUNTS",
  GET_MIGRATED_MNEMONIC_PHRASE = "GET_MIGRATED_MNEMONIC_PHRASE",
  MIGRATE_ACCOUNTS = "MIGRATE_ACCOUNTS",
  ADD_ASSETS_LIST = "ADD_ASSETS_LIST",
  MODIFY_ASSETS_LIST = "MODIFY_ASSETS_LIST",
  SAVE_IS_BLOCKAID_ANNOUNCED = "SAVE_IS_BLOCKAID_ANNOUNCED",
}

export enum EXTERNAL_SERVICE_TYPES {
  REQUEST_ACCESS = "REQUEST_ACCESS",
  REQUEST_PUBLIC_KEY = "REQUEST_PUBLIC_KEY",
  SUBMIT_TRANSACTION = "SUBMIT_TRANSACTION",
  SUBMIT_BLOB = "SUBMIT_BLOB",
  SUBMIT_AUTH_ENTRY = "SUBMIT_AUTH_ENTRY",
  REQUEST_NETWORK = "REQUEST_NETWORK",
  REQUEST_NETWORK_DETAILS = "REQUEST_NETWORK_DETAILS",
  REQUEST_CONNECTION_STATUS = "REQUEST_CONNECTION_STATUS",
  REQUEST_ALLOWED_STATUS = "REQUEST_ALLOWED_STATUS",
  SET_ALLOWED_STATUS = "SET_ALLOWED_STATUS",
  REQUEST_USER_INFO = "REQUEST_USER_INFO",
}

export const EXTERNAL_MSG_REQUEST = "FREIGHTER_EXTERNAL_MSG_REQUEST";
export const EXTERNAL_MSG_RESPONSE = "FREIGHTER_EXTERNAL_MSG_RESPONSE";

declare const DEV_SERVER: string;
const _DEV_SERVER = DEV_SERVER;
export { _DEV_SERVER as DEV_SERVER };

declare const DEV_EXTENSION: string;
const _DEV_EXTENSION = DEV_EXTENSION;
export { _DEV_EXTENSION as DEV_EXTENSION };
