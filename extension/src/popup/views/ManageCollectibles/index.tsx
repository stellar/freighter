import React, { useEffect, useState } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Input, Icon } from "@stellar/design-system";
import { object as YupObject, string as YupString } from "yup";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { publicKeySelector } from "popup/ducks/accountServices";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { Loading } from "popup/components/Loading";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isContractId } from "@shared/api/helpers/soroban";
import { addCollectible } from "@shared/api/internal";
import { useGetCollectibles } from "helpers/hooks/useGetCollectibles";
import {
  RequestState,
  useGetManageCollectiblesData,
} from "./hooks/useGetManageCollectiblesData";

import "./styles.scss";

import { TabsList } from "../Account/contexts/activeTabContext";

interface FormValues {
  collectibleAddress: string;
  collectibleTokenId: string;
}
const initialValues: FormValues = {
  collectibleAddress: "",
  collectibleTokenId: "",
};

export const ManageCollectibles = () => {
  const { t } = useTranslation();
  const { state, fetchData } = useGetManageCollectiblesData({});
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const navigate = useNavigate();
  const [addCollectibleError, setAddCollectibleError] = useState<string>("");
  const { fetchData: fetchCollectibles } = useGetCollectibles({
    useCache: false,
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      const response = await addCollectible({
        publicKey: publicKey,
        network: networkDetails.network,
        collectibleAddress: values.collectibleAddress,
        collectibleTokenId: values.collectibleTokenId,
      });

      if (response.error) {
        setAddCollectibleError(response.error);
        return;
      }

      setAddCollectibleError("");

      // refetch collectibles to update the UI before we navigate away
      await fetchCollectibles({ publicKey, networkDetails });

      navigateTo(ROUTES.account, navigate, `?tab=${TabsList[1]}`);
    } catch (error) {
      setAddCollectibleError("Unable to add collectible");
      console.error(error);
    }
  };

  const validateManageCollectiblesSchema = YupObject().shape({
    collectibleAddress: YupString()
      .required(t("Collectible address is required"))
      .test("is-contract-id", t("Invalid address"), (value) =>
        isContractId(value),
      ),
    collectibleTokenId: YupString()
      .required(t("Token ID is required"))
      .test(
        "no-spaces",
        t("Token ID cannot contain spaces"),
        (value) => !value.includes(" "),
      ),
  });

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validateManageCollectiblesSchema}
    >
      {({ setFieldValue, touched, errors, dirty, isValid, isSubmitting }) => (
        <Form className="ManageCollectibles" data-testid="ManageCollectibles">
          <SubviewHeader title={t("Add Collectible")} />
          <View.Content hasNoTopPadding>
            <FormRows>
              <Field name="collectibleAddress">
                {({ field }: FieldProps) => (
                  <div
                    className="ManageCollectibles__input-wrapper"
                    data-testid="collectible-address-wrapper"
                  >
                    <Input
                      type="text"
                      fieldSize="md"
                      autoFocus
                      autoComplete="off"
                      data-testid="collectibleAddress"
                      id="collectibleAdress"
                      placeholder={t("Collectible address")}
                      {...field}
                      rightElement={
                        <div className="ManageCollectibles__clipboard-button">
                          <Button
                            type="button"
                            size="md"
                            variant="tertiary"
                            onClick={async () => {
                              const pastedCollectionAddress =
                                await navigator.clipboard.readText();
                              setFieldValue(
                                "collectibleAddress",
                                pastedCollectionAddress,
                              );
                            }}
                          >
                            <Icon.Clipboard />
                          </Button>
                        </div>
                      }
                      error={
                        errors.collectibleAddress && touched.collectibleAddress
                          ? errors.collectibleAddress
                          : ""
                      }
                    />
                  </div>
                )}
              </Field>
              <Field name="collectibleTokenId">
                {({ field }: FieldProps) => (
                  <div
                    className="ManageCollectibles__input-wrapper"
                    data-testid="collectible-token-id-wrapper"
                  >
                    <Input
                      type="text"
                      fieldSize="md"
                      autoComplete="off"
                      data-testid="collectibleTokenId"
                      id="collectibleTokenId"
                      placeholder={t("Token ID")}
                      {...field}
                      rightElement={
                        <div className="ManageCollectibles__clipboard-button">
                          <Button
                            type="button"
                            size="md"
                            variant="tertiary"
                            onClick={async () => {
                              const pastedTokenId =
                                await navigator.clipboard.readText();
                              setFieldValue(
                                "collectibleTokenId",
                                pastedTokenId,
                              );
                            }}
                          >
                            <Icon.Clipboard />
                          </Button>
                        </div>
                      }
                      error={
                        errors.collectibleTokenId && touched.collectibleTokenId
                          ? errors.collectibleTokenId
                          : ""
                      }
                    />
                  </div>
                )}
              </Field>
            </FormRows>
          </View.Content>
          <View.Footer isInline>
            <div className="ManageCollectibles__button-wrapper">
              <Button
                data-testid="ManageCollectibles__button"
                size="lg"
                variant="secondary"
                isFullWidth
                isRounded
                isLoading={isSubmitting}
                disabled={!(dirty && isValid)}
                type="submit"
              >
                {t("Enter details")}
              </Button>
              {addCollectibleError && (
                <div className="ManageCollectibles__error-message">
                  {addCollectibleError}
                </div>
              )}
            </div>
          </View.Footer>
        </Form>
      )}
    </Formik>
  );
};
