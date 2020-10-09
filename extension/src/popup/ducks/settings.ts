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

interface ErrorMessage {
  errorMessage: string;
}

export const loadSettings = createAsyncThunk("settings/loadSettings", () =>
  loadSettingsService(),
);

export const saveSettings = createAsyncThunk<
  { isDataSharingAllowed: boolean },
  { isDataSharingAllowed: boolean },
  { rejectValue: ErrorMessage }
>("settings/saveSettings", async ({ isDataSharingAllowed }, thunkApi) => {
  let res = {
    isDataSharingAllowed: false,
  };

  try {
    res = await saveSettingsService(isDataSharingAllowed);
  } catch (e) {
    console.error(e);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }

  return res;
});

interface Settings {
  isDataSharingAllowed: boolean;
}

const initialState: Settings = {
  isDataSharingAllowed: false,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      saveSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const { isDataSharingAllowed } = action.payload;

        return {
          ...state,
          isDataSharingAllowed,
        };
      },
    );
    builder.addCase(
      loadSettings.fulfilled,
      (state, action: PayloadAction<Settings>) => {
        const { isDataSharingAllowed } = action.payload;

        return {
          ...state,
          isDataSharingAllowed: isDataSharingAllowed || false,
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
