import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QrCode from "qrcode.react";
import { Formik, Field, FieldProps, Form, useFormikContext } from "formik";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { openTab } from "popup/helpers/navigate";
import { BackButton } from "popup/basics/BackButton";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BottomNav } from "popup/components/BottomNav";
import {
  accountNameSelector,
  publicKeySelector,
  updateAccountName,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  Button,
  TextLink,
  Icon,
  Input,
  CopyText,
} from "@stellar/design-system";

import "./styles.scss";

export const ViewPublicKey = () => {
  const publicKey = useSelector(publicKeySelector);
  const accountName = useSelector(accountNameSelector);
  const [isEditingName, setIsEditingName] = useState(false);
  const { network } = useSelector(settingsNetworkDetailsSelector);

  const EditNameButton = () => {
    const { submitForm } = useFormikContext();

    return isEditingName ? (
      <button onClick={() => submitForm()}>
        <Icon.Check />
      </button>
    ) : (
      <button onClick={() => setIsEditingName(true)}>
        <Icon.Edit />
      </button>
    );
  };

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

  return (
    <>
      <PopupWrapper>
        <div className="ViewPublicKey">
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            <div className="ViewPublicKey__header">
              <BackButton />
              {isEditingName ? (
                <>
                  <div className="ViewPublicKey--account-name-div"></div>

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
                  </Form>
                </>
              ) : (
                <>
                  <div className="ViewPublicKey--account-name-div"></div>
                  <div className="ViewPublicKey__account-name-display">
                    {accountName}
                  </div>
                </>
              )}
              <div className="ViewPublicKey--account-name-div">
                <EditNameButton />
              </div>
            </div>
          </Formik>

          <div className="ViewPublicKey__qr-code">
            <QrCode
              value={publicKey}
              style={{
                width: "10rem",
                height: "10rem",
              }}
            />
          </div>
          <div className="ViewPublicKey__address-copy-label">
            Wallet Address
          </div>
          <div className="ViewPublicKey__address-copy">
            {truncatedPublicKey(publicKey)}
          </div>
          <div className="ViewPublicKey__copy-btn">
            <CopyText textToCopy={publicKey} doneLabel="ADDRESS COPIED">
              <Button variant={Button.variant.tertiary}>COPY</Button>
            </CopyText>
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
      </PopupWrapper>
      <BottomNav />
    </>
  );
};
