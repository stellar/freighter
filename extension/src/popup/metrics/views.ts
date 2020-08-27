import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";

import { navigate } from "popup/ducks/views";
import { AppState } from "popup/App";
import { ROUTES } from "popup/constants/routes";

const routeToEventName = {
  [ROUTES.welcome]: METRIC_NAMES.viewWelcome,
  [ROUTES.account]: METRIC_NAMES.viewAccount,
  [ROUTES.signTransaction]: METRIC_NAMES.viewSignTransaction,
  [ROUTES.grantAccess]: METRIC_NAMES.viewGrantAccess,
  [ROUTES.mnemonicPhrase]: METRIC_NAMES.viewMnemonicPhrase,
  [ROUTES.unlockAccount]: METRIC_NAMES.viewUnlockAccount,
  [ROUTES.mnemonicPhraseConfirmed]: METRIC_NAMES.viewMnemonicPhraseConfirmed,
  [ROUTES.accountCreator]: METRIC_NAMES.viewAccountCreator,
  [ROUTES.recoverAccount]: METRIC_NAMES.viewRecoverAccount,
  [ROUTES.recoverAccountSuccess]: METRIC_NAMES.viewRecoverAccountSuccess,
};

registerHandler<AppState>(navigate, (_, a) => {
  // Awkward, but gives us types on action payload
  const action = a as ReturnType<typeof navigate>;
  const { pathname, search } = action.payload.location;

  const eventName = routeToEventName[pathname];

  if (!eventName) {
    throw new Error(`Didn't find a metric event name for path '${pathname}'`);
  }

  // "/sign-transaction" and "/grant-access" require additionak metrics on loaded page
  if (search) {
    const { transaction, domain } = getTransactionInfo(search);
    const METRIC_OPTION_DOMAIN = {
      domain,
    };

    if (pathname === ROUTES.grantAccess) {
      emitMetric(eventName, METRIC_OPTION_DOMAIN);
    }

    if (pathname === ROUTES.signTransaction) {
      const { _operations } = transaction;
      const operationTypes = transaction._operations.map(
        (operation: { type: string }) => operation.type,
      );

      const METRIC_OPTIONS = {
        ...METRIC_OPTION_DOMAIN,
        number_of_operations: _operations.length,
        operationTypes,
      };

      emitMetric(eventName, METRIC_OPTIONS);
    }
  } else {
    emitMetric(eventName);
  }
});
