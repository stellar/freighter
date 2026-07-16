import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";

import {
  createAccount,
  confirmPassword,
  confirmMnemonicPhrase,
  recoverAccount,
} from "popup/ducks/accountServices";
import { AppState } from "popup/App";

registerHandler<AppState>(createAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.onboardingPasswordCreated);
});
registerHandler<AppState>(createAccount.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.onboardingPasswordCreateFailed, {
    reason_code: errorMessage,
  });
});

registerHandler<AppState>(confirmPassword.fulfilled, () => {
  emitMetric(METRIC_NAMES.reauthCompleted);
});
registerHandler<AppState>(confirmPassword.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.reauthFailed, {
    reason_code: errorMessage,
  });
});

registerHandler<AppState>(confirmMnemonicPhrase.fulfilled, () => {
  emitMetric(METRIC_NAMES.onboardingRecoveryPhraseConfirmed);
});
registerHandler<AppState>(confirmMnemonicPhrase.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.onboardingRecoveryPhraseConfirmFailed, {
    reason_code: errorMessage,
  });
});

registerHandler<AppState>(recoverAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.accountRecoveryCompleted);
});
registerHandler<AppState>(recoverAccount.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.accountRecoveryFailed, {
    reason_code: errorMessage,
  });
});
