import {
  createSelector,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import {
  saveAllowList as saveAllowListService,
  saveSettings as saveSettingsService,
  loadSettings as loadSettingsService,
  changeNetwork as changeNetworkService,
  addCustomNetwork as addCustomNetworkService,
  removeCustomNetwork as removeCustomNetworkService,
  editCustomNetwork as editCustomNetworkService,
} from "@shared/api/internal";
import {
  NetworkDetails,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

import { Settings, IndexerSettings } from "@shared/api/types";

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
  isExperimentalModeEnabled: false,
  error: "",
};

const indexerInitialState: IndexerSettings = {
  isSorobanPublicEnabled: false,
  isRpcHealthy: false,
};

const initialState = {
  ...settingsInitialState,
  ...indexerInitialState,
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
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }

  return res;
});

export const saveSettings = createAsyncThunk<
  Settings,
  {
    isDataSharingAllowed: boolean;
    isMemoValidationEnabled: boolean;
    isSafetyValidationEnabled: boolean;
    isValidatingSafeAssetsEnabled: boolean;
    isExperimentalModeEnabled: boolean;
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
      isExperimentalModeEnabled,
    },
    thunkApi,
  ) => {
    let res = { ...settingsInitialState };

    try {
      res = await saveSettingsService({
        isDataSharingAllowed,
        isMemoValidationEnabled,
        isSafetyValidationEnabled,
        isValidatingSafeAssetsEnabled,
        isExperimentalModeEnabled,
      });
    } catch (e) {
      console.error(e);
      return thunkApi.rejectWithValue({
        errorMessage: e.message,
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
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
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
    builder.addCase(
      saveSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const {
          isDataSharingAllowed,
          networkDetails,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          networksList,
          isValidatingSafeAssetsEnabled,
          isExperimentalModeEnabled,
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          isValidatingSafeAssetsEnabled,
          isExperimentalModeEnabled,
          networkDetails,
          networksList,
        };
      },
    );
    builder.addCase(
      loadSettings.fulfilled,
      (state, action: PayloadAction<Settings & IndexerSettings>) => {
        const {
          allowList,
          isDataSharingAllowed,
          networkDetails,
          networksList,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          isValidatingSafeAssetsEnabled,
          isExperimentalModeEnabled,
          isSorobanPublicEnabled,
          isRpcHealthy,
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
          isSorobanPublicEnabled,
          isRpcHealthy,
        };
      },
    );
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
        };
      },
    );
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
  },
});

export const { reducer } = settingsSlice;

export const { clearSettingsError } = settingsSlice.actions;

export const settingsSelector = (state: {
  settings: Settings & IndexerSettings;
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
