import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QrCode from "qrcode.react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Formik, Field, FieldProps } from "formik";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";

import { Form } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { BackButton } from "popup/basics/Buttons";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BottomNav } from "popup/components/BottomNav";
import {
  accountNameSelector,
  publicKeySelector,
  updateAccountName,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Button, TextLink, Icon, Input } from "@stellar/design-system";

import "./styles.scss";

export const ViewPublicKey = () => {
  const publicKey = useSelector(publicKeySelector);
  const accountName = useSelector(accountNameSelector);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const { network } = useSelector(settingsNetworkDetailsSelector);

  const dispatch = useDispatch();

  interface FormValue {
    accountName: string;
  }

  const initialValues: FormValue = {
    accountName,
  };

  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      await dispatch(updateAccountName(newAccountName));
      emitMetric(METRIC_NAMES.viewPublicKeyAccountRenamed);
    }
    setIsEditingName(false);
  };

  const handleCopy = () => {
    setIsCopied(true);
    emitMetric(METRIC_NAMES.viewPublicKeyCopy);

    const t = setTimeout(() => {
      setIsCopied(false);
      clearTimeout(t);
    }, 1000);
  };

  return (
    <PopupWrapper>
      <div className="ViewPublicKey">
        <BackButton isPopup onClick={() => navigateTo(ROUTES.account)} />
        <div className="ViewPublicKey__header">
          {isEditingName ? (
            <Formik initialValues={initialValues} onSubmit={handleSubmit}>
              <Form className="ViewPublicKey__form">
                <Field name="accountName">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="accountName"
                      placeholder={accountName}
                      {...field}
                    />
                  )}
                </Field>
                <button
                  className="ViewPublicKey--account-name-btn"
                  type="submit"
                >
                  <Icon.Check />
                </button>
              </Form>
            </Formik>
          ) : (
            <>
              <div>{accountName}</div>
              <button
                className="ViewPublicKey--account-name-btn"
                onClick={() => setIsEditingName(true)}
              >
                <Icon.Edit />
              </button>
            </>
          )}
        </div>

        <div className="ViewPublicKey__qr-code">
          <QrCode
            value={publicKey}
            style={{
              width: "10rem",
              height: "10rem",
            }}
          />
        </div>
        <div className="ViewPublicKey__address-copy-label">Wallet Address</div>
        <div className="ViewPublicKey__address-copy">
          {truncatedPublicKey(publicKey)}
        </div>
        <div className="ViewPublicKey__copy-btn">
          <CopyToClipboard text={publicKey} onCopy={() => handleCopy()}>
            <Button disabled={isCopied} variant={Button.variant.tertiary}>
              {isCopied ? "ADDRESS COPIED" : "COPY"}
            </Button>
          </CopyToClipboard>
        </div>
        <div className="ViewPublicKey__external-link">
          <TextLink
            variant={TextLink.variant.secondary}
            iconRight={<Icon.ExternalLink />}
            onClick={() => {
              openTab(
                `https://stellar.expert/explorer/${network.toLowerCase()}/account/${publicKey}`,
              );
              emitMetric(METRIC_NAMES.viewPublicKeyClickedStellarExpert);
            }}
          >
            VIEW ON STELLAR.EXPERT
          </TextLink>
        </div>
      </div>
      <BottomNav />
    </PopupWrapper>
  );
};
