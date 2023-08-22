import React from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "soroban-client";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import "./styles.scss";

const authEntryParser = (entryXdr: string) =>
  xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, "hex");

interface TransactionProps {
  authEntryXdr: string;
}

export const AuthEntry = ({ authEntryXdr }: TransactionProps) => {
  const { t } = useTranslation();
  return (
    <div className="AuthEntry">
      <div className="AuthEntryHeader">{t("Authorization Entry")}</div>
      <div className="AuthEntryAttributes">
        <pre>
          <SimpleBarWrapper>
            {JSON.stringify(authEntryParser(authEntryXdr), null, 2)}
          </SimpleBarWrapper>
        </pre>
      </div>
    </div>
  );
};
