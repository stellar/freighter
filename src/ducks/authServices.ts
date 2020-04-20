import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { history } from "App";
import { createAccount, loadAccount } from "services";

export const authenticate = createAsyncThunk(
  "auth/createAccount",
  async (password: string) => {
    let res;

    try {
      res = await createAccount(password);
    } catch (e) {
      console.error(e);
    }
    history.push("/mnemonic-phrase");
    return res;
  },
);

export const getAccount = createAsyncThunk("auth/getAccount", async () => {
  let res;

  try {
    res = await loadAccount();
  } catch (e) {
    console.error(e);
  }
  return res;
});
const authSlice = createSlice({
  name: "auth",
  initialState: { authenticated: false, keyStoreId: null, publicKey: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(authenticate.fulfilled, (state, action) => {
      const { publicKey } = action.payload || { publicKey: "" };

      state.publicKey = publicKey;
    });
    builder.addCase(getAccount.fulfilled, (state, action) => {
      const { publicKey } = action.payload || { publicKey: "" };

      state.publicKey = publicKey;
    });
  },
});

const { reducer } = authSlice;
// const authSelector = (state: { auth: boolean }) => state.auth;
// const publicKeySelector = createSelector(authSelector, (auth) =>
//   getPublicKeyFromId(auth.publicKey),
// );

export { reducer };
