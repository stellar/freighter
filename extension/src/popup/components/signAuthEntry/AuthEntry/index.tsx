import React from "react";
import { useTranslation } from "react-i18next";
import { xdr, buildInvocationTree } from "stellar-sdk";

import "./styles.scss";

interface TransactionProps {
  preimageXdr: string;
}

export const AuthEntry = ({ preimageXdr }: TransactionProps) => {
  const { t } = useTranslation();
  const preimage = xdr.HashIdPreimage.fromXDR(preimageXdr, "base64");

  const rootJson = buildInvocationTree(
    preimage.sorobanAuthorization().invocation(),
  );

  return (
    <div className="AuthEntry">
      <div className="AuthEntryHeader">{t("Authorization Entry")}</div>
      <div className="AuthEntryAttributes">
        <pre>
          <div>
            {JSON.stringify(
              rootJson,
              (_, val) => (typeof val === "bigint" ? val.toString() : val),
              2,
            )}
          </div>
        </pre>
      </div>
    </div>
  );
};
