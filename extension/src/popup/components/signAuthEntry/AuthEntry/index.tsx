import React from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "soroban-client";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { buildInvocationTree } from "../invocation";
import "./styles.scss";

const authEntryParser = (entryXdr: string) =>
  xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, "hex");

interface TransactionProps {
  authEntryXdr: string;
}

export const AuthEntry = ({ authEntryXdr }: TransactionProps) => {
  const { t } = useTranslation();
  const rootJson = buildInvocationTree(
    authEntryParser(authEntryXdr).rootInvocation(),
  );

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
