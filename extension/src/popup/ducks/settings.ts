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

import { Settings } from "@shared/api/types";

interface ErrorMessage {
  errorMessage: string;
}

const initialState: Settings = {
  isDataSharingAllowed: false,
  isTestnet: false,
};

export const loadSettings = createAsyncThunk("settings/loadSettings", () =>
  loadSettingsService(),
);

export const saveSettings = createAsyncThunk<
  Settings,
  Settings,
  { rejectValue: ErrorMessage }
>(
  "settings/saveSettings",
  async ({ isDataSharingAllowed, isTestnet }, thunkApi) => {
    let res = { ...initialState };

    try {
      res = await saveSettingsService({ isDataSharingAllowed, isTestnet });
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
        const { isDataSharingAllowed, isTestnet } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          isTestnet,
        };
      },
    );
    builder.addCase(
      loadSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const { isDataSharingAllowed, isTestnet } = action?.payload || {
          ...initialState,
        };

        return {
          ...state,
          isDataSharingAllowed,
          isTestnet,
        };
      },
    );
  },
});

export const { reducer } = settingsSlice;

const settingsSelector = (state: { settings: Settings }) => state.settings;

export const settingsDataSharingSelector = createSelector(
  settingsSelector,
  (settings) => settings.isDataSharingAllowed,
);
export const settingsIsTestnetSelector = createSelector(
  settingsSelector,
  (settings) => settings.isTestnet,
);
