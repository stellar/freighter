import React from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "soroban-client";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { buildInvocationTree } from "../invocation";
import "./styles.scss";

interface TransactionProps {
  authEntryXdr: string;
}

export const AuthEntry = ({ authEntryXdr }: TransactionProps) => {
  const { t } = useTranslation();
  const authEntry = xdr.SorobanAuthorizationEntry.fromXDR(
    authEntryXdr,
    "base64",
  );
  const rootJson = buildInvocationTree(authEntry.rootInvocation());

  return (
    <div className="AuthEntry">
      <div className="AuthEntryHeader">{t("Authorization Entry")}</div>
      <div className="AuthEntryAttributes">
        <pre>
          <SimpleBarWrapper>
            {JSON.stringify(rootJson, null, 2)}
          </SimpleBarWrapper>
        </pre>
      </div>
    </div>
  );
};
