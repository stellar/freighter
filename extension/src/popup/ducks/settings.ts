import {
  createSelector,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import {
  saveSettings as saveSettingsService,
  loadSettings as loadSettingsService,
  changeNetwork as changeNetworkService,
  addCustomNetwork as addCustomNetworkService,
} from "@shared/api/internal";
import {
  NetworkDetails,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

import { CustomNetwork, Settings } from "@shared/api/types";

interface ErrorMessage {
  errorMessage: string;
}

const initialState: Settings = {
  isDataSharingAllowed: false,
  networkDetails: {
    network: "",
    networkName: "",
    networkUrl: "",
    networkPassphrase: "",
  } as NetworkDetails,
  networksList: DEFAULT_NETWORKS,
  isMemoValidationEnabled: true,
  isSafetyValidationEnabled: true,
};

export const loadSettings = createAsyncThunk("settings/loadSettings", () =>
  loadSettingsService(),
);

export const saveSettings = createAsyncThunk<
  Settings,
  {
    isDataSharingAllowed: boolean;
    isMemoValidationEnabled: boolean;
    isSafetyValidationEnabled: boolean;
    networkDetails: NetworkDetails;
  },
  { rejectValue: ErrorMessage }
>(
  "settings/saveSettings",
  async (
    {
      isDataSharingAllowed,
      networkDetails,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
    },
    thunkApi,
  ) => {
    let res = { ...initialState };

    try {
      res = await saveSettingsService({
        isDataSharingAllowed,
        networkDetails,
        isMemoValidationEnabled,
        isSafetyValidationEnabled,
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
  NetworkDetails,
  { networkName: string },
  { rejectValue: ErrorMessage }
>("settings/changeNetwork", ({ networkName }) =>
  changeNetworkService(networkName),
);

export const addCustomNetwork = createAsyncThunk<
  { networkDetails: NetworkDetails; networksList: NetworkDetails[] },
  { customNetwork: CustomNetwork },
  { rejectValue: ErrorMessage }
>("settings/addCustomNetwork", ({ customNetwork }) =>
  addCustomNetworkService(customNetwork),
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      saveSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const {
          isDataSharingAllowed,
          networkDetails,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          networksList,
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          networkDetails,
          networksList,
        };
      },
    );
    builder.addCase(
      loadSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const {
          isDataSharingAllowed,
          networkDetails,
          networksList,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          networkDetails,
          networksList,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
        };
      },
    );
    builder.addCase(
      changeNetwork.fulfilled,
      (state, action: PayloadAction<NetworkDetails>) => {
        const networkDetails = action?.payload || MAINNET_NETWORK_DETAILS;

        return {
          ...state,
          networkDetails,
        };
      },
    );
    builder.addCase(
      addCustomNetwork.fulfilled,
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

export const settingsSelector = (state: { settings: Settings }) =>
  state.settings;

export const settingsDataSharingSelector = createSelector(
  settingsSelector,
  (settings) => settings.isDataSharingAllowed,
);

export const settingsNetworkDetailsSelector = createSelector(
  settingsSelector,
  (settings) => settings.networkDetails,
);

export const settingsNetworksListSelector = createSelector(
  settingsSelector,
  (settings) => settings.networksList,
);
