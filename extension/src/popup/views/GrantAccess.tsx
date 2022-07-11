import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getUrlHostname, parsedSearchParam } from "helpers/urls";

import { Button } from "popup/basics/buttons/Button";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/accountServices";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { ModalInfo } from "popup/components/ModalInfo";
import { FirstTimeWarningMessage } from "popup/components/WarningMessages";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import "popup/metrics/access";

export const GrantAccess = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isGranting, setIsGranting] = useState(false);

  const {
    tab: { title = "" },
    url,
  } = parsedSearchParam(location.search);

  const domain = getUrlHostname(url);
  const publicKey = useSelector(publicKeySelector);

  const rejectAndClose = () => {
    dispatch(rejectAccess());
    window.close();
  };

  const grantAndClose = async () => {
    setIsGranting(true);
    await dispatch(grantAccess(url));
    window.close();
  };

  return (
    <>
      <ModalWrapper>
        <ModalHeader>
          <strong>{t("Share Public Key")}</strong>
        </ModalHeader>
        <FirstTimeWarningMessage />
        <ModalInfo
          domain={domain}
          domainTitle={title}
          subject={`${t("This website wants to know your public key")}:`}
        >
          <KeyIdenticon publicKey={publicKey} />
        </ModalInfo>
      </ModalWrapper>
      <ButtonsContainer>
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={rejectAndClose}
        >
          {t("Reject")}
        </Button>
        <Button
          fullWidth
          isLoading={isGranting}
          onClick={() => grantAndClose()}
        >
          {t("Share")}
        </Button>
      </ButtonsContainer>
    </>
  );
};
