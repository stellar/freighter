import React from "react";
import { useSelector } from "react-redux";
import { Redirect } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

export const ChooseAsset = () => {
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  console.log(accountBalances);

  if (!accountBalances.balances) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.account,
        }}
      />
    );
  }

  const balances = sortBalances(accountBalances.balances);
  console.log(balances);

  return (
    <div className="ChooseAsset">
      <PopupWrapper>
        <SubviewHeader title="Choose Asset" />
        {balances.map(({ token: { code } }) => (
          <div className="ChooseAsset__row">
            <div key={code}>{code}</div>
            <div className="ChooseAsset__row__button">REMOVE</div>
          </div>
        ))}
      </PopupWrapper>
    </div>
  );
};
