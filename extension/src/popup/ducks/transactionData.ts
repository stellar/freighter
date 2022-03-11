import { createSlice } from "@reduxjs/toolkit";

interface TransactionData {
  amount: string;
  asset: string;
  destination: string;
  transactionFee: string;
  memo: string;
}

const initialState: TransactionData = {
  amount: "",
  asset: "native",
  destination: "",
  // TODO - use lumens instead of stroops
  transactionFee: "100",
  memo: "",
};

const transactionDataSlice = createSlice({
  name: "transactionData",
  initialState,
  reducers: {
    saveDestination: (state, action) => {
      state.destination = action.payload;
    },
    // TODO - add for each field
  },
});

export const { saveDestination } = transactionDataSlice.actions;
export const { reducer } = transactionDataSlice;

export const transactionDataSelector = (state: {
  transactionData: TransactionData;
}) => state.transactionData;
