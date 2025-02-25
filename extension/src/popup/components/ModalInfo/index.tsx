import React from "react";
import classNames from "classnames";
import { Card, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { AssetIcon } from "popup/components/account/AccountAssets";
import IconShieldPlus from "popup/assets/icon-shield-plus.svg";
import { AssetIcons } from "@shared/api/types";

import { BlockAidSiteScanLabel } from "../WarningMessages";

import "./styles.scss";

export type PillType = "Connection" | "Trustline" | "Transaction";

interface PillyCopyProps {
  pillType: PillType;
}

const PillCopy = ({ pillType }: PillyCopyProps) => {
  const { t } = useTranslation();

  if (pillType === "Transaction") {
    return (
      <>
        <Icon.Link01 />
        <div>{t("Transaction Request")}</div>
      </>
    );
  }

  if (pillType === "Trustline") {
    return (
      <>
        <img src={IconShieldPlus} alt="Add trustline icon" />
        <div>{t("Add Asset trustline")}</div>
      </>
    );
  }

  return (
    <>
      <Icon.Link01 />
      <div>{t("Connection Request")}</div>
    </>
  );
};

interface ModalInfoProps {
  children: React.ReactNode;
  code: string;
  issuer: string;
  image: string;
  pillType: PillType;
  domain: string;
  asset: string;
  assetIcons: AssetIcons;
  variant?: "default" | "malicious";
}

export const ModalInfo = ({
  children,
  code,
  issuer,
  image,
  pillType,
  domain,
  asset,
  variant = "default",
  assetIcons,
}: ModalInfoProps) => {
  const cardClasses = classNames("ModalInfo--card", {
    Malicious: variant === "malicious",
  });

  return (
    <div className={cardClasses}>
      <Card>
        <div className="ModalInfo__icon">
          <AssetIcon
            assetIcons={assetIcons}
            icon={image}
            code={code}
            issuerKey={issuer}
            isSuspicious={false}
            isModal
          />
        </div>
        <div className="ModalInfo__asset">{asset}</div>
        <div className="ModalInfo__domain">{domain}</div>
        <div className="ModalInfo--connection-request">
          <div className="ModalInfo--connection-request-pill">
            <PillCopy pillType={pillType} />
          </div>
        </div>
        {children}
      </Card>
    </div>
  );
};

interface DomainScanModalInfoProps {
  children: React.ReactNode;
  domain: string;
  subject: string;
  isMalicious: boolean;
  scanStatus: "hit" | "miss";
}

export const DomainScanModalInfo = ({
  children,
  domain,
  subject,
  isMalicious,
  scanStatus,
}: DomainScanModalInfoProps) => (
  <div className="ModalInfo--card">
    <Card variant="secondary">
      <PunycodedDomain domain={domain} />
      <div className="ModalInfo--connection-request">
        <div className="ModalInfo--connection-request-pill">
          <Icon.Link01 />
          <p>Connection Request</p>
        </div>
      </div>
      <BlockAidSiteScanLabel isMalicious={isMalicious} status={scanStatus} />
      <div className="ModalInfo--subject">{subject}</div>
      {children}
    </Card>
  </div>
);
