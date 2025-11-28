import React, { useEffect } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Input, Icon } from "@stellar/design-system";
import { object as YupObject, string as YupString } from "yup";

import { Loading } from "popup/components/Loading";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { isContractId } from "@shared/api/helpers/soroban";
import {
  RequestState,
  useGetManageCollectiblesData,
} from "./hooks/useGetManageCollectiblesData";

import "./styles.scss";

interface FormValues {
  collectibleAddress: string;
  collectibleTokenId: string;
}
const initialValues: FormValues = {
  collectibleAddress: "",
  collectibleTokenId: "",
};

const handleSubmit = (values: FormValues) => {
  console.log(values);
};

export const ManageCollectibles = () => {
  const { t } = useTranslation();
  const { state, fetchData } = useGetManageCollectiblesData({});

  const validateManageCollectiblesSchema = YupObject().shape({
    collectibleAddress: YupString()
      .required(t("Collectible address is required"))
      .test("is-contract-id", t("Invalid address"), (value) =>
        isContractId(value),
      ),
    collectibleTokenId: YupString()
      .required(t("Token ID is required"))
      .test("is-token-id", t("Invalid token ID"), (value) => value.length > 0)
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
        <Form className="ManageCollectibles">
          <SubviewHeader title={t("Add Collectible")} />
          <View.Content hasNoTopPadding>
            <FormRows>
              <Field name="collectibleAddress">
                {({ field }: FieldProps) => (
                  <div className="ManageCollectibles__input-wrapper">
                    <Input
                      type="text"
                      fieldSize="md"
                      autoFocus
                      autoComplete="off"
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
                  <div className="ManageCollectibles__input-wrapper">
                    <Input
                      type="text"
                      fieldSize="md"
                      autoComplete="off"
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
                                "collectibleAddress",
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
            </div>
          </View.Footer>
        </Form>
      )}
    </Formik>
  );
};
