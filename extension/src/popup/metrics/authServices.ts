import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";
import { scrubStrKeys } from "helpers/stellarStrKey";

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
    reason_code: scrubStrKeys(errorMessage) ?? errorMessage,
  });
});

registerHandler<AppState>(confirmPassword.fulfilled, () => {
  emitMetric(METRIC_NAMES.reauthCompleted);
});
registerHandler<AppState>(confirmPassword.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.reauthFailed, {
    reason_code: scrubStrKeys(errorMessage) ?? errorMessage,
  });
});

registerHandler<AppState>(confirmMnemonicPhrase.fulfilled, () => {
  emitMetric(METRIC_NAMES.onboardingRecoveryPhraseConfirmed);
  // Create-account onboarding completes on mnemonic confirm (also the skip
  // paths dispatch confirmMnemonicPhrase). Mirrors mobile's onboarding.completed.
  emitMetric(METRIC_NAMES.onboardingCompleted);
});
registerHandler<AppState>(confirmMnemonicPhrase.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.onboardingRecoveryPhraseConfirmFailed, {
    reason_code: scrubStrKeys(errorMessage) ?? errorMessage,
  });
});

registerHandler<AppState>(recoverAccount.fulfilled, () => {
  // account_recovery.completed carries recovery_method.
  emitMetric(METRIC_NAMES.accountRecoveryCompleted, {
    recovery_method: "recovery_phrase",
  });
});
registerHandler<AppState>(recoverAccount.rejected, (_state, action) => {
  const { errorMessage } = action.payload;

  emitMetric(METRIC_NAMES.accountRecoveryFailed, {
    reason_code: scrubStrKeys(errorMessage) ?? errorMessage,
  });
});
