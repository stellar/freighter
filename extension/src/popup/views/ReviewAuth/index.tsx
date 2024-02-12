import React from "react";
import { useLocation } from "react-router-dom";
import {
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { useSelector } from "react-redux";

import { decodeString } from "helpers/urls";
import { Icon } from "@stellar/design-system";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "./styles.scss";
import {
  KeyValueInvokeHostFnArgs,
  KeyValueList,
} from "popup/components/signTransaction/Operations/KeyVal";
import { useTranslation } from "react-i18next";
import { truncateString } from "helpers/stellar";

export const ReviewAuth = () => {
  const location = useLocation();
  const decodedSearchParam = decodeString(location.search.replace("?", ""));
  const params = decodedSearchParam ? JSON.parse(decodedSearchParam) : {};
  console.log(params);

  const [activeAuthEntryIndex, setActiveAuthEntryIndex] = React.useState(0);
  const { networkPassphrase } = useSelector(settingsNetworkDetailsSelector);
  const transaction = TransactionBuilder.fromXDR(
    params.transactionXdr,
    networkPassphrase,
  ) as Transaction;
  const op = transaction.operations[0] as Operation.InvokeHostFunction;
  const authCount = op.auth ? op.auth.length : 0;
  console.log(setActiveAuthEntryIndex);

  return (
    <div className="ReviewAuth">
      <div className="ReviewAuth__Body">
        <div className="ReviewAuth__Title">
          <PunycodedDomain domain={params.domain} domainTitle="" />
          <div className="ReviewAuth--connection-request">
            <div className="ReviewAuth--connection-request-pill">
              <Icon.Link />
              <p>Transaction Request</p>
            </div>
          </div>
        </div>
        <div className="ReviewAuth__Details">
          <h5>
            {activeAuthEntryIndex}/{authCount} Authorizations
          </h5>
          {op.auth && <AuthDetail authEntry={op.auth[activeAuthEntryIndex]} />}
        </div>
        <div className="ReviewAuth__Actions">
          {/* <div className="SignTransaction__Actions__SigningWith">
              <h5>Signing with</h5>
              <div className="SignTransaction__Actions__PublicKey">
                <KeyIdenticon publicKey={currentAccount.publicKey} />
              </div>
            </div>
            <div className="SignTransaction__Actions__BtnRow">
              <Button
                isFullWidth
                size="md"
                variant="secondary"
                onClick={() => rejectAndClose()}
              >
                {t("Cancel")}
              </Button>
              {needsReviewAuth ? (
                <Button
                  disabled={isSubmitDisabled}
                  variant="tertiary"
                  isFullWidth
                  size="md"
                  isLoading={isConfirming}
                  onClick={() => navigateTo(ROUTES.reviewAuthorization)}
                >
                  {t("Review")}
                </Button>
              ) : (
                  <Button
                  disabled={isSubmitDisabled}
                  variant="tertiary"
                  isFullWidth
                  size="md"
                  isLoading={isConfirming}
                  onClick={() => handleApprove()}
                >
                  {t("Sign")}
                </Button>
              )}
            </div> */}
        </div>
      </div>
    </div>
  );
};

function getInvocationDetails(invocation: xdr.SorobanAuthorizedInvocation) {
  return [
    getInvocationArgs(invocation),
    ...invocation.subInvocations().map(getInvocationArgs),
  ];
}

function getInvocationArgs(invocation: xdr.SorobanAuthorizedInvocation) {
  const _invocation = invocation.function().contractFn();
  const contractId = StrKey.encodeContract(
    _invocation.contractAddress().contractId(),
  );
  const fnName = _invocation.functionName().toString();
  const args = _invocation.args();
  return { fnName, contractId, args };
}

const AuthDetail = ({
  authEntry,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
}) => {
  const { t } = useTranslation();
  const details = getInvocationDetails(authEntry.rootInvocation());
  return (
    <div className="AuthDetail">
      <div className="AuthDetail__TitleRow">
        <Icon.Aod />
        {details.map((detail) => (
          <React.Fragment key={detail.fnName}>
            <p>Invocation</p>
            <div className="AuthDetail__InfoBlock">
              <KeyValueList
                operationKey={t("Contract ID")}
                operationValue={truncateString(detail.contractId)}
              />
              <KeyValueList
                operationKey={t("Function Name")}
                operationValue={detail.fnName}
              />
              <KeyValueInvokeHostFnArgs args={detail.args} />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
