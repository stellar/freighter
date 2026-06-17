import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CopyText, Icon } from "@stellar/design-system";
import { xdr } from "stellar-sdk";

import { getInvocationDetails, InvocationArgs } from "popup/helpers/soroban";
import {
  KeyValueInvokeHostFnArgs,
  KeyValueList,
} from "popup/components/signTransaction/Operations/KeyVal";
import { CopyValue } from "popup/components/CopyValue";
import { truncateString } from "helpers/stellar";

import "./styles.scss";

export interface AuthEntryDisplay {
  invocation: xdr.SorobanAuthorizedInvocation;
  /**
   * The address whose authorization the entry's credentials represent.
   * Present for address credentials (incl. CAP-71 ADDRESS_V2 /
   * ADDRESS_WITH_DELEGATES); absent for source-account credentials.
   */
  boundAddress?: string;
}

interface AuthEntriesProps {
  entries: AuthEntryDisplay[];
}

export const AuthEntries = ({ entries }: AuthEntriesProps) => {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleExpandDetail = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const renderAuthEntry = ({ invocation, boundAddress }: AuthEntryDisplay) => {
    const details = getInvocationDetails(invocation);

    const renderDetailTitle = (detail: InvocationArgs) => {
      switch (detail.type) {
        case "invoke": {
          return <span>{detail.fnName}</span>;
        }
        case "sac":
        case "wasm": {
          return <span>{t("Contract creation")}</span>;
        }
        default: {
          return null;
        }
      }
    };

    const renderDetailContent = (detail: InvocationArgs) => {
      switch (detail.type) {
        case "invoke": {
          return (
            <React.Fragment key={detail.fnName}>
              <div
                className="AuthEntry__InfoBlock"
                data-testid="AuthDetail__invocation"
              >
                <div className="AuthEntry__InfoBlock_Inner">
                  <div className="AuthEntry__InfoBlock_Inner__Value">
                    <CopyText textToCopy={detail.contractId}>
                      <div className="Parameters">
                        <div className="ParameterKey">
                          {t("Contract ID")}
                          <Icon.Copy01 />
                        </div>
                        <div className="ParameterValue">
                          {detail.contractId}
                        </div>
                      </div>
                    </CopyText>
                    <CopyText textToCopy={detail.fnName}>
                      <div className="Parameters">
                        <div className="ParameterKey">
                          {t("Function Name")}
                          <Icon.Copy01 />
                        </div>
                        <div className="ParameterValue">{detail.fnName}</div>
                      </div>
                    </CopyText>
                  </div>
                </div>
                <div className="AuthEntry__InfoBlock_Inner">
                  <KeyValueInvokeHostFnArgs
                    args={detail.args}
                    contractId={detail.contractId}
                    fnName={detail.fnName}
                    isAuthEntry
                  />
                </div>
              </div>
            </React.Fragment>
          );
        }
        case "sac": {
          return (
            <React.Fragment key={detail.asset}>
              <div className="AuthEntry__TitleRow">
                <Icon.CodeSnippet01 />
                <span>{t("Contract creation")}</span>
              </div>
              <div className="AuthEntry__InfoBlock">
                <KeyValueList
                  operationKey={t("Asset")}
                  operationValue={truncateString(detail.asset)}
                />
                {detail.args && <KeyValueInvokeHostFnArgs args={detail.args} />}
              </div>
            </React.Fragment>
          );
        }
        case "wasm": {
          return (
            <React.Fragment key={detail.hash}>
              <div
                className="AuthEntry__TitleRow"
                data-testid="AuthEntry__CreateWasmInvocation"
              >
                <Icon.CodeSnippet01 />
                <span>{t("Contract creation")}</span>
              </div>
              <div className="AuthEntry__InfoBlock">
                <KeyValueList
                  operationKey={t("Contract Address")}
                  operationValue={
                    <CopyValue
                      value={detail.address}
                      displayValue={truncateString(detail.address)}
                    />
                  }
                />
                <KeyValueList
                  operationKey={t("Hash")}
                  operationValue={truncateString(detail.hash)}
                />
                <KeyValueList
                  operationKey={t("Salt")}
                  operationValue={truncateString(detail.salt)}
                />
                {detail.args && <KeyValueInvokeHostFnArgs args={detail.args} />}
              </div>
            </React.Fragment>
          );
        }
        default: {
          return null;
        }
      }
    };

    return (
      <>
        {boundAddress && (
          <div
            className="AuthEntry__InfoBlock"
            data-testid="AuthEntry__BoundAddress"
          >
            <KeyValueList
              operationKey={t("Authorized address")}
              operationValue={
                <CopyValue
                  value={boundAddress}
                  displayValue={truncateString(boundAddress)}
                />
              }
            />
          </div>
        )}
        {details.map((detail, ind) => (
          <div
            className="AuthEntryContainer"
            data-testid="AuthEntryContainer"
            key={`${invocation.toXDR("raw").toString()}-${ind}`}
          >
            <div
              className="AuthEntryBtn"
              data-testid="AuthEntryBtn"
              onClick={() => handleExpandDetail(ind)}
            >
              <div
                className="AuthEntryBtn__Title"
                data-testid="AuthEntryBtn__Title"
              >
                <Icon.CodeCircle01 />
                {renderDetailTitle(detail)}
              </div>
              <Icon.ChevronRight
                className={`Icon--rotate ${expandedIndex === ind ? "open" : ""}`}
              />
            </div>
            {expandedIndex === ind ? (
              <div className="AuthEntryContent" data-testid="AuthEntryContent">
                {renderDetailContent(detail)}
              </div>
            ) : null}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="AuthEntries">
      <div className="AuthEntries__TitleRow">
        <Icon.Key01 />
        <span>{t("Authorizations")}</span>
      </div>
      {entries.map((entry) => (
        <React.Fragment key={entry.invocation.toXDR("raw").toString()}>
          {renderAuthEntry(entry)}
        </React.Fragment>
      ))}
    </div>
  );
};
