import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";

import {
  createAccount,
  confirmPassword,
  confirmMnemonicPhrase,
  recoverAccount,
} from "popup/ducks/authServices";
import { AppState } from "popup/App";

registerHandler<AppState>(createAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.newWalletSuccess);
});
registerHandler<AppState>(createAccount.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.newWalletReject, {
    error_type: errorMessage,
  });
});

registerHandler<AppState>(confirmPassword.fulfilled, () => {
  emitMetric(METRIC_NAMES.confirmPasswordSuccess);
});
registerHandler<AppState>(confirmPassword.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.confirmPasswordFail, {
    error_type: errorMessage,
  });
});

registerHandler<AppState>(confirmMnemonicPhrase.fulfilled, () => {
  emitMetric(METRIC_NAMES.newWalletMnemonicConfirmPhrase);
});
registerHandler<AppState>(confirmMnemonicPhrase.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.newWalletConfirmMnemonicFail, {
    error_type: errorMessage,
  });
});

registerHandler<AppState>(recoverAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.recoverAccountSuccess);
});
registerHandler<AppState>(recoverAccount.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.recoverAccountFail, {
    error_type: errorMessage,
  });
});
