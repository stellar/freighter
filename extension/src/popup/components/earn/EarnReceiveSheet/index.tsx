import React from "react";
import { useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import { Button, Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { showToast } from "popup/basics/shadcn/Toast";
import { publicKeySelector } from "popup/ducks/accountServices";
import VarialMarkQr from "popup/assets/varial-mark-qr.svg";

import "./styles.scss";

interface EarnReceiveSheetProps {
  /** Back to the sheet that offered Receive. */
  onBack: () => void;
  /** Closes the whole sheet. */
  onClose: () => void;
}

/**
 * The account's address as a QR code, for funding a deposit by transfer.
 *
 * Opened from the "Not enough" and network-fee sheets, as on mobile: it takes
 * over the sheet that offered it, whose back arrow returns there and whose X
 * closes both. A sheet body rather than a sheet of its own because
 * SlideupModals do not nest.
 */
export const EarnReceiveSheet = ({
  onBack,
  onClose,
}: EarnReceiveSheetProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);

  // As ViewPublicKey copies it: the metric only once the write succeeds, and
  // never the key itself.
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      emitMetric(METRIC_NAMES.accountPublicKeyCopied);
      showToast(() => (
        <Notification
          variant="success"
          title={t("Address {{address}} copied!", {
            address: truncatedPublicKey(publicKey),
          })}
        />
      ));
    } catch {
      showToast(() => (
        <Notification
          variant="error"
          title={t("Couldn’t copy your wallet address")}
        />
      ));
    }
  };

  return (
    <div className="EarnReceiveSheet" data-testid="earn-receive-sheet">
      <div className="EarnReceiveSheet__header">
        <button
          type="button"
          className="EarnReceiveSheet__icon-button"
          onClick={onBack}
          aria-label={t("Back")}
          data-testid="earn-receive-back"
        >
          <Icon.ArrowLeft />
        </button>
        <div className="EarnReceiveSheet__title">{t("Receive funds")}</div>
        <button
          type="button"
          className="EarnReceiveSheet__icon-button"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-receive-close"
        >
          <Icon.X />
        </button>
      </div>

      {/* Black on white in both themes, so any camera reads it. The mark in
          the middle is knocked out of the modules, which level H's error
          correction covers. */}
      <div className="EarnReceiveSheet__qr">
        <QRCodeSVG
          value={publicKey}
          size={240}
          level="H"
          marginSize={1}
          imageSettings={{
            src: VarialMarkQr,
            width: 62,
            height: 62,
            excavate: true,
          }}
        />
      </div>

      <div className="EarnReceiveSheet__caption">
        {t("This address supports Stellar network.")}
      </div>

      <Button
        size="lg"
        variant="secondary"
        isFullWidth
        isRounded
        icon={<Icon.Copy01 />}
        iconPosition="left"
        onClick={copyAddress}
        data-testid="earn-receive-copy"
      >
        {t("Copy address")}
      </Button>
    </div>
  );
};
