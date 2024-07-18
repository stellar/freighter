import {
  createSelector,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import {
  saveAllowList as saveAllowListService,
  saveSettings as saveSettingsService,
  saveExperimentalFeatures as saveExperimentalFeaturesService,
  loadSettings as loadSettingsService,
  changeNetwork as changeNetworkService,
  addCustomNetwork as addCustomNetworkService,
  removeCustomNetwork as removeCustomNetworkService,
  editCustomNetwork as editCustomNetworkService,
  addAssetsList as addAssetsListService,
  modifyAssetsList as modifyAssetsListService,
} from "@shared/api/internal";
import {
  NETWORKS,
  NetworkDetails,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  AssetsListItem,
  AssetsLists,
  DEFAULT_ASSETS_LISTS,
} from "@shared/constants/soroban/token";

import {
  Settings,
  IndexerSettings,
  SettingsState,
  ExperimentalFeatures,
} from "@shared/api/types";

import { isMainnet } from "helpers/stellar";

interface ErrorMessage {
  errorMessage: string;
}

const settingsInitialState: Settings = {
  allowList: [],
  isDataSharingAllowed: false,
  networkDetails: {
    network: "",
    networkName: "",
    networkUrl: "",
    networkPassphrase: "",
    sorobanRpcUrl: "",
  } as NetworkDetails,
  networksList: DEFAULT_NETWORKS,
  isMemoValidationEnabled: true,
  isSafetyValidationEnabled: true,
  isValidatingSafeAssetsEnabled: true,
  isNonSSLEnabled: false,
  error: "",
};

const experimentalFeaturesInitialState = {
  isExperimentalModeEnabled: false,
  isHashSigningEnabled: false,
  isNonSSLEnabled: false,
  experimentalFeaturesState: SettingsState.IDLE,
};

const indexerInitialState: IndexerSettings = {
  settingsState: SettingsState.IDLE,
  isSorobanPublicEnabled: false,
  isRpcHealthy: false,
  userNotification: { enabled: false, message: "" },
};

const initialState = {
  ...settingsInitialState,
  ...indexerInitialState,
  ...experimentalFeaturesInitialState,
  assetsLists: DEFAULT_ASSETS_LISTS,
};

export const loadSettings = createAsyncThunk("settings/loadSettings", () =>
  loadSettingsService(),
);

export const saveAllowList = createAsyncThunk<
  { allowList: string[] },
  {
    allowList: string[];
  },
  { rejectValue: ErrorMessage }
>("settings/saveAllowList", async ({ allowList }, thunkApi) => {
  let res = { allowList: settingsInitialState.allowList };

  try {
    res = await saveAllowListService({
      allowList,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({
      errorMessage: message,
    });
  }

  return res;
});

export const saveSettings = createAsyncThunk<
  Settings & IndexerSettings,
  {
    isDataSharingAllowed: boolean;
    isMemoValidationEnabled: boolean;
    isSafetyValidationEnabled: boolean;
    isValidatingSafeAssetsEnabled: boolean;
    isNonSSLEnabled: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "settings/saveSettings",
  async (
    {
      isDataSharingAllowed,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
      isValidatingSafeAssetsEnabled,
      isNonSSLEnabled,
    },
    thunkApi,
  ) => {
    let res = {
      ...settingsInitialState,
      isSorobanPublicEnabled: false,
      isRpcHealthy: false,
      userNotification: { enabled: false, message: "" },
      settingsState: SettingsState.IDLE,
      isNonSSLEnabled: false,
    };

    try {
      res = await saveSettingsService({
        isDataSharingAllowed,
        isMemoValidationEnabled,
        isSafetyValidationEnabled,
        isValidatingSafeAssetsEnabled,
        isNonSSLEnabled,
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }

    return res;
  },
);

export const saveExperimentalFeatures = createAsyncThunk<
  ExperimentalFeatures,
  {
    isExperimentalModeEnabled: boolean;
    isHashSigningEnabled: boolean;
    isNonSSLEnabled: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "settings/saveExperimentalFeaturss",
  async (
    { isExperimentalModeEnabled, isHashSigningEnabled, isNonSSLEnabled },
    thunkApi,
  ) => {
    let res = {
      ...experimentalFeaturesInitialState,
      networkDetails: settingsInitialState.networkDetails,
      networksList: settingsInitialState.networksList,
    };

    try {
      res = await saveExperimentalFeaturesService({
        isExperimentalModeEnabled,
        isHashSigningEnabled,
        isNonSSLEnabled,
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }

    return res;
  },
);

export const changeNetwork = createAsyncThunk<
  { networkDetails: NetworkDetails; isRpcHealthy: boolean },
  { networkName: string },
  { rejectValue: ErrorMessage }
>("settings/changeNetwork", ({ networkName }) =>
  changeNetworkService(networkName),
);

export const addCustomNetwork = createAsyncThunk<
  { networksList: NetworkDetails[] },
  { networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>("settings/addCustomNetwork", async ({ networkDetails }, thunkApi) => {
  let res;
  try {
    res = await addCustomNetworkService(networkDetails);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({
      errorMessage: message,
    });
  }

  return res;
});

export const removeCustomNetwork = createAsyncThunk<
  { networkDetails: NetworkDetails; networksList: NetworkDetails[] },
  { networkName: string },
  { rejectValue: ErrorMessage }
>("settings/removeCustomNetwork", ({ networkName }) =>
  removeCustomNetworkService(networkName),
);

export const editCustomNetwork = createAsyncThunk<
  { networkDetails: NetworkDetails; networksList: NetworkDetails[] },
  { networkDetails: NetworkDetails; networkIndex: number },
  { rejectValue: ErrorMessage }
>("settings/editCustomNetwork", ({ networkDetails, networkIndex }) =>
  editCustomNetworkService({ networkDetails, networkIndex }),
);

export const addAssetsList = createAsyncThunk<
  { assetsLists: AssetsLists; error: string },
  { assetsList: AssetsListItem; network: NETWORKS },
  { rejectValue: ErrorMessage }
>("settings/addAssetsList", async ({ assetsList, network }, thunkApi) => {
  const res = await addAssetsListService({ assetsList, network });

  if (res.error) {
    return thunkApi.rejectWithValue({
      errorMessage: res.error || "Unable to add asset list",
    });
  }

  return res;
});

export const modifyAssetsList = createAsyncThunk<
  { assetsLists: AssetsLists; error: string },
  {
    assetsList: AssetsListItem;
    network: NETWORKS;
    isDeleteAssetsList: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "settings/modifyAssetsList",
  async ({ assetsList, network, isDeleteAssetsList }, thunkApi) => {
    const res = await modifyAssetsListService({
      assetsList,
      network,
      isDeleteAssetsList,
    });

    if (res.error) {
      return thunkApi.rejectWithValue({
        errorMessage: res.error || "Unable to modify asset list",
      });
    }

    return res;
  },
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    clearSettingsError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      saveAllowList.fulfilled,
      (
        state,
        action: PayloadAction<{
          allowList: string[];
        }>,
      ) => {
        const { allowList } = action?.payload || {
          networksList: initialState.allowList,
        };

        return {
          ...state,
          allowList,
        };
      },
    );
    builder.addCase(saveSettings.fulfilled, (state, action) => {
      const {
        isDataSharingAllowed,
        networkDetails,
        isMemoValidationEnabled,
        isSafetyValidationEnabled,
        networksList,
        isValidatingSafeAssetsEnabled,
        isRpcHealthy,
        isSorobanPublicEnabled,
      } = action?.payload || {
        ...initialState,
      };

      return {
        ...state,
        isDataSharingAllowed,
        isMemoValidationEnabled,
        isSafetyValidationEnabled,
        isValidatingSafeAssetsEnabled,
        networkDetails,
        networksList,
        isRpcHealthy,
        isSorobanPublicEnabled,
      };
    });
    builder.addCase(saveExperimentalFeatures.pending, (state) => ({
      ...state,
      experimentalFeaturesState: SettingsState.LOADING,
    }));
    builder.addCase(saveExperimentalFeatures.fulfilled, (state, action) => {
      const {
        isExperimentalModeEnabled,
        isHashSigningEnabled,
        isNonSSLEnabled,
        networkDetails,
        networksList,
      } = action?.payload || {
        ...initialState,
      };

      return {
        ...state,
        isExperimentalModeEnabled,
        isHashSigningEnabled,
        isNonSSLEnabled,
        networkDetails,
        networksList,
        experimentalFeaturesState: SettingsState.SUCCESS,
      };
    });
    builder.addCase(
      loadSettings.fulfilled,
      (
        state,
        action: PayloadAction<
          Settings &
            IndexerSettings &
            ExperimentalFeatures & { assetsLists: AssetsLists }
        >,
      ) => {
        const {
          allowList,
          isDataSharingAllowed,
          networkDetails,
          networksList,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          isValidatingSafeAssetsEnabled,
          isExperimentalModeEnabled,
          isHashSigningEnabled,
          isSorobanPublicEnabled,
          isRpcHealthy,
          userNotification,
          assetsLists,
          isNonSSLEnabled,
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          allowList,
          isDataSharingAllowed,
          networkDetails,
          networksList,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          isValidatingSafeAssetsEnabled,
          isExperimentalModeEnabled,
          isHashSigningEnabled,
          isSorobanPublicEnabled,
          isRpcHealthy,
          userNotification,
          assetsLists,
          isNonSSLEnabled,
          settingsState: SettingsState.SUCCESS,
        };
      },
    );
    builder.addCase(loadSettings.pending, (state) => ({
      ...state,
      indexerState: SettingsState.LOADING,
    }));
    builder.addCase(loadSettings.rejected, (state) => ({
      ...state,
      indexerState: SettingsState.ERROR,
      isRpcHealthy: false,
    }));
    builder.addCase(
      changeNetwork.fulfilled,
      (
        state,
        action: PayloadAction<{
          networkDetails: NetworkDetails;
          isRpcHealthy: boolean;
        }>,
      ) => {
        const { networkDetails, isRpcHealthy } = action?.payload || {
          networkDetails: MAINNET_NETWORK_DETAILS,
          isRpcHealthy: false,
        };

        return {
          ...state,
          networkDetails,
          isRpcHealthy,
          settingsState: SettingsState.SUCCESS,
        };
      },
    );
    builder.addCase(changeNetwork.pending, (state) => ({
      ...state,
      settingsState: SettingsState.LOADING,
    }));
    builder.addCase(changeNetwork.rejected, (state) => ({
      ...state,
      settingsState: SettingsState.ERROR,
    }));
    builder.addCase(
      addCustomNetwork.fulfilled,
      (
        state,
        action: PayloadAction<{
          networksList: NetworkDetails[];
        }>,
      ) => {
        const { networksList } = action?.payload || {
          networksList: DEFAULT_NETWORKS,
        };

        return {
          ...state,
          networksList,
        };
      },
    );
    builder.addCase(addCustomNetwork.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(
      removeCustomNetwork.fulfilled,
      (
        state,
        action: PayloadAction<{
          networksList: NetworkDetails[];
        }>,
      ) => {
        const { networksList } = action?.payload || {
          networksList: DEFAULT_NETWORKS,
        };

        return {
          ...state,
          networksList,
        };
      },
    );
    builder.addCase(
      editCustomNetwork.fulfilled,
      (
        state,
        action: PayloadAction<{
          networkDetails: NetworkDetails;
          networksList: NetworkDetails[];
        }>,
      ) => {
        const { networkDetails, networksList } = action?.payload || {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        };

        return {
          ...state,
          networkDetails,
          networksList,
        };
      },
    );
    builder.addCase(
      addAssetsList.fulfilled,
      (
        state,
        action: PayloadAction<{
          assetsLists: AssetsLists;
        }>,
      ) => {
        const { assetsLists } = action?.payload || {
          assetsLists: initialState.assetsLists,
        };

        return {
          ...state,
          assetsLists,
        };
      },
    );
    builder.addCase(
      modifyAssetsList.fulfilled,
      (
        state,
        action: PayloadAction<{
          assetsLists: AssetsLists;
        }>,
      ) => {
        const { assetsLists } = action?.payload || {
          assetsLists: initialState.assetsLists,
        };

        return {
          ...state,
          assetsLists,
        };
      },
    );
  },
});

export const { reducer } = settingsSlice;

export const { clearSettingsError } = settingsSlice.actions;

export const settingsSelector = (state: {
  settings: Settings &
    IndexerSettings &
    ExperimentalFeatures & { assetsLists: AssetsLists };
}) => state.settings;

export const settingsDataSharingSelector = createSelector(
  settingsSelector,
  (settings) => settings.isDataSharingAllowed,
);

export const settingsExperimentalModeSelector = createSelector(
  settingsSelector,
  (settings) => settings.isExperimentalModeEnabled,
);

export const settingsSorobanSupportedSelector = createSelector(
  settingsSelector,
  (settings) =>
    settings.networkDetails.network === MAINNET_NETWORK_DETAILS.network
      ? settings.isSorobanPublicEnabled && settings.isRpcHealthy
      : settings.isRpcHealthy,
);

export const settingsNetworkDetailsSelector = createSelector(
  settingsSelector,
  (settings) => settings.networkDetails,
);

export const settingsNetworksListSelector = createSelector(
  settingsSelector,
  (settings) => settings.networksList,
);

export const settingsPreferencesSelector = createSelector(
  settingsSelector,
  ({
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isSafetyValidationEnabled,
    isExperimentalModeEnabled,
  }) => ({
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isSafetyValidationEnabled,
    isExperimentalModeEnabled,
  }),
);

export const settingsErrorSelector = createSelector(
  settingsSelector,
  (settings) => settings.error,
);

export const settingsStateSelector = createSelector(
  settingsSelector,
  (settings) => settings.settingsState,
);

export const isNonSSLEnabledSelector = createSelector(
  settingsSelector,
  (settings) => !isMainnet(settings.networkDetails) || settings.isNonSSLEnabled,
);
