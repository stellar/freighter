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
import { isNetworkUrlValid as isNetworkUrlValidHelper } from "popup/helpers/account";
import { CUSTOM_NETWORK, isActiveNetwork } from "helpers/stellar";

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
  const [isNetworkUrlValid, setIsNetworkUrlValid] = useState(false);
  const [invalidUrl, setInvalidUrl] = useState("");
  const history = useHistory();
  const { search } = useLocation();

  const networkIndex = Number(
    new URLSearchParams(search).get(NETWORK_INDEX_SEARCH_PARAM),
  );
  const networkDetailsToEdit = networksList[networkIndex];
  const isCurrentNetworkActive = isActiveNetwork(
    networkDetailsToEdit,
    networkDetails,
  );
  const isEditingMainnetOrTestnet =
    isEditing && (networkIndex === 0 || networkIndex === 1);

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

  const showNetworkUrlInvalidModal = (networkUrl: string) => {
    setIsNetworkUrlValid(true);
    setInvalidUrl(networkUrl);
  };

  const getCustomNetworkDetailsFromFormValues = (values: FormValues) => {
    const { networkName, networkUrl, networkPassphrase } = values;

    return {
      network: CUSTOM_NETWORK,
      networkName,
      networkUrl,
      networkPassphrase,
    };
  };

  const handleEditNetwork = async (values: FormValues) => {
    if (!isNetworkUrlValidHelper(values.networkUrl)) {
      showNetworkUrlInvalidModal(values.networkUrl);
      return;
    }

    const res = await dispatch(
      editCustomNetwork({
        networkDetails: getCustomNetworkDetailsFromFormValues(values),
        networkIndex,
      }),
    );
    if (editCustomNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account);
    }
  };

  const handleAddNetwork = async (values: FormValues) => {
    if (!isNetworkUrlValidHelper(values.networkUrl)) {
      showNetworkUrlInvalidModal(values.networkUrl);
      return;
    }

    const addCustomNetworkRes = await dispatch(
      addCustomNetwork({
        networkDetails: getCustomNetworkDetailsFromFormValues(values),
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
      history.goBack();
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
      onClick={() => {
        setIsNetworkInUse(false);
        setIsNetworkUrlValid(false);
      }}
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

  interface EditingButtonsProps {
    isValid: boolean;
    isSubmitting: boolean;
  }

  const EditingButtons = ({ isValid, isSubmitting }: EditingButtonsProps) =>
    !isEditingMainnetOrTestnet ? (
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
          disabled={!isValid}
          isLoading={isSubmitting}
          fullWidth
          type="submit"
        >
          {t("Save")}
        </Button>
      </div>
    ) : null;

  return (
    <div className="NetworkForm">
      {isNetworkInUse ? (
        <NetworkModal buttonComponent={<CloseModalButton />}>
          <div>
            <div className="NetworkForm__modal__title">
              {t("Network is in use")}
            </div>
            <div className="NetworkForm__modal__body">
              {t("Please select a different network before removing it.")}
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
      {isNetworkUrlValid ? (
        <NetworkModal buttonComponent={<CloseModalButton />}>
          <div>
            <div className="NetworkForm__modal__title">
              {t("CONNECTION ERROR")}
            </div>
            <div className="NetworkForm__modal__body">
              {t("Unable to connect to")} <em>{invalidUrl}</em>
            </div>
            <div className="NetworkForm__modal__body">
              {t(
                "Please check if the network information is correct and try again. Alternatively, this network may not be operational.",
              )}{" "}
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
              disabled={isEditingMainnetOrTestnet}
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
              disabled={isEditingMainnetOrTestnet}
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
              disabled={isEditingMainnetOrTestnet}
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
                {!isEditingMainnetOrTestnet && (
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
              <EditingButtons isValid={isValid} isSubmitting={isSubmitting} />
            ) : (
              <div className="NetworkForm__add-button">
                <Button
                  disabled={!(isValid && dirty)}
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
