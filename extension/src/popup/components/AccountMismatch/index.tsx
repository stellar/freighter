import React from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { isAccountMismatchSelector } from "popup/ducks/accountServices";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import "./styles.scss";

export const AccountMismatch = () => {
  const { t } = useTranslation();
  const isAccountMismatch = useSelector(isAccountMismatchSelector);

  return isAccountMismatch
    ? createPortal(
        <>
          <div className="AccountMismatch__notification">
            <View.Content hasNoTopPadding hasNoBottomPadding>
              <div className="AccountMismatch__notification__content">
                <div>
                  <Notification
                    title={t(
                      "Your session with this public key has ended. Please refresh the browser.",
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
      )
    : null;
};
