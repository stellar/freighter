import {
  createAsyncThunk,
  createSelector,
  createSlice,
  isFulfilled,
} from "@reduxjs/toolkit";
import { Networks } from "stellar-sdk";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  addAccount as addAccountService,
  addRecoveryPhraseSource as addRecoveryPhraseSourceService,
  importRecoveryPhrase as importRecoveryPhraseService,
  importAccount as importAccountService,
  importHardwareWallet as importHardwareWalletService,
  makeAccountActive as makeAccountActiveService,
  updateAccountName as updateAccountNameService,
  loadLastUsedAccount as loadLastUsedAccountService,
  confirmMnemonicPhrase as confirmMnemonicPhraseService,
  confirmMigratedMnemonicPhrase as confirmMigratedMnemonicPhraseService,
  createAccount as createAccountService,
  fundAccount as fundAccountService,
  recoverAccount as recoverAccountService,
  confirmPassword as confirmPasswordService,
  signOut as signOutService,
  resetWallet as resetWalletService,
  addTokenId as addTokenIdService,
  migrateAccounts as migrateAccountsService,
  getIsAccountMismatch as getIsAccountMismatchService,
} from "@shared/api/internal";
import {
  Account,
  SecretSource,
  AccountType,
  ActionStatus,
  BalanceToMigrate,
  ErrorMessage,
  MigratedAccount,
} from "@shared/api/types";
import { AccountRef } from "@shared/api/types/message-request";
import { WalletType } from "@shared/constants/hardwareWallet";

import { AppState } from "popup/App";
import { METRICS_DATA, METRICS_USER_ID } from "constants/localStorageTypes";
import { MetricsData } from "helpers/metrics";
import i18n from "popup/helpers/localizationConfig";

export const createAccount = createAsyncThunk<
  {
    allAccounts: Account[];
    publicKey: string;
    activeAccountId: string;
    hasPrivateKey: boolean;
  },
  { password: string; isOverwritingAccount?: boolean },
  { rejectValue: ErrorMessage }
