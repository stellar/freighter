import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Loader } from "@stellar/design-system";

import { getUrlHostname, parsedSearchParam } from "helpers/urls";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ButtonsContainer, ModalWrapper } from "popup/basics/Modal";
import { DomainScanModalInfo } from "popup/components/ModalInfo";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { useScanSite } from "popup/helpers/blockaid";

import "popup/metrics/access";
import "./styles.scss";

export const GrantAccess = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isGranting, setIsGranting] = useState(false);

  const { url } = parsedSearchParam(location.search);
  const domain = getUrlHostname(url);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { scanSite, isLoading, data } = useScanSite();

  useEffect(() => {
    const fetchData = async () => {
      await scanSite(url, networkDetails);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isMalicious =
    data && "is_malicious" in data ? data.is_malicious : false;

  return (
    <>
      <ModalWrapper>
        {isLoading ? (
          <div className="GrantAccess__loader">
            <Loader size="5rem" />
          </div>
        ) : (
          <DomainScanModalInfo
            domain={domain}
            isMalicious={isMalicious}
            scanStatus={data.status}
            subject={t(
              `Allow ${domain} to view your wallet address, balance, activity and request approval for transactions`,
            )}
          >
            <div
              className="GrantAccess__SigningWith"
              data-testid="grant-access-view"
            >
              <h5>Connecting with</h5>
              <div className="GrantAccess__PublicKey">
                <KeyIdenticon publicKey={publicKey} />
              </div>
            </div>
            {isMalicious ? (
              <ButtonsContainer>
                <Button
                  size="md"
                  isFullWidth
                  variant="error"
                  isLoading={isGranting}
                  onClick={() => grantAndClose()}
                >
                  {t("Connect anyway")}
                </Button>
                <Button
                  size="md"
                  isFullWidth
                  variant="tertiary"
                  onClick={rejectAndClose}
                >
                  {t("Reject")}
                </Button>
              </ButtonsContainer>
            ) : (
              <ButtonsContainer>
                <Button
                  size="md"
                  isFullWidth
                  variant="tertiary"
                  onClick={rejectAndClose}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  size="md"
                  isFullWidth
                  variant="secondary"
                  isLoading={isGranting}
                  onClick={() => grantAndClose()}
                >
                  {t("Connect")}
                </Button>
              </ButtonsContainer>
            )}
          </DomainScanModalInfo>
        )}
      </ModalWrapper>
    </>
  );
};
