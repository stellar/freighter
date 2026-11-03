import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";

import { newTabHref } from "helpers/urls";
import { AppDispatch } from "popup/App";
import { InfoBottomSheet } from "popup/components/InfoBottomSheet";
import { ROUTES } from "popup/constants/routes";
import { resetWallet } from "popup/ducks/accountServices";
import { isSidebarMode } from "popup/helpers/isSidebarMode";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { SheetHeaderLayout } from "popup/components/SheetHeader";

import "./styles.scss";

interface ForgotPasswordSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lock screen's "Forgot your password?" sheet. "Reset wallet" erases the
 * wallet from the extension (app settings are kept) and opens the fullscreen
 * Welcome screen in a new tab, where the user creates or imports a wallet.
 * The side panel then closes itself, and the toolbar popup closes on its own
 * when the new tab takes focus. A full-page tab, or Firefox's sidebar (where
 * window.close() does nothing), stays on the lock screen; after the new
 * wallet is set up, its password unlocks it.
 */
export const ForgotPasswordSheet = ({
  isOpen,
  onClose,
}: ForgotPasswordSheetProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [isResetting, setIsResetting] = useState(false);
  const [hasResetFailed, setHasResetFailed] = useState(false);

  const handleClose = () => {
    setHasResetFailed(false);
    onClose();
  };

  const handleReset = async () => {
    setIsResetting(true);
    setHasResetFailed(false);
    const result = await dispatch(resetWallet());
    setIsResetting(false);

    if (resetWallet.rejected.match(result)) {
      setHasResetFailed(true);
      return;
    }

    onClose();
    // Awaited so the panel isn't closed while the tab is still being created.
    await openTab(newTabHref(ROUTES.welcome));
    // A popup closes itself when the new tab takes focus; the side panel
    // doesn't, and would be left on the lock screen of an erased wallet.
    if (isSidebarMode()) {
      closeWindow();
    }
  };

  return (
    <InfoBottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      data-testid="forgot-password-sheet"
      closeTestId="forgot-password-sheet-close"
      actionTestId="forgot-password-sheet-reset"
      headerLayout={SheetHeaderLayout.Stacked}
      title={t("Forgot your password?")}
      actionLabel={t("Reset wallet")}
      actionVariant="destructive"
      onAction={handleReset}
      isActionLoading={isResetting}
    >
      {/* Divs, not <p>: global.scss forces `p { color: inherit !important }`
          under the SDS themes, which would override the error color. */}
      <div className="ForgotPasswordSheet__body">
        <div>
          {t(
            "Your password is stored only on this device and can’t be recovered.",
          )}
        </div>
        <div>
          {t(
            "You can reset Varial with your recovery phrase, set a new password, and re-import.",
          )}
        </div>
        <div className="ForgotPasswordSheet__reminder">
          {t("Make sure you have your recovery phrase before continuing.")}
        </div>
        {hasResetFailed && (
          <div className="ForgotPasswordSheet__error" role="alert">
            {t("Couldn’t reset your wallet. Try again.")}
          </div>
        )}
      </div>
    </InfoBottomSheet>
  );
};
