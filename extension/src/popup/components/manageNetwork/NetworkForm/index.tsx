import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { useHistory, useLocation } from "react-router-dom";

import { AppDispatch } from "popup/App";

import { Button } from "popup/basics/buttons/Button";
import { PillButton } from "popup/basics/buttons/PillButton";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { isActiveNetwork, isMainnet, isTestnet } from "helpers/stellar";

import {
  addCustomNetwork,
  changeNetwork,
  clearSettingsError,
  editCustomNetwork,
  removeCustomNetwork,
  settingsErrorSelector,
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
  const settingsError = useSelector(settingsErrorSelector);
  const [isNetworkInUse, setIsNetworkInUse] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const history = useHistory();
  const { search } = useLocation();

  const networkIndex = new URLSearchParams(search).get("networkIndex");
  const networkDetailsToEdit = networksList[Number(networkIndex)];
  const isCurrentNetworkActive = isActiveNetwork(
    networkDetailsToEdit,
    networkDetails,
  );
  const isMainnetOrTestnet =
    isMainnet(networkDetailsToEdit) || isTestnet(networkDetailsToEdit);

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
    if (isCurrentNetworkActive) {
      setIsNetworkInUse(true);
    } else {
      const res = await dispatch(
        editCustomNetwork({
          networkDetails: { ...values, network: CUSTOM_NETWORK },
          networkIndex: Number(networkIndex),
        }),
      );
      if (editCustomNetwork.fulfilled.match(res)) {
        navigateTo(ROUTES.account);
      }
    }
  };

  const handleAddNetwork = async (values: FormValues) => {
    const addCustomNetworkRes = await dispatch(
      addCustomNetwork({
        networkDetails: {
          ...values,
          network: CUSTOM_NETWORK,
        },
      }),
    );

    const addCustomNetworkFulfilled = addCustomNetwork.fulfilled.match(
      addCustomNetworkRes,
    );
    let changeNetworkFulfilled = true;

    if (values.isSwitchSelected) {
      changeNetworkFulfilled = false;

      const changeNetworkRes = await dispatch(
        changeNetwork({
          networkName: values.networkName,
        }),
      );
      changeNetworkFulfilled = changeNetwork.fulfilled.match(changeNetworkRes);
    }

    if (addCustomNetworkFulfilled && changeNetworkFulfilled) {
      clearSettingsError();
      navigateTo(ROUTES.account);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (isEditing) {
      await handleEditNetwork(values);
    } else {
      await handleAddNetwork(values);
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
        fullWidth
        type="button"
        variant={Button.variant.tertiary}
        onClick={() => setIsConfirmingRemoval(false)}
      >
        {t("Cancel")}
      </Button>
      <div className="NetworkForm__remove-button">
        <Button
          fullWidth
          type="button"
          onClick={() => {
            handleRemoveNetwork();
          }}
        >
          {t("Remove")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="NetworkForm">
      {isNetworkInUse ? (
        <NetworkModal buttonComponent={<CloseModalButton />}>
          <div>
            <div className="NetworkForm__modal__title">
              {t("Network is in use")}
            </div>
            <div className="NetworkForm__modal__body">
              {t("Please select a different network.")}
            </div>
          </div>
        </NetworkModal>
      ) : null}
      {isConfirmingRemoval ? (
        <NetworkModal
          isConfirmation
          buttonComponent={<ConfirmRemovalButtons />}
        >
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
          <Form className="NetworkForm__form">
            <Input
              id="networkName"
              autoComplete="off"
              error={
                settingsError ||
                (errors.networkName && touched.networkName
                  ? errors.networkName
                  : "")
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
              <div className="NetworkForm__remove-wrapper">
                {!isMainnetOrTestnet && (
                  <PillButton
                    type="button"
                    onClick={() => {
                      if (isCurrentNetworkActive) {
                        setIsNetworkInUse(true);
                      } else {
                        setIsConfirmingRemoval(true);
                      }
                    }}
                  >
                    {t("Remove")}
                  </PillButton>
                )}
              </div>
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
              <div className="NetworkForm__editing-buttons">
                <Button
                  onClick={() => history.goBack()}
                  type="button"
                  variant={Button.variant.tertiary}
                  fullWidth
                >
                  {t("Cancel")}
                </Button>
                <Button
                  disabled={!isValid || isMainnetOrTestnet}
                  isLoading={isSubmitting}
                  fullWidth
                  type="submit"
                >
                  {t("Save")}
                </Button>
              </div>
            ) : (
              <div className="NetworkForm__add-button">
                <Button
                  disabled={!(isValid && dirty) || isMainnetOrTestnet}
                  fullWidth
                  isLoading={isSubmitting}
                  type="submit"
                >
                  {t("Add network")}
                </Button>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};
