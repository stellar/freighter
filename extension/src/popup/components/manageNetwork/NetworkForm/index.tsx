import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { useLocation } from "react-router-dom";

import { AppDispatch } from "popup/App";

import { Button } from "popup/basics/buttons/Button";
import { PillButton } from "popup/basics/buttons/PillButton";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { isActiveNetwork } from "helpers/stellar";

import {
  addCustomNetwork,
  changeNetwork,
  removeCustomNetwork,
  settingsNetworkDetailsSelector,
  settingsNetworksListSelector,
} from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { NetworkModal } from "../NetworkModal";

import "./styles.scss";

const CUSTOM_NETWORK = "CUSTOM";

interface FormValues {
  networkName: string;
  networkPassphrase: string;
  networkUrl: string;
  isSwitchSelected?: boolean;
}

interface NetworkFormProps {
  isEditing: boolean;
}

export const NETWORK_INDEX_SEARCH_PARAM = "networkIndex";

export const NetworkForm = ({ isEditing }: NetworkFormProps) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const networksList = useSelector(settingsNetworksListSelector);
  const [isNetworkInUse, setIsNetworkInUse] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const { search } = useLocation();

  const networkIndex = new URLSearchParams(search).get("networkIndex");
  const networkDetailsToEdit = networksList[Number(networkIndex)];

  const initialValues: FormValues = isEditing
    ? { ...networkDetailsToEdit, isSwitchSelected: false }
    : {
        networkName: "",
        networkPassphrase: "",
        networkUrl: "",
        isSwitchSelected: false,
      };

  const NetworkFormSchema = YupObject().shape({
    networkName: YupString().required(),
    networkPassphrase: YupString().required(),
    networkUrl: YupString().required(),
  });

  const handleRemoveNetwork = async () => {
    const res = await dispatch(
      removeCustomNetwork({
        networkName: networkDetailsToEdit.networkName,
      }),
    );

    if (removeCustomNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account);
    }
  };

  const handleEditNetwork = async (values: FormValues) => {
    const res = await dispatch(changeNetwork(values));
    if (changeNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account);
    }
  };

  const handleAddNetwork = async (values: FormValues) => {
    const res = await dispatch(
      addCustomNetwork({
        customNetwork: {
          ...values,
          network: CUSTOM_NETWORK,
          isSwitchSelected: !!values.isSwitchSelected,
        },
      }),
    );
    if (addCustomNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account);
    }
  };

  const handleSubmit = (values: FormValues) => {
    if (isEditing) {
      handleEditNetwork(values);
    } else {
      handleAddNetwork(values);
    }
  };

  const CloseModalButton = () => (
    <Button
      type="button"
      fullWidth
      variant={Button.variant.tertiary}
      onClick={() => setIsNetworkInUse(false)}
    >
      {t("Got it")}
    </Button>
  );

  const ConfirmRemovalButtons = () => (
    <div className="NetworkForm__removal-buttons">
      <Button
        type="button"
        variant={Button.variant.tertiary}
        onClick={() => setIsConfirmingRemoval(false)}
      >
        {t("Cancel")}
      </Button>
      <Button
        type="button"
        variant={Button.variant.tertiary}
        onClick={() => {
          handleRemoveNetwork();
        }}
      >
        {t("Remove")}
      </Button>
    </div>
  );

  return (
    <div className="NetworkForm">
      {isNetworkInUse ? (
        <NetworkModal buttonComponent={<CloseModalButton />}>
          <div>
            <div className="NetworkForm__modal__title">
              {t("Network name is in use")}
            </div>
            <div className="NetworkForm__modal__body">
              {t("Please select a different network.")}
            </div>
          </div>
        </NetworkModal>
      ) : null}
      {isConfirmingRemoval ? (
        <NetworkModal buttonComponent={<ConfirmRemovalButtons />}>
          <div>
            <div className="NetworkForm__modal__title">
              {t("Confirm removing Network")}
            </div>
            <div className="NetworkForm__modal__body">
              {t(
                "Are you sure you want to remove this network? You will have to re-add it if you want to use it again.",
              )}
            </div>
          </div>
        </NetworkModal>
      ) : null}
      <SubviewHeader
        title={isEditing ? t("Add Custom Network") : t("Network Details")}
      />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={NetworkFormSchema}
      >
        {({ dirty, errors, isSubmitting, isValid, touched }) => (
          <Form className="DisplayBackupPhrase__form">
            <Input
              id="networkName"
              autoComplete="off"
              error={
                errors.networkName && touched.networkName
                  ? errors.networkName
                  : ""
              }
              customInput={<Field />}
              label={t("Name")}
              name="networkName"
              placeholder={t("Enter network name")}
            />
            <Input
              id="networkUrl"
              autoComplete="off"
              error={
                errors.networkUrl && touched.networkUrl ? errors.networkUrl : ""
              }
              customInput={<Field />}
              label={t("URL")}
              name="networkUrl"
              placeholder={t("Enter network URL")}
            />
            <Input
              id="networkPassphrase"
              autoComplete="off"
              error={
                errors.networkPassphrase && touched.networkPassphrase
                  ? errors.networkPassphrase
                  : ""
              }
              customInput={<Field />}
              label={t("Passphrase")}
              name="networkPassphrase"
              placeholder={t("Enter passphrase")}
            />
            {isEditing ? (
              <PillButton
                type="button"
                onClick={() => {
                  if (isActiveNetwork(networkDetailsToEdit, networkDetails)) {
                    setIsNetworkInUse(true);
                  } else {
                    setIsConfirmingRemoval(true);
                  }
                }}
              >
                {t("Remove")}
              </PillButton>
            ) : (
              <Field name="isSwitchSelected">
                {({ field }: FieldProps) => (
                  <Checkbox
                    autoComplete="off"
                    id="isSwitchSelected-input"
                    error={
                      errors.isSwitchSelected && touched.isSwitchSelected
                        ? errors.isSwitchSelected
                        : null
                    }
                    label={<span>{t("Switch to this network")}</span>}
                    {...field}
                  />
                )}
              </Field>
            )}
            {isEditing ? (
              <Button
                disabled={!isValid}
                fullWidth
                isLoading={isSubmitting}
                type="submit"
                variant={Button.variant.tertiary}
              >
                {t("Add network")}
              </Button>
            ) : (
              <Button
                disabled={!(isValid && dirty)}
                fullWidth
                isLoading={isSubmitting}
                type="submit"
                variant={Button.variant.tertiary}
              >
                {t("Add network")}
              </Button>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};
