import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, CopyText, Icon } from "@stellar/design-system";

import { Account } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { truncatedPublicKey } from "helpers/stellar";

import "./styles.scss";

interface WalletRowProps {
  accountName: string;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
  setOptionsOpen: (publicKey: string) => unknown;
}

const WalletRow = ({
  accountName,
  publicKey,
  setOptionsOpen,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  return (
    <div className="WalletRow">
      <div className="WalletRow__identicon">
        <div className="identicon-wrapper">
          <IdenticonImg publicKey={publicKey} />
        </div>
      </div>
      <div className="WalletRow__details">
        <p className="detail-name">{accountName}</p>
        <p className="detail-short-key">{shortPublicKey}</p>
      </div>
      <div
        className="WalletRow__options"
        onClick={() => setOptionsOpen(publicKey)}
      >
        <img src={IconEllipsis} alt="wallet action options" />
      </div>
    </div>
  );
};

interface WalletsProps {
  activePublicKey: string;
  allAccounts: Account[];
  close: () => void;
}

export const Wallets = ({
  activePublicKey,
  allAccounts,
  close,
}: WalletsProps) => {
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [activeOptionsPublicKey, setActiveOptionsPublicKey] =
    React.useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        activeOptionsRef.current &&
        !activeOptionsRef.current.contains(event.target as Node)
      ) {
        setActiveOptionsPublicKey("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeOptionsRef]);

  return (
    <React.Fragment>
      <SubviewHeader
        title="Wallets"
        customBackAction={close}
        customBackIcon={<Icon.XClose />}
      />
      <View.Content
        hasNoTopPadding
        contentFooter={
          <Button
            size="md"
            isFullWidth
            isRounded
            variant="secondary"
            iconPosition="left"
            icon={<Icon.PlusCircle />}
            onClick={() => {}}
          >
            {t("Add a wallet")}
          </Button>
        }
      >
        <div>
          {allAccounts.map(
            ({ publicKey, name, imported, hardwareWalletType }) => {
              const isSelected = activePublicKey === publicKey;
              console.log(imported, hardwareWalletType);

              return (
                <>
                  <WalletRow
                    accountName={name}
                    publicKey={publicKey}
                    isSelected={isSelected}
                    onClick={(publicKey) => console.log(publicKey)}
                    setOptionsOpen={setActiveOptionsPublicKey}
                  />
                  {activeOptionsPublicKey === publicKey ? (
                    <div
                      className="WalletRow__options-actions"
                      ref={activeOptionsRef}
                    >
                      <div className="WalletRow__options-actions__row">
                        <CopyText textToCopy={publicKey}>
                          <div className="action-copy">
                            <div className="WalletRow__options-actions__label">
                              Copy address
                            </div>
                            <Icon.Copy01 />
                          </div>
                        </CopyText>
                      </div>
                    </div>
                  ) : null}
                </>
              );
            },
          )}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
