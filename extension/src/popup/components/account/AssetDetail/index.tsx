import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { IconButton, Icon } from "@stellar/design-system";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { AccountBalancesInterface, HorizonOperation } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAvailableBalance,
  getIsPayment,
  getIsSwap,
  getStellarExpertUrl,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { navigateTo } from "popup/helpers/navigate";
import { getAssetFromCanonical } from "helpers/stellar";

import { ROUTES } from "popup/constants/routes";

import { PillButton } from "popup/basics/buttons/PillButton";

import {
  historyItemDetailViewProps,
  HistoryItem,
} from "popup/components/accountHistory/HistoryItem";
import { HistoryList } from "popup/components/accountHistory/HistoryList";
import { AssetNetworkInfo } from "popup/components/accountHistory/AssetNetworkInfo";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { saveAsset } from "popup/ducks/transactionSubmission";
import { AppDispatch } from "popup/App";
import { useIsOwnedScamAsset } from "popup/helpers/useIsOwnedScamAsset";
import { InfoBlock } from "popup/basics/InfoBlock";
import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

interface AssetDetailProps {
  assetOperations: Array<HorizonOperation>;
  accountBalances: AccountBalancesInterface;
  networkDetails: NetworkDetails;
  publicKey: string;
  selectedAsset: string;
  setSelectedAsset: (selectedAsset: string) => void;
}

export const AssetDetail = ({
  assetOperations,
  accountBalances,
  networkDetails,
  publicKey,
  selectedAsset,
  setSelectedAsset,
}: AssetDetailProps) => {
  const dispatch: AppDispatch = useDispatch();
  const isNative = selectedAsset === "native";
  const assetCode = getAssetFromCanonical(selectedAsset).code;
  const isOwnedScamAsset = useIsOwnedScamAsset(
    assetCode,
    getAssetFromCanonical(selectedAsset).issuer,
  );

  const balanceKey = Object.keys(accountBalances?.balances || {}).find((k) =>
    k.includes(selectedAsset),
  );
  const balance =
    accountBalances?.balances && balanceKey
      ? accountBalances.balances[balanceKey]
      : null;
  const assetIssuer =
    balance && "issuer" in balance?.token
      ? balance.token.issuer.key.toString()
      : "";
  const balanceTotal = balance?.total
    ? `${new BigNumber(balance?.total).toString()} ${assetCode}`
    : `0 ${assetCode}`;

  const balanceAvailable = getAvailableBalance({
    accountBalances,
    selectedAsset,
  });

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const { t } = useTranslation();

  const defaultDetailViewProps: TransactionDetailProps = {
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );

  const { assetDomain } = useAssetDomain({
    assetIssuer,
  });

  if (!assetOperations) {
    return null;
  }

  if (assetIssuer && !assetDomain) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return null;
  }

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <div className="AssetDetail">
      <div className="AssetDetail__wrapper">
        <SubviewHeader
          title={assetCode}
          customBackAction={() => setSelectedAsset("")}
        />
        {isNative ? (
          <div className="AssetDetail__available">
            <span className="AssetDetail__available__copy">
              {balanceAvailable} {assetCode} {t("available")}
            </span>
            <span
              className="AssetDetail__available__icon"
              onClick={() => setIsModalOpen(true)}
            >
              <IconButton altText="Available Info" icon={<Icon.Info />} />{" "}
            </span>
          </div>
        ) : null}
        <div className="AssetDetail__total">
          <div className="AssetDetail__total__copy">{balanceTotal}</div>
          <div className="AssetDetail__total__network">
            <AssetNetworkInfo
              assetCode={assetCode}
              assetIssuer={assetIssuer}
              assetType={balance?.token.type || ""}
              assetDomain={assetDomain}
            />
          </div>
        </div>
        <div className="AssetDetail__actions">
          {balance?.total && new BigNumber(balance?.total).toNumber() > 0 ? (
            <>
              <PillButton
                onClick={() => {
                  dispatch(saveAsset(selectedAsset));
                  navigateTo(ROUTES.sendPayment);
                }}
              >
                {t("SEND")}
              </PillButton>
              <PillButton
                onClick={() => {
                  dispatch(saveAsset(selectedAsset));
                  navigateTo(ROUTES.swap);
                }}
              >
                {t(" SWAP")}
              </PillButton>
            </>
          ) : null}
        </div>
        <SimpleBar>
          <div className="AssetDetail__scam-warning">
            {isOwnedScamAsset && (
              <InfoBlock variant={InfoBlock.variant.error}>
                <div>
                  <p>
                    This asset was tagged as fraudulent by stellar.expert, a
                    reliable community-maintained directory.
                  </p>
                  <p>
                    Trading or sending this asset is not recommended. Projects
                    related to this asset may be fraudulent even if the creators
                    say otherwise.
                  </p>
                </div>
              </InfoBlock>
            )}
          </div>

          {assetOperations.length ? (
            <HistoryList assetDetail>
              <>
                {assetOperations.map((operation) => {
                  const historyItemOperation = {
                    ...operation,
                    isPayment: getIsPayment(operation.type),
                    isSwap: getIsSwap(operation),
                  };
                  return (
                    <HistoryItem
                      key={operation.id}
                      operation={historyItemOperation}
                      publicKey={publicKey}
                      url={stellarExpertUrl}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  );
                })}
              </>
            </HistoryList>
          ) : (
            <div className="AssetDetail__empty">
              {t("No transactions to show")}
            </div>
          )}
        </SimpleBar>
      </div>
      {isNative && (
        <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
          <div className="AssetDetail__info-modal">
            <div className="AssetDetail__info-modal__total-box">
              <div className="AssetDetail__info-modal__asset-code">
                <img src={StellarLogo} alt="Network icon" />{" "}
                <div>{assetCode}</div>
              </div>
              <div>{balanceTotal}</div>
            </div>
            <div className="AssetDetail__info-modal__available-box">
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Total Balance")}</div>
                <div>{balanceTotal}</div>
              </div>
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Reserved Balance*")}</div>
                {balance?.available && balance?.total ? (
                  <div>
                    {new BigNumber(balanceAvailable)
                      .minus(new BigNumber(balance?.total))
                      .toString()}{" "}
                    {assetCode}
                  </div>
                ) : null}
              </div>
              <div className="AssetDetail__info-modal__total-available-row">
                <div>{t("Total Available")}</div>
                <div>
                  {balanceAvailable} {assetCode}
                </div>
              </div>
            </div>
            <div className="AssetDetail__info-modal__footnote">
              {t(
                "* All Stellar accounts must maintain a minimum balance of lumens.",
              )}{" "}
              <a
                href="https://developers.stellar.org/docs/glossary/minimum-balance/"
                target="_blank"
                rel="noreferrer"
              >
                {t("Learn More")}
              </a>
            </div>
          </div>
        </SlideupModal>
      )}
    </div>
  );
};
