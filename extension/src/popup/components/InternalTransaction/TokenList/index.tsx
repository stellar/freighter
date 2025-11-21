import React from "react";
import { useTranslation } from "react-i18next";
import BigNumber from "bignumber.js";

import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { getCanonicalFromAsset } from "helpers/stellar";
import { ApiTokenPrices, AssetIcons } from "@shared/api/types";
import { getAvailableBalance } from "popup/helpers/soroban";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { title } from "helpers/transaction";

import "./styles.scss";

interface TokenListProps {
  hiddenAssets?: string[];
  icons: AssetIcons;
  tokens: AssetType[];
  tokenPrices: ApiTokenPrices;
  onClickAsset: (canonical: string, isContract: boolean) => unknown;
}

export const TokenList = ({
  hiddenAssets = [],
  icons,
  tokens,
  tokenPrices,
  onClickAsset,
}: TokenListProps) => {
  const { t } = useTranslation();
  return (
    <div className="TokenList__Assets">
      {!tokens.length ? (
        <div className="TokenList__Assets__empty">
          {t("You have no assets added. Get started by adding an asset.")}
        </div>
      ) : (
        <>
          <div className="TokenList__Assets__Header">{t("Your Tokens")}</div>
          {tokens
            .filter(
              (
                balance,
              ): balance is Exclude<AssetType, LiquidityPoolShareAsset> =>
                !("liquidityPoolId" in balance),
            )
            .filter((balance) => {
              const { code } = balance.token;
              const issuerKey =
                "issuer" in balance.token
                  ? balance.token.issuer.key
                  : undefined;
              const canonical = getCanonicalFromAsset(code, issuerKey);
              return !hiddenAssets.includes(canonical);
            })
            .map((balance) => {
              const { code } = balance.token;
              const issuerKey =
                "issuer" in balance.token
                  ? balance.token.issuer.key
                  : undefined;
              const isContract = "contractId" in balance;
              const canonical = getCanonicalFromAsset(code, issuerKey);
              const icon = icons[canonical];
              const availableBalance = getAvailableBalance({
                assetCanonical: canonical,
                balances: [balance],
                recommendedFee: "0",
              });
              const displayTotal =
                "decimals" in balance
                  ? availableBalance
                  : formatAmount(availableBalance);
              const usdValue = tokenPrices[canonical];
              return (
                <div
                  data-testid={`SendRow-${canonical}`}
                  className="TokenList__AssetRow"
                  onClick={() => onClickAsset(canonical, isContract)}
                >
                  <div className="TokenList__AssetRow__Body">
                    <AssetIcon
                      assetIcons={code !== "XLM" ? { [canonical]: icon } : {}}
                      code={code}
                      issuerKey={issuerKey!}
                      icon={icon}
                      isSuspicious={false}
                    />
                    <div className="TokenList__AssetRow__Title">
                      <div className="TokenList__AssetRow__Title__Heading">
                        {title(balance)}
                      </div>
                      <div
                        className="TokenList__AssetRow__Title__Total"
                        data-testid={`${code}-balance`}
                      >
                        {displayTotal}
                      </div>
                    </div>
                  </div>
                  <div className="TokenList__AssetRow__UsdValue">
                    {usdValue && usdValue.currentPrice
                      ? `$${formatAmount(
                          roundUsdValue(
                            new BigNumber(usdValue.currentPrice)
                              .multipliedBy(balance.total)
                              .toString(),
                          ),
                        )}`
                      : "--"}
                  </div>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
};
