import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import { getUrlHostname, parsedSearchParam } from "helpers/urls";

import { rejectAccess, grantAccess } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/accountServices";

import { ButtonsContainer, ModalWrapper } from "popup/basics/Modal";

import { ModalInfo } from "popup/components/ModalInfo";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import "popup/metrics/access";
import "./styles.scss";

export const GrantAccess = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isGranting, setIsGranting] = useState(false);

  const { tab, url } = parsedSearchParam(location.search);

  const title = tab && tab.title ? tab.title : "";

  const domain = getUrlHostname(url);
  const publicKey = useSelector(publicKeySelector);

  const rejectAndClose = () => {
    dispatch(rejectAccess());
    window.close();
  };

  const grantAndClose = async () => {
    setIsGranting(true);
    // eslint-disable-next-line
    await dispatch(grantAccess(url));
    window.close();
  };

  return (
    <>
      <ModalWrapper>
        <ModalInfo
          domain={domain}
          domainTitle={title}
          subject={t(
            `Allow ${domain} to view your wallet address, balance, activity and request approval for transactions`,
          )}
        >
          <div className="GrantAccess__SigningWith">
            <h5>Connecting with</h5>
            <div className="GrantAccess__PublicKey">
              <KeyIdenticon publicKey={publicKey} />
            </div>
          </div>
          <ButtonsContainer>
            <Button
              size="md"
              isFullWidth
              variant="secondary"
              onClick={rejectAndClose}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="md"
              isFullWidth
              variant="tertiary"
              isLoading={isGranting}
              onClick={() => grantAndClose()}
            >
              {t("Connect")}
            </Button>
          </ButtonsContainer>
        </ModalInfo>
      </ModalWrapper>
    </>
  );
};
