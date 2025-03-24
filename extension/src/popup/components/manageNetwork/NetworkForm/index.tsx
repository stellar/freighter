import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Checkbox, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { useNavigate, useLocation } from "react-router-dom";

import { NETWORKS } from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";

import { AppDispatch } from "popup/App";
import { PillButton } from "popup/basics/buttons/PillButton";
import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { isNetworkUrlValid as isNetworkUrlValidHelper } from "popup/helpers/account";
import { isActiveNetwork } from "helpers/stellar";

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
  sorobanRpcUrl?: string;
  isSwitchSelected?: boolean;
  isAllowHttpSelected: boolean;
  friendbotUrl?: string;
}

interface NetworkFormProps {
  isEditing: boolean;
}

export const NETWORK_INDEX_SEARCH_PARAM = "networkIndex";

export const NetworkForm = ({ isEditing }: NetworkFormProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const networksList = useSelector(settingsNetworksListSelector);
  const settingsError = useSelector(settingsErrorSelector);

  const [isNetworkInUse, setIsNetworkInUse] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [isNetworkUrlValid, setIsNetworkUrlValid] = useState(false);
  const [invalidUrl, setInvalidUrl] = useState("");
  const navigate = useNavigate();
  const { search } = useLocation();

  const networkIndex = Number(
    new URLSearchParams(search).get(NETWORK_INDEX_SEARCH_PARAM)
  );
  const networkDetailsToEdit = networksList[networkIndex];
  const isCurrentNetworkActive = isActiveNetwork(
    networkDetailsToEdit,
    networkDetails
  );
  const isEditingDefaultNetworks =
    isEditing && (networkIndex === 0 || networkIndex === 1);

  const initialValues: FormValues = isEditing
    ? {
        ...networkDetailsToEdit,
        isSwitchSelected: false,
        isAllowHttpSelected:
          !networkDetailsToEdit?.networkUrl.includes("https"),
      }
    : {
        networkName: "",
        networkPassphrase: "",
        networkUrl: "",
        sorobanRpcUrl: "",
        friendbotUrl: "",
        isSwitchSelected: false,
        isAllowHttpSelected: false,
      };

  const NetworkFormSchema = YupObject().shape({
    networkName: YupString().required(),
    networkPassphrase: YupString().required(),
    networkUrl: YupString().required(),
    sorobanRpcUrl: YupString(),
  });

  const handleRemoveNetwork = async () => {
    const res = await dispatch(
      removeCustomNetwork({
        networkName: networkDetailsToEdit.networkName,
      })
    );

    if (removeCustomNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account, navigate);
    }
  };

  const showNetworkUrlInvalidModal = (networkUrl: string) => {
    setIsNetworkUrlValid(true);
    setInvalidUrl(networkUrl);
  };

  const getCustomNetworkDetailsFromFormValues = (values: FormValues) => {
    const {
      friendbotUrl,
      networkName,
      networkUrl,
      networkPassphrase,
      sorobanRpcUrl,
    } = values;

    return {
      friendbotUrl,
      network: CUSTOM_NETWORK,
      networkName,
      networkUrl,
      networkPassphrase,
      sorobanRpcUrl,
    };
  };

  const handleEditNetwork = async (values: FormValues) => {
    if (
      !isNetworkUrlValidHelper(values.networkUrl, values.isAllowHttpSelected)
    ) {
      showNetworkUrlInvalidModal(values.networkUrl);
      return;
    }

    const res = await dispatch(
      editCustomNetwork({
        networkDetails: getCustomNetworkDetailsFromFormValues(values),
        networkIndex,
      })
    );
    if (editCustomNetwork.fulfilled.match(res)) {
      navigateTo(ROUTES.account, navigate);
    }
  };

  const handleAddNetwork = async (values: FormValues) => {
    if (
      !isNetworkUrlValidHelper(values.networkUrl, values.isAllowHttpSelected)
    ) {
      showNetworkUrlInvalidModal(values.networkUrl);
      return;
    }

    const addCustomNetworkRes = await dispatch(
      addCustomNetwork({
        networkDetails: getCustomNetworkDetailsFromFormValues(values),
      })
    );

    const addCustomNetworkFulfilled =
      addCustomNetwork.fulfilled.match(addCustomNetworkRes);
    let changeNetworkFulfilled = true;

    if (values.isSwitchSelected) {
      changeNetworkFulfilled = false;

      const changeNetworkRes = await dispatch(
        changeNetwork({
          networkName: values.networkName,
        })
      );
      changeNetworkFulfilled = changeNetwork.fulfilled.match(changeNetworkRes);
    }

    if (addCustomNetworkFulfilled && changeNetworkFulfilled) {
      clearSettingsError();
      navigate(-1);
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
      size="md"
      type="button"
      isFullWidth
      variant="tertiary"
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
        size="md"
        isFullWidth
        type="button"
        variant="secondary"
        onClick={() => setIsConfirmingRemoval(false)}
      >
        {t("Cancel")}
      </Button>
      <div className="NetworkForm__remove-button">
        <Button
          size="md"
          isFullWidth
          variant="primary"
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
    !isEditingDefaultNetworks ? (
      <div className="NetworkForm__editing-buttons">
        <Button
          size="md"
          onClick={() => navigate(-1)}
          type="button"
          variant="secondary"
          isFullWidth
        >
          {t("Cancel")}
        </Button>
        <Button
          size="md"
          variant="primary"
          disabled={!isValid}
          isLoading={isSubmitting}
          isFullWidth
          type="submit"
        >
          {t("Save")}
        </Button>
      </div>
    ) : null;

  return (
    <React.Fragment>
      <SubviewHeader
        title={!isEditing ? t("Add Custom Network") : t("Network Details")}
      />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={NetworkFormSchema}
      >
        {({ dirty, errors, isSubmitting, isValid, touched }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content hasNoTopPadding>
              <div className="NetworkForm__form">
                {isNetworkInUse ? (
                  <NetworkModal buttonComponent={<CloseModalButton />}>
                    <div>
                      <div className="NetworkForm__modal__title">
                        {t("Network is in use")}
                      </div>
                      <div className="NetworkForm__modal__body">
                        {t(
                          "Please select a different network before removing it."
                        )}
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
                          "Are you sure you want to remove this network? You will have to re-add it if you want to use it again."
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
                          "Please check if the network information is correct and try again. Alternatively, this network may not be operational."
                        )}{" "}
                      </div>
                    </div>
                  </NetworkModal>
                ) : null}

                <Input
                  data-testid="NetworkForm__networkName"
                  fieldSize="md"
                  disabled={isEditingDefaultNetworks}
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
                  data-testid="NetworkForm__networkUrl"
                  fieldSize="md"
                  disabled={isEditingDefaultNetworks}
                  id="networkUrl"
                  autoComplete="off"
                  error={
                    errors.networkUrl && touched.networkUrl
                      ? errors.networkUrl
                      : ""
                  }
                  customInput={<Field />}
                  label={t("HORIZON RPC URL")}
                  name="networkUrl"
                  placeholder={t("Enter network URL")}
                />
                {!isEditingDefaultNetworks ||
                networkDetailsToEdit.network !== NETWORKS.PUBLIC ? (
                  <Input
                    data-testid="NetworkForm__sorobanRpcUrl"
                    fieldSize="md"
                    disabled={isEditingDefaultNetworks}
                    id="sorobanRpcUrl"
                    autoComplete="off"
                    error={
                      errors.sorobanRpcUrl && touched.sorobanRpcUrl
                        ? errors.sorobanRpcUrl
                        : ""
                    }
                    customInput={<Field />}
                    label={t("SOROBAN RPC URL")}
                    name="sorobanRpcUrl"
                    placeholder={t("Enter Soroban RPC URL")}
                  />
                ) : null}
                <Input
                  data-testid="NetworkForm__networkPassphrase"
                  fieldSize="md"
                  disabled={isEditingDefaultNetworks}
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
                <Input
                  fieldSize="md"
                  disabled={isEditingDefaultNetworks}
                  id="friendbotUrl"
                  autoComplete="off"
                  error={
                    errors.friendbotUrl && touched.friendbotUrl
                      ? errors.friendbotUrl
                      : ""
                  }
                  customInput={<Field />}
                  label={t("Friendbot URL")}
                  name="friendbotUrl"
                  placeholder={t("Enter Friendbot URL")}
                />
                {!isEditingDefaultNetworks ? (
                  <Field name="isAllowHttpSelected">
                    {({ field }: FieldProps) => (
                      <Checkbox
                        fieldSize="md"
                        checked={field.value}
                        id="isAllowHttpSelected-input"
                        error={
                          errors.isAllowHttpSelected &&
                          touched.isAllowHttpSelected
                            ? errors.isAllowHttpSelected
                            : null
                        }
                        label={t("Allow connecting to non-HTTPS networks")}
                        {...field}
                      />
                    )}
                  </Field>
                ) : null}

                {isEditing ? (
                  <div className="NetworkForm__remove-wrapper">
                    {!isEditingDefaultNetworks && (
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
                        fieldSize="md"
                        autoComplete="off"
                        id="isSwitchSelected-input"
                        error={
                          errors.isSwitchSelected && touched.isSwitchSelected
                            ? errors.isSwitchSelected
                            : null
                        }
                        label={t("Switch to this network")}
                        {...field}
                      />
                    )}
                  </Field>
                )}
              </div>
            </View.Content>
            <View.Footer
              style={{ display: isEditingDefaultNetworks ? "none" : "block" }}
              isInline
            >
              {isEditing ? (
                <EditingButtons isValid={isValid} isSubmitting={isSubmitting} />
              ) : (
                <div className="NetworkForm__add-button">
                  <Button
                    data-testid="NetworkForm__add"
                    size="md"
                    variant="primary"
                    disabled={!(isValid && dirty)}
                    isFullWidth
                    isLoading={isSubmitting}
                    type="submit"
                  >
                    {t("Add network")}
                  </Button>
                </div>
              )}
            </View.Footer>
          </Form>
        )}
      </Formik>
    </React.Fragment>
  );
};
