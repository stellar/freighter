import React from "react";
import { Button, CopyText, TextLink } from "@stellar/design-system";

import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BottomNav } from "popup/components/BottomNav";
import { MnemonicDisplay } from "popup/components/mnemonicPhrase/MnemonicDisplay";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

export const DisplayBackupPhrase = () => {
  const mnemonicPhrase = useMnemonicPhrase();

  return (
    <div className="DisplayBackupPhrase">
      <PopupWrapper>
        <SubviewHeader title="Show recovery phrase" />
        <p>
          Anyone who has access to this phrase has access to your account and to
          the funds in it, so save it in a safe and secure place.
        </p>
        <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} isPopupView />
        <CopyText
          showCopyIcon
          showTooltip
          textToCopy={mnemonicPhrase}
          tooltipPosition={CopyText.tooltipPosition.LEFT}
        >
          <TextLink>Copy</TextLink>
        </CopyText>
        <div className="DisplayBackupPhrase--submit">
          <Button fullWidth onClick={() => navigateTo(ROUTES.account)}>
            Done
          </Button>
        </div>
      </PopupWrapper>
      <BottomNav />
    </div>
  );
};
