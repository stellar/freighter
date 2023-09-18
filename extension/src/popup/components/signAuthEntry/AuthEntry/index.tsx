import React from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "soroban-client";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { buildInvocationTree } from "../invocation";
import "./styles.scss";

interface TransactionProps {
  preimageXdr: string;
}

export const AuthEntry = ({ preimageXdr }: TransactionProps) => {
  const { t } = useTranslation();
  const preimage = xdr.HashIdPreimage.fromXDR(
    preimageXdr,
    "base64",
  );

  const rootJson = buildInvocationTree(preimage.sorobanAuthorization().invocation());

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