>(
  "auth/createAccount",
  async ({ password, isOverwritingAccount = false }, thunkApi) => {
    let res = {
      allAccounts: [] as Account[],
      publicKey: "",
      activeAccountId: "",
      hasPrivateKey: false,
    };

    try {
      res = await createAccountService({ password, isOverwritingAccount });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when creating an account: ", message);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }
    return res;
  },
);

export const fundAccount = createAsyncThunk(
  "auth/fundAccount",
  async ({ publicKey }: { publicKey: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      await fundAccountService({ activePublicKey, publicKey });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when funding an account: ", message);
    }
  },
);

interface AddedAccountPayload {
  publicKey: string;
  activeAccountId: string;
  allAccounts: Account[];
  hasPrivateKey: boolean;
  secretSources: SecretSource[];
}

export const addAccount = createAsyncThunk<
  AddedAccountPayload,
  { password: string; sourceId?: string; accountName?: string },
  { rejectValue: ErrorMessage }
>(
  "auth/addAccount",
  async (
    { password, sourceId, accountName },
    { getState, rejectWithValue },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      return await addAccountService({
        activePublicKey,
        password,
        sourceId,
        accountName,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when creating an account: ", message);
      return rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

/**
 * Stores the phrase the background generated for a new source and derives
 * its first account. The phrase itself stays in the background.
 */
export const addRecoveryPhraseSource = createAsyncThunk<
  AddedAccountPayload,
  { password: string; accountName?: string; pendingPhraseId: string },
  { rejectValue: ErrorMessage }
>(
  "auth/addRecoveryPhraseSource",
  async (
    { password, accountName, pendingPhraseId },
    { getState, rejectWithValue },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      return await addRecoveryPhraseSourceService({
        activePublicKey,
        password,
        accountName,
        pendingPhraseId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when adding a recovery phrase: ", message);
      return rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

export const importRecoveryPhrase = createAsyncThunk<
  AddedAccountPayload,
  { password: string; mnemonicPhrase: string },
  { rejectValue: ErrorMessage }
>(
  "auth/importRecoveryPhrase",
  async ({ password, mnemonicPhrase }, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      return await importRecoveryPhraseService({
        activePublicKey,
        password,
        mnemonicPhrase,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when importing a recovery phrase: ", message);
      return rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

export const importAccount = createAsyncThunk<
  {
    publicKey: string;
    activeAccountId: string;
    allAccounts: Account[];
    hasPrivateKey: boolean;
  },
  { password: string; privateKey: string },
  { rejectValue: ErrorMessage }
>(
  "auth/importAccount",
  async ({ password, privateKey }, { getState, rejectWithValue }) => {
    let res = {
      publicKey: "",
      activeAccountId: "",
      allAccounts: [] as Account[],
      hasPrivateKey: false,
    };
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      res = await importAccountService({
        activePublicKey,
        password,
        privateKey,
      });
    } catch (e) {
      console.error("Failed when importing an account: ", e);
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return rejectWithValue({
        errorMessage: message,
      });
    }
    return res;
  },
);

export const importHardwareWallet = createAsyncThunk<
  {
    publicKey: string;
    activeAccountId: string;
    allAccounts: Account[];
    hasPrivateKey: boolean;
    bipPath: string;
  },
  { publicKey: string; hardwareWalletType: WalletType; bipPath: string },
  { rejectValue: ErrorMessage }
>(
  "auth/importHardwareWallet",
  async (
    { publicKey, hardwareWalletType, bipPath },
    { getState, rejectWithValue },
  ) => {
    let res = {
      publicKey: "",
      activeAccountId: "",
      allAccounts: [] as Account[],
      hasPrivateKey: false,
      bipPath: "",
    };
    const activePublicKey = publicKeySelector(getState() as AppState);

    try {
      res = await importHardwareWalletService({
        activePublicKey,
        publicKey,
        hardwareWalletType,
        bipPath,
      });
    } catch (e) {
      console.error("Failed when importing hardware wallet: ", e);
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return rejectWithValue({ errorMessage: message });
    }
    return res;
  },
);

/**
 * Switches the active account. UI actions pass `{ id }`, since two accounts
 * can share a public key. Flows that only know an address, such as a dApp's
 * `accountToSign`, pass `{ publicKey }` and get the first match.
 */
export const makeAccountActive = createAsyncThunk<
  {
    publicKey: string;
    activeAccountId: string;
    hasPrivateKey: boolean;
    bipPath: string;
  },
  AccountRef,
  { rejectValue: ErrorMessage; state: AppState }
>(
  "auth/makeAccountActive",
  async (account: AccountRef, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState());

    try {
      const res = await makeAccountActiveService({
        activePublicKey,
        account,
      });
      const { allAccounts } = authSelector(getState());
      storeAccountMetricsData(res.publicKey, allAccounts);
      return res;
    } catch (e) {
      return rejectWithValue({ errorMessage: e as string });
    }
  },
);

export const updateAccountName = createAsyncThunk<
  { allAccounts: Account[] },
  { accountName: string; id: string },
  { rejectValue: ErrorMessage; state: AppState }
>("auth/updateAccountName", ({ accountName, id }, { getState }) => {
  const activePublicKey = publicKeySelector(getState());

  return updateAccountNameService({ activePublicKey, accountName, id });
});

export const loadLastUsedAccount = createAsyncThunk<
  { lastUsedAccount: string },
  undefined,
  { rejectValue: ErrorMessage }
>("auth/loadLastUsedAccount", async (_: any, thunkApi) => {
  try {
    return await loadLastUsedAccountService();
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
  }
});

export const recoverAccount = createAsyncThunk<
  {
    allAccounts: Account[];
    hasPrivateKey: boolean;
    publicKey: string;
    activeAccountId: string;
    error: string;
    isOverwritingAccount?: boolean;
  },
  {
    password: string;
    mnemonicPhrase: string;
    isOverwritingAccount?: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "auth/recoverAccount",
  async (
    { password, mnemonicPhrase, isOverwritingAccount = false },
    thunkApi,
  ) => {
    let res = {
      allAccounts: [] as Account[],
      publicKey: "",
      activeAccountId: "",
      hasPrivateKey: false,
      error: "",
    };

    try {
      res = await recoverAccountService({
        password,
        recoverMnemonic: mnemonicPhrase,
        isOverwritingAccount,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when recovering an account: ", message);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }

    if (!res.publicKey || res.error) {
      return thunkApi.rejectWithValue({
        errorMessage: res.error || "The phrase you entered is incorrect",
      });
    }

    return res;
  },
);

export const confirmMnemonicPhrase = createAsyncThunk<
  { applicationState: APPLICATION_STATE; isCorrectPhrase: boolean },
  string,
  { rejectValue: ErrorMessage & { applicationState: APPLICATION_STATE } }
>(
  "auth/confirmMnemonicPhrase",

  async (phrase: string, thunkApi) => {
    let res = {
      isCorrectPhrase: false,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
    };
    try {
      res = await confirmMnemonicPhraseService(phrase);
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when confirming Mnemonic Phrase: ", message);
      return thunkApi.rejectWithValue({
        applicationState: res.applicationState,
        errorMessage: message,
      });
    }

    if (res.isCorrectPhrase) {
      res = {
        isCorrectPhrase: true,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
    } else {
      return thunkApi.rejectWithValue({
        applicationState: res.applicationState,
        errorMessage: i18n.t("The secret phrase you entered is incorrect."),
      });
    }

    return res;
  },
);

export const confirmMigratedMnemonicPhrase = createAsyncThunk<
  { isCorrectPhrase: boolean },
  string,
  { rejectValue: ErrorMessage }
>(
  "auth/confirmMigratedMnemonicPhrase",

  async (phrase: string, thunkApi) => {
    let res = {
      isCorrectPhrase: false,
    };
    try {
      res = await confirmMigratedMnemonicPhraseService(phrase);
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when confirming Mnemonic Phrase: ", message);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }

    if (res.isCorrectPhrase) {
      res = {
        isCorrectPhrase: true,
      };
    } else {
      return thunkApi.rejectWithValue({
        errorMessage: i18n.t("The secret phrase you entered is incorrect."),
      });
    }

    return res;
  },
);

export const confirmPassword = createAsyncThunk<
  {
    publicKey: string;
    activeAccountId: string;
    hasPrivateKey: boolean;
    applicationState: APPLICATION_STATE;
    allAccounts: Account[];
    bipPath: string;
    linkConflicts: string[];
    secretSources: SecretSource[];
  },
  string,
  { rejectValue: ErrorMessage }
>("auth/confirmPassword", async (phrase: string, thunkApi) => {
  let res = {
    publicKey: "",
    activeAccountId: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [] as Account[],
    bipPath: "",
    linkConflicts: [] as string[],
    secretSources: [] as SecretSource[],
  };
  try {
    res = await confirmPasswordService(phrase);
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed when confirming a password: ", message);
    return thunkApi.rejectWithValue({
      errorMessage: message,
    });
  }
  if (!res.publicKey) {
    return thunkApi.rejectWithValue({
      errorMessage: "Incorrect Password",
    });
  }

  return res;
});

const storeAccountMetricsData = (publicKey: string, allAccounts: Account[]) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );

  let accountType = AccountType.FREIGHTER;
  allAccounts.forEach((acc: Account) => {
    if (acc.hardwareWalletType) {
      metricsData.hwExists = true;
    } else if (acc.imported) {
      metricsData.importedExists = true;
    }

    if (acc.publicKey === publicKey) {
      if (acc.hardwareWalletType) {
        accountType = AccountType.HW;
      } else if (acc.imported) {
        accountType = AccountType.IMPORTED;
      } else {
        accountType = AccountType.FREIGHTER;
      }
    }
  });
  metricsData.accountType = accountType;
  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};

export const signOut = createAsyncThunk<
  APPLICATION_STATE,
  undefined,
  { rejectValue: ErrorMessage; state: AppState }
>("auth/signOut", async (_, { getState, rejectWithValue }) => {
  let res = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  const activePublicKey = publicKeySelector(getState());

  try {
    res = await signOutService({ activePublicKey });
  } catch (e) {
    console.error(e);
  }

  // A refusal carries `error` and no `publicKey`; treating it as success
  // would show the lock screen while the background stays unlocked.
  if (res?.publicKey || (res && "error" in res)) {
    return rejectWithValue({
      errorMessage: i18n.t("Unable to sign out"),
    });
  }

  return res?.applicationState;
});

export const resetWallet = createAsyncThunk<
  void,
  undefined,
  { rejectValue: ErrorMessage }
>("auth/resetWallet", async (_, thunkApi) => {
  const res = await resetWalletService();

  if (res.error) {
    return thunkApi.rejectWithValue({ errorMessage: res.error });
  }

  // The erased wallet's per-account analytics flags live in page storage,
  // which the background can't reach. Clear them so they don't carry over
  // to the next wallet. That includes the analytics user id: once the wallet
  // has been unlocked it is derived from the recovery phrase, so keeping it
  // would report the Welcome screen and the next wallet's onboarding under
  // the erased wallet's identity until the next wallet is first unlocked.
  // With no id stored, the Welcome tab's getUserId() creates a random one.
  localStorage.removeItem(METRICS_DATA);
  localStorage.removeItem(METRICS_USER_ID);
  return undefined;
});

export const addTokenId = createAsyncThunk<
  { tokenIdList: string[] },
  {
    publicKey: string;
    tokenId: string;
    network: Networks;
  },
  { rejectValue: ErrorMessage; state: AppState }
>(
  "auth/addToken",
  async ({ publicKey, tokenId, network }, { getState, rejectWithValue }) => {
    let res = {
      tokenIdList: [] as string[],
    };
    const activePublicKey = publicKeySelector(getState());

    try {
      res = await addTokenIdService({
        activePublicKey,
        publicKey,
        tokenId,
        network,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when adding a token: ", message);
      return rejectWithValue({
        errorMessage: message,
      });
    }
    return res;
  },
);

export const migrateAccounts = createAsyncThunk<
  {
    allAccounts: Account[];
    migratedAccounts: MigratedAccount[];
    hasPrivateKey: boolean;
    publicKey: string;
    activeAccountId: string;
    error: string;
  },
  {
    balancesToMigrate: BalanceToMigrate[];
    isMergeSelected: boolean;
    recommendedFee: string;
  },
  { rejectValue: ErrorMessage }
>(
  "auth/migrateAccounts",
  async ({ balancesToMigrate, isMergeSelected, recommendedFee }, thunkApi) => {
    let res = {
      migratedAccounts: [] as MigratedAccount[],
      allAccounts: [] as Account[],
      publicKey: "",
      activeAccountId: "",
      hasPrivateKey: false,
      error: "",
    };

    try {
      res = await migrateAccountsService({
        balancesToMigrate,
        isMergeSelected,
        recommendedFee,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed when migrating an account: ", message);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }

    return res;
  },
);

export const getIsAccountMismatch = createAsyncThunk<
  { isAccountMismatch: boolean },
  { activePublicKey: string },
  { rejectValue: ErrorMessage }
>("auth/getIsAccountMismatch", async ({ activePublicKey }, thunkApi) => {
  let res = {
    isAccountMismatch: false,
  };

  try {
    res = await getIsAccountMismatchService({ activePublicKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed when getting account mismatch: ", message);
    return thunkApi.rejectWithValue({
      errorMessage: message,
    });
  }
  return res;
});

interface InitialState {
  allAccounts: Account[];
  migratedAccounts: MigratedAccount[];
  applicationState: APPLICATION_STATE;
  hasPrivateKey: boolean;
  publicKey: string;
  /**
   * `Account.id` of the active account, as the background holds it in
   * `KEY_ID`. `publicKey` alone can't name it: a hot account and a Ledger
   * can share an address.
   */
  activeAccountId: string;
  connectingWalletType: WalletType;
  bipPath: string;
  tokenIdList: string[];
  /**
   * Source ids /user/link reported as belonging to another user. Not
   * shown yet: the conflict UI is waiting on design.
   */
  linkConflicts: string[];
  /** The wallet's phrases and imported keys, oldest first. */
  secretSources: SecretSource[];
  error: string;
  accountStatus: ActionStatus;
  isAccountMismatch: boolean;
}

const initialState: InitialState = {
  allAccounts: [],
  migratedAccounts: [],
  applicationState: APPLICATION_STATE.APPLICATION_LOADING,
  hasPrivateKey: false,
  publicKey: "",
  activeAccountId: "",
  connectingWalletType: WalletType.NONE,
  bipPath: "",
  tokenIdList: [],
  linkConflicts: [],
  secretSources: [],
  error: "",
  accountStatus: ActionStatus.IDLE,
  isAccountMismatch: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAccountStatus: (state) => {
      state.accountStatus = initialState.accountStatus;
    },
    clearApiError(state) {
      state.error = "";
    },
    setConnectingWalletType(state, action) {
      state.connectingWalletType = action.payload;
    },
    saveAccount(state, action) {
      const {
        hasPrivateKey,
        publicKey,
        activeAccountId,
        applicationState,
        allAccounts,
        bipPath,
        tokenIdList,
        linkConflicts,
        secretSources,
      } = action.payload;
      state.hasPrivateKey = hasPrivateKey;
      state.publicKey = publicKey;
      state.activeAccountId = activeAccountId || "";
      state.applicationState =
        applicationState || APPLICATION_STATE.APPLICATION_STARTED;
      state.allAccounts = allAccounts;
      state.bipPath = bipPath;
      state.tokenIdList = tokenIdList;
      state.linkConflicts = linkConflicts ?? [];
      state.secretSources = secretSources ?? [];
    },
    saveAccountError(state, action) {
      const {
        message = i18n.t("An unknown error occurred when loading your account"),
      } = action.payload;
      return {
        ...state,
        applicationState: APPLICATION_STATE.APPLICATION_ERROR,
        error: message,
      };
    },
    saveApplicationState(state, action) {
      state.applicationState = action.payload;
    },
    /**
     * Called when the background broadcasts that the wallet has been
     * locked (e.g., the idle auto-lock alarm fired). Mirrors the
     * background's `timeoutAccountAccess` reset on the popup side so
     * that route guards (`VerifiedAccountRoute`, `useGetAppData`) see
     * `hasPrivateKey: false` immediately instead of after the next
     * data refetch. Public/private-key-derived state is cleared;
     * `applicationState` is left untouched so `<UnlockAccountRoute>`
     * still renders `<UnlockAccount>` rather than `<Welcome>`.
     */
    lockAccount(state) {
      state.hasPrivateKey = false;
      state.publicKey = "";
      state.activeAccountId = "";
      state.allAccounts = [];
      state.bipPath = "";
      state.tokenIdList = [];
      state.linkConflicts = [];
      state.secretSources = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createAccount.fulfilled, (state, action) => {
      const { allAccounts, publicKey, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        allAccounts,
        applicationState: APPLICATION_STATE.PASSWORD_CREATED,
        hasPrivateKey,
        publicKey,
      };
    });
    builder.addCase(createAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    const onAccountAdded = (
      state: InitialState,
      action: { payload: AddedAccountPayload },
    ) => {
      const { publicKey, allAccounts, hasPrivateKey, secretSources } =
        action.payload;

      return {
        ...state,
        error: "",
        // to be safe lets clear bipPath here, which is only for hWs
        bipPath: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
        // An add can register a new source, so take the list it returns.
        secretSources: secretSources?.length
          ? secretSources
          : state.secretSources,
      };
    };
    const onAccountAddFailed = (
      state: InitialState,
      action: { payload?: ErrorMessage },
    ) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    };
    builder.addCase(addAccount.fulfilled, onAccountAdded);
    builder.addCase(addAccount.rejected, onAccountAddFailed);
    builder.addCase(addRecoveryPhraseSource.fulfilled, onAccountAdded);
    builder.addCase(addRecoveryPhraseSource.rejected, onAccountAddFailed);
    builder.addCase(importRecoveryPhrase.fulfilled, onAccountAdded);
    builder.addCase(importRecoveryPhrase.rejected, onAccountAddFailed);
    builder.addCase(importAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        error: "",
        // to be safe lets clear bipPath here, which is only for hWs
        bipPath: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
      };
    });
    builder.addCase(importAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(importHardwareWallet.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey, bipPath } = action.payload;
      return {
        ...state,
        error: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
        bipPath,
      };
    });
    builder.addCase(importHardwareWallet.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(makeAccountActive.pending, (state) => ({
      ...state,
      accountStatus: ActionStatus.PENDING,
    }));
    builder.addCase(makeAccountActive.fulfilled, (state, action) => {
      const { publicKey, hasPrivateKey, bipPath } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        bipPath: "",
      };

      return {
        ...state,
        publicKey,
        hasPrivateKey,
        bipPath,
        accountStatus: ActionStatus.SUCCESS,
      };
    });
    builder.addCase(makeAccountActive.rejected, (state, action) => {
      const {
        message = i18n.t("Varial was unable to switch to this account"),
      } = action.error;

      return {
        ...state,
        error: message,
        accountStatus: ActionStatus.ERROR,
      };
    });
    builder.addCase(updateAccountName.fulfilled, (state, action) => {
      const { allAccounts } = action.payload || {
        allAccounts: [],
      };

      return {
        ...state,
        allAccounts,
      };
    });
    builder.addCase(updateAccountName.rejected, (state, action) => {
      const {
        message = i18n.t("Varial was unable to update this account’s name"),
      } = action.error;

      return {
        ...state,
        error: message,
      };
    });
    builder.addCase(recoverAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        error: "",
        allAccounts,
        hasPrivateKey,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
      };
    });
    builder.addCase(recoverAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(confirmMnemonicPhrase.rejected, (state, action) => {
      const { applicationState, errorMessage } = action.payload || {
        errorMessage: "",
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
      };

      return {
        ...state,
        applicationState,
        error: errorMessage,
      };
    });
    builder.addCase(confirmMnemonicPhrase.fulfilled, (state, action) => ({
      ...state,
      applicationState: action.payload.applicationState,
    }));
    builder.addCase(confirmMigratedMnemonicPhrase.rejected, (state, action) => {
      const { errorMessage } = action.payload || {
        errorMessage: "",
      };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(confirmPassword.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(confirmPassword.fulfilled, (state, action) => {
      const {
        publicKey,
        applicationState,
        hasPrivateKey,
        allAccounts,
        bipPath,
        linkConflicts,
        secretSources,
      } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        allAccounts: [""],
        bipPath: "",
        linkConflicts: [],
        secretSources: [],
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
        allAccounts,
        bipPath,
        linkConflicts: linkConflicts ?? [],
        secretSources: secretSources ?? [],
        error: "",
      };
    });
    builder.addCase(signOut.fulfilled, (_state, action) => {
      const applicationState = action.payload || {
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
      return {
        ...initialState,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
    });
    builder.addCase(addTokenId.fulfilled, (state, action) => {
      const { tokenIdList } = action.payload || {
        tokenIdList: [],
      };

      return {
        ...state,
        error: "",
        tokenIdList,
      };
    });
    builder.addCase(addTokenId.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(migrateAccounts.fulfilled, (state, action) => {
      const { publicKey, allAccounts, migratedAccounts, hasPrivateKey } =
        action.payload || {
          publicKey: "",
          allAccounts: [],
          migratedAccounts: [],
          hasPrivateKey: false,
        };

      return {
        ...state,
        error: "",
        allAccounts,
        migratedAccounts,
        hasPrivateKey,
        publicKey,
      };
    });
    builder.addCase(migrateAccounts.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(getIsAccountMismatch.fulfilled, (state, action) => {
      const { isAccountMismatch } = action.payload || {
        isAccountMismatch: false,
      };

      return {
        ...state,
        error: "",
        isAccountMismatch,
      };
    });
    builder.addCase(getIsAccountMismatch.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    // Every response that changes the active account names it by id. Runs
    // after the case reducers above, on the state they returned.
    builder.addMatcher(
      isFulfilled(
        createAccount,
        addAccount,
        importAccount,
        importHardwareWallet,
        makeAccountActive,
        recoverAccount,
        confirmPassword,
        migrateAccounts,
      ),
      (state, action) => {
        state.activeAccountId = action.payload.activeAccountId || "";
      },
    );
  },
});

const { reducer } = authSlice;
const authSelector = (state: { auth: InitialState }) => state.auth;
export const hasPrivateKeySelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.hasPrivateKey,
);
export const allAccountsSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.allAccounts,
);
export const applicationStateSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.applicationState,
);
export const authErrorSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.error,
);
export const publicKeySelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.publicKey || "",
);
export const bipPathSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.bipPath,
);
export const linkConflictsSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.linkConflicts,
);
// One shared empty list, so a state without sources keeps a stable reference.
const NO_SECRET_SOURCES: SecretSource[] = [];
export const secretSourcesSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.secretSources ?? NO_SECRET_SOURCES,
);
export const migratedAccountsSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.migratedAccounts,
);

export const activeAccountIdSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.activeAccountId,
);

/**
 * The active account. Resolved by `activeAccountId`, since a hot account and
 * a Ledger can share an address. Falls back to the first account with the
 * active public key when the id is empty or stale, i.e. it names an account
 * with a different address.
 */
export const activeAccountSelector = createSelector(
  activeAccountIdSelector,
  publicKeySelector,
  allAccountsSelector,
  (activeAccountId, publicKey, allAccounts): Account | undefined => {
    const byId = allAccounts.find(({ id }) => id === activeAccountId);
    if (byId && byId.publicKey === publicKey) {
      return byId;
    }
    return allAccounts.find(
      ({ publicKey: accountPublicKey }) => accountPublicKey === publicKey,
    );
  },
);

export const accountNameSelector = createSelector(
  activeAccountSelector,
  (account) => account?.name ?? "",
);

export const hardwareWalletTypeSelector = createSelector(
  activeAccountSelector,
  (account) => account?.hardwareWalletType ?? WalletType.NONE,
);

export const accountStatusSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.accountStatus,
);

export const isAccountMismatchSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.isAccountMismatch,
);

export const accountSelector = createSelector(
  authSelector,
  (auth: InitialState) => ({
    hasPrivateKey: auth.hasPrivateKey,
    publicKey: auth.publicKey,
    activeAccountId: auth.activeAccountId,
    applicationState: auth.applicationState,
    allAccounts: auth.allAccounts,
    bipPath: auth.bipPath,
    tokenIdList: auth.tokenIdList,
  }),
);

export const {
  clearApiError,
  setConnectingWalletType,
  resetAccountStatus,
  saveAccount,
  saveAccountError,
  saveApplicationState,
  lockAccount,
} = authSlice.actions;

export { reducer };
