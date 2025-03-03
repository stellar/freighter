import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import {
  useGetOnrampToken,
  RequestState,
} from "helpers/hooks/useGetOnrampToken";
import { useOnramp } from "popup/helpers/useOnramp";

import "./styles.scss";

export const Buy = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const [asset, setAsset] = useState("XLM");
  const { state: onrampTokenState, fetchData } = useGetOnrampToken(publicKey);

  const { tokenError } = useOnramp({ onrampTokenState, asset });

  const handleOnrampClick = async () => {
    await fetchData();
  };

  const isLoaderShowing = onrampTokenState.state === RequestState.LOADING;

  if (isLoaderShowing) {
    return <Loading />;
  }

  return (
    <>
      <SubviewHeader title={t("Buy with Coinbase")} />
      <View.Content>
        <div className="Buy__content">
          <Button
            data-testid="xlm-buy-button"
            iconPosition="left"
            isFullWidth
            size="lg"
            variant="secondary"
            onClick={() => {
              setAsset("XLM");
              handleOnrampClick();
            }}
          >
            {t("Buy XLM on Coinbase")}
          </Button>
          <Button
            data-testid="usdc-buy-button"
            iconPosition="left"
            isFullWidth
            size="lg"
            variant="secondary"
            onClick={() => {
              setAsset("USDC");
              handleOnrampClick();
            }}
          >
            {t("Buy USDC on Coinbase")}
          </Button>
          {tokenError && <div className="Buy__error">{tokenError}</div>}
        </div>
      </View.Content>
    </>
  );
};
