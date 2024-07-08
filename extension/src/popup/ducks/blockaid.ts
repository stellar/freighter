import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ActionStatus, ErrorMessage } from "@shared/api/types";
import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";

export const scanSite = createAsyncThunk<
  BlockAidScanSiteResult,
  {
    url: string;
    networkDetails: NetworkDetails;
  },
  {
    rejectValue: ErrorMessage;
  }
>("scanSite", async ({ url, networkDetails }, thunkApi) => {
  try {
    // Will we have testnet as well?
    if (isCustomNetwork(networkDetails)) {
      return thunkApi.rejectWithValue({
        errorMessage: "Scanning sites is not supported on custom networks",
      });
    }

    const res = await fetch(
      `${INDEXER_URL}/scan-site?url=${encodeURIComponent(url)}`,
    );
    const response = await res.json();

    if (!res.ok) {
      return thunkApi.rejectWithValue({
        errorMessage: response.message,
      });
    }
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({
      errorMessage: message,
    });
  }
});

interface BlockAidScanSiteResult {
  status: "hit" | "miss";
  url: string;
  scan_start_time: Date;
  scan_end_time: Date;
  malicious_score: number; // 0-1
  is_reachable: boolean;
  is_web3_site: true;
  is_malicious: boolean;
  // ...
}

interface State {
  error: ErrorMessage | undefined;
  status: ActionStatus;
  scanSiteResult: BlockAidScanSiteResult | undefined;
  // scanSite: (url: string) => Promise<BlockAidScanSiteResult | null>
}

export const initialState: State = {
  error: undefined,
  status: ActionStatus.IDLE,
  scanSiteResult: undefined,
};

const blockaidSlice = createSlice({
  name: "blockAid",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(scanSite.pending, (state) => {
      state.status = ActionStatus.PENDING;
    });
    builder.addCase(scanSite.rejected, (state, action) => {
      state.status = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(scanSite.fulfilled, (state, action) => {
      state.status = ActionStatus.SUCCESS;
      state.scanSiteResult = action.payload;
    });
  },
});

export const { reset } = blockaidSlice.actions;
export const { reducer } = blockaidSlice;
