import React from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  isAccountMismatchSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { truncatedPublicKey } from "helpers/stellar";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const AccountMismatch = () => {
  const { t } = useTranslation();
  const isAccountMismatch = useSelector(isAccountMismatchSelector);
  const publicKey = useSelector(publicKeySelector);

  if (isAccountMismatch) {
    return createPortal(
      <>
        <div
          className="AccountMismatch__notification"
          data-testid="account-mismatch"
        >
          <View.Content hasNoTopPadding hasNoBottomPadding>
            <div className="AccountMismatch__notification__content">
              <div>
                <Notification
                  title={t(
                    `Your session with the public key ${truncatedPublicKey(publicKey)} has ended. Please refresh the browser.`,
                  )}
                  variant="warning"
                />
              </div>
            </div>
          </View.Content>
        </div>
        <LoadingBackground isActive isFullScreen isOpaque />,
      </>,

      document.querySelector("#modal-root")!,
    );
  }

  return null;
};
