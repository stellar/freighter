import React from "react";
import { camelCase } from "lodash";
import styled from "styled-components";
import { useSelector } from "react-redux";

import { BasicButton } from "popup/basics/Buttons";

import { COLOR_PALETTE } from "popup/constants/styles";
import { OPERATION_TYPES } from "constants/transaction";
import { HorizonOperation } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import IconOpenExternal from "popup/assets/icon-open-external.svg";

const HistoryListEl = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`;

const OpenExternalIconEl = styled.img`
  display: flex;
  opacity: 0;
  width: 0.9375rem;
`;

const HistoryItemEl = styled.li`
  border-bottom: 1px solid ${COLOR_PALETTE.greyFaded};
  color: ${COLOR_PALETTE.lightText};
  display: flex;
  justify-content: space-between;
  height: 4rem;
  padding: 0 1rem 0 2rem;

  &: hover {
    background: ${COLOR_PALETTE.white};
    cursor: pointer;
    ${OpenExternalIconEl} {
      opacity: 1;
    }
  }
`;

const HistoryColumnEl = styled.div`
  display: flex;
  flex-direction: column;
`;

const PaymentColumnEl = styled(HistoryColumnEl)`
  margin-left: 7.5rem;
`;

const HistoryColumnRowEl = styled.div`
  margin-top: 0.5rem;
`;

const PaymentEl = styled(HistoryColumnRowEl)`
  font-size: 0.8125rem;
`;

const TimestampEl = styled(HistoryColumnRowEl)`
  color: ${COLOR_PALETTE.grey};
  font-size: 0.75rem;
`;

const FullHistoryBtnEl = styled(BasicButton)`
  color: ${COLOR_PALETTE.primary};
  display: block;
  font-size: 1rem;
  margin: 1.5rem auto;
  text-align: center;
`;

interface PaymentInfoProps {
  amount: string;
  assetCode: string | undefined;
  isRecipient: boolean;
  otherAccount: string;
}
const PaymentInfo = ({
  amount,
  assetCode,
  isRecipient,
  otherAccount,
}: PaymentInfoProps) => (
  <>
    <PaymentEl>
      {isRecipient ? "+" : "-"}
      {amount} {assetCode || "XLM"}
    </PaymentEl>
    <HistoryColumnRowEl>
      <KeyIdenticon isSmall publicKey={otherAccount} />
    </HistoryColumnRowEl>
  </>
);

const HistoryItem = ({
  operation: {
    amount,
    asset_code: assetCode,
    created_at: createdAt,
    id,
    to,
    from,
    type,
    transaction_attr: { operation_count: operationCount },
  },
  publicKey,
  url,
}: {
  operation: HorizonOperation;
  publicKey: string;
  url: string;
}) => {
  const operationType = camelCase(type) as keyof typeof OPERATION_TYPES;
  const operationString = OPERATION_TYPES[operationType];
  const isPaymentOperation = [
    OPERATION_TYPES.pathPaymentStrictReceive,
    OPERATION_TYPES.pathPaymentStrictSend,
    OPERATION_TYPES.payment,
  ].includes(operationString);

  let isRecipient;
  let otherAccount;
  let PaymentComponent = null as React.ReactElement | null;

  if (isPaymentOperation) {
    isRecipient = to === publicKey;
    otherAccount = isRecipient ? from : to;
    PaymentComponent = (
      <PaymentInfo
        amount={amount}
        assetCode={assetCode}
        isRecipient={isRecipient}
        otherAccount={otherAccount}
      />
    );
  }

  const renderPaymentComponent = () => PaymentComponent;

  return (
    <HistoryItemEl
      onClick={() => {
        emitMetric(METRIC_NAMES.historyOpenItem);
        openTab(`${url}/op/${id}`);
      }}
    >
      <HistoryColumnEl>
        <TimestampEl>
          {new Date(Date.parse(createdAt)).toLocaleString()}
        </TimestampEl>
        <HistoryColumnRowEl>
          {isPaymentOperation
            ? `${isRecipient ? "Received" : "Sent"} ${operationString}`
            : operationString}
          {operationCount > 1 && !isPaymentOperation
            ? ` + ${operationCount - 1} ops`
            : null}
        </HistoryColumnRowEl>
      </HistoryColumnEl>
      <PaymentColumnEl>{renderPaymentComponent()}</PaymentColumnEl>
      <OpenExternalIconEl src={IconOpenExternal} alt="open in stellar.expert" />
    </HistoryItemEl>
  );
};

export const AccountHistory = ({
  publicKey,
  operations,
}: {
  publicKey: string;
  operations: Array<HorizonOperation>;
}) => {
  const { isTestnet } = useSelector(settingsNetworkDetailsSelector);

  const STELLAR_EXPERT_URL = `https://stellar.expert/explorer/${
    isTestnet ? "testnet" : "public"
  }`;
  return (
    <>
      <HistoryListEl>
        {operations.map((operation: HorizonOperation) => (
          <HistoryItem
            key={operation.id}
            operation={operation}
            publicKey={publicKey}
            url={STELLAR_EXPERT_URL}
          />
        ))}
      </HistoryListEl>
      <FullHistoryBtnEl
        onClick={() => {
          emitMetric(METRIC_NAMES.historyOpenFullHistory);
          openTab(`${STELLAR_EXPERT_URL}/account/${publicKey}`);
        }}
      >
        Check full history on stellar.expert
      </FullHistoryBtnEl>
    </>
  );
};
