import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "stellar-sdk";

import { buildInvocationTree } from "popup/helpers/soroban";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { View } from "popup/basics/layout/View";
import IconFail from "popup/assets/icon-fail.svg";
import { Button } from "@stellar/design-system";
import "./styles.scss";

interface TransactionProps {
  preimageXdr: string;
  rejectAndClose: () => void;
}

export const AuthEntry = ({
  preimageXdr,
  rejectAndClose,
}: TransactionProps) => {
  const { t } = useTranslation();
  try {
    const preimage = xdr.HashIdPreimage.fromXDR(preimageXdr, "base64");

    const rootJson = buildInvocationTree(
      preimage.sorobanAuthorization().invocation(),
    );

    return (
      <div className="AuthEntry">
        <div className="AuthEntryHeader">{t("Authorization Entry")}</div>
        <div className="AuthEntryAttributes">
          <pre>
            {JSON.stringify(
              rootJson,
              (_, val) => (typeof val === "bigint" ? val.toString() : val),
              2,
            )}
          </pre>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <InvalidAuthEntry
        error={JSON.stringify(error)}
        rejectAndClose={rejectAndClose}
      />
    );
  }
};

const InvalidAuthEntry = ({
  error,
  rejectAndClose,
}: {
  error: string;
  rejectAndClose: () => void;
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    emitMetric(METRIC_NAMES.invalidAuthEntry, { error });
  }, [error]);

  return (
    <div className="InvalidAuthEntry">
      <React.Fragment>
        <View.AppHeader pageTitle={t("Error")} />
        <View.Content>
          <div className="InvalidAuthEntryBody__content">
            <div className="InvalidAuthEntryBody__amount">
              Auth Entry Rejected
            </div>
            <div className="InvalidAuthEntryBody__icon InvalidAuthEntryBody__fail">
              <img src={IconFail} alt="Icon Fail" />
            </div>
            <div className="InvalidAuthEntryBody__error-code"></div>
          </div>
          <div className="InvalidAuthEntryBody__error-block">
            Invalid Authorization Entry Format
          </div>
        </View.Content>
        <View.Footer>
          <Button
            isFullWidth
            variant="secondary"
            size="md"
            onClick={rejectAndClose}
          >
            {t("Got it")}
          </Button>
        </View.Footer>
      </React.Fragment>
    </div>
  );
};
