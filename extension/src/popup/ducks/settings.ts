import {
  createSelector,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import {
  saveSettings as saveSettingsService,
  loadSettings as loadSettingsService,
} from "@shared/api/internal";
import { NetworkDetails } from "@shared/helpers/stellar";

import { Settings } from "@shared/api/types";

interface ErrorMessage {
  errorMessage: string;
}
const initialState: Settings = {
  isDataSharingAllowed: false,
  networkDetails: {
    isTestnet: false,
    network: "",
    networkName: "",
    otherNetworkName: "",
    networkUrl: "",
    networkPassphrase: "",
  } as NetworkDetails,
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
    isTestnet: boolean;
    isMemoValidationEnabled: boolean;
    isSafetyValidationEnabled: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "settings/saveSettings",
  async (
    {
      isDataSharingAllowed,
      isTestnet,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
    },
    thunkApi,
  ) => {
    let res = { ...initialState };

    try {
      res = await saveSettingsService({
        isDataSharingAllowed,
        isTestnet,
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
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
          networkDetails,
        };
      },
    );
    builder.addCase(
      loadSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const {
          isDataSharingAllowed,
          networkDetails,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
        } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          networkDetails,
          isMemoValidationEnabled,
          isSafetyValidationEnabled,
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
