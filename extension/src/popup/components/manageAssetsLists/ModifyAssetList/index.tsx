import React, { useEffect, useState } from "react";
import { Button, Input, Toggle } from "@stellar/design-system";
import { Formik, Form, Field, FieldProps } from "formik";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { validate } from "jsonschema";
import { captureException } from "@sentry/browser";

import {
  DEFAULT_ASSETS_LISTS,
  AssetsListKey,
} from "@shared/constants/soroban/token";
import { ROUTES } from "popup/constants/routes";
import { AppDispatch } from "popup/App";

import { AssetsListsData } from "popup/views/ManageAssetsLists";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { addAssetsList, modifyAssetsList } from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";

import "./styles.scss";
import { DeleteModal } from "../DeleteModal";

interface ModifyAssetListProps {
  selectedNetwork: AssetsListKey;
  assetsListsData: AssetsListsData[];
}

interface FormValues {
  assetList: string;
  isEnabled: boolean;
}

export const ModifyAssetList = ({
  selectedNetwork,
  assetsListsData,
}: ModifyAssetListProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const assetListIndex = params.get("asset-list-index");
  const dispatch: AppDispatch = useDispatch();
  const [fetchErrorString, setFetchErrorString] = useState("");
  const [submitErrorString, setSubmitErrorString] = useState("");
  const [assetListInfo, setAssetListInfo] = useState({} as AssetsListsData);
  const [isFetchingAssetList, setIsFetchingAssetList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDefaultAssetList, setIsDefaultAssetList] = useState(false);
  const [isShowingDeleteModal, setIsShowingDeleteModal] = useState(false);

  const defaultAssetsListIndex = DEFAULT_ASSETS_LISTS[selectedNetwork].length;

  useEffect(() => {
    if (assetListIndex) {
      /* Based on the query param, we're in EDIT mode. Prepopulate some information */
      const assetsListsSelection = assetsListsData[Number(assetListIndex)];
      if (assetsListsSelection) {
        const {
          url,
          name,
          description,
          provider,
          isEnabled,
        } = assetsListsSelection;
        setAssetListInfo({
          url,
          name,
          description,
          provider,
          isEnabled,
        });
        setIsEditing(true);

        if (Number(assetListIndex) < defaultAssetsListIndex) {
          // this is a default network, disable some features
          setIsDefaultAssetList(true);
        }
      }
    }
  }, [assetsListsData, assetListIndex, defaultAssetsListIndex]);

  const handleSearch = async (event: React.MouseEvent, values: FormValues) => {
    let url;
    let res;
    setIsFetchingAssetList(true);
    setFetchErrorString("");
    setSubmitErrorString("");
    setAssetListInfo({} as AssetsListsData);
    event.preventDefault();

    // fetch json schema to check asset list against
    let schemaRes;

    try {
      schemaRes = await fetch(
        "https://raw.githubusercontent.com/orbitlens/stellar-protocol/sep-0042-token-lists/contents/sep-0042/assetlist.schema.json",
      );
    } catch (err) {
      captureException("Unable to fetch SEP-0042 JSON schema");
      setFetchErrorString("Unable to validate asset asset list");
      return;
    }

    const schemaResJson = await schemaRes?.json();

    try {
      url = new URL(values.assetList);
    } catch (err) {
      console.error(err);
      setFetchErrorString("Unable to parse URL");
      setIsFetchingAssetList(false);
      return;
    }

    try {
      res = await fetch(url);
    } catch (err) {
      console.error(err);
      setFetchErrorString("Unable to fetch asset list");
      setIsFetchingAssetList(false);
      return;
    }

    if (!res.ok) {
      setFetchErrorString("Unable to fetch asset list");
      setIsFetchingAssetList(false);
      return;
    }

    const resJson = await res.json();

    // check against the SEP-0042 schema
    const validatedList = validate(resJson, schemaResJson);

    if (validatedList.errors.length) {
      setFetchErrorString(
        `Fetched asset list does not conform to schema: ${JSON.stringify(
          validatedList.errors,
        )}`,
      );
      setIsFetchingAssetList(false);
      return;
    }

    if (resJson.network !== selectedNetwork.toLowerCase()) {
      setFetchErrorString(
        `Fetched asset list is for the wrong network: ${resJson.network}`,
      );
      setIsFetchingAssetList(false);
      return;
    }

    setFetchErrorString("");
    setAssetListInfo({
      url: values.assetList,
      name: resJson.name,
      description: resJson.description,
      provider: resJson.provider,
      isEnabled: true,
    });

    setIsFetchingAssetList(false);
  };

  /* handle editing an exisiting asset list's "enabled" status */
  const handleIsEnabledChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isEditing) {
      setAssetListInfo({
        ...assetListInfo,
        isEnabled: e.target.checked,
      });
      await dispatch(
        modifyAssetsList({
          assetsList: {
            url: assetListInfo.url,
            isEnabled: e.target.checked,
          },
          network: selectedNetwork,
          isDeleteAssetsList: false,
        }),
      );
    }
  };

  /* handle adding a brand a new asset list */
  const handleAddAssetList = async (values: FormValues) => {
    const assetsList = {
      url: values.assetList,
      isEnabled: values.isEnabled,
    };
    const addAssetsListResp = await dispatch(
      addAssetsList({ assetsList, network: selectedNetwork }),
    );

    if (addAssetsList.rejected.match(addAssetsListResp)) {
      setSubmitErrorString(
        addAssetsListResp.payload?.errorMessage || "Unable to save asset list",
      );
    }

    if (addAssetsList.fulfilled.match(addAssetsListResp)) {
      navigateTo(ROUTES.manageAssetsLists);
    }
  };

  /* handle deleting an existing asset list  */
  const handleEditAssetList = async () => {
    const modifyAssetsListResp = await dispatch(
      modifyAssetsList({
        assetsList: {
          url: assetListInfo.url,
          isEnabled: assetListInfo.isEnabled,
        },
        network: selectedNetwork,
        isDeleteAssetsList: true,
      }),
    );

    if (modifyAssetsList.rejected.match(modifyAssetsListResp)) {
      setSubmitErrorString(
        modifyAssetsListResp.payload?.errorMessage ||
          "Unable to delete asset list",
      );
    }

    if (modifyAssetsList.fulfilled.match(modifyAssetsListResp)) {
      navigateTo(ROUTES.manageAssetsLists);
    }
  };

  /* Show the confirm delete modal */
  const handleShowDeleteModal = () => {
    setIsShowingDeleteModal(true);
  };

  return (
    <>
      <SubviewHeader title="Add Asset List" />
      <View.Content hasNoTopPadding>
        <Formik
          initialValues={{
            assetList: assetListInfo.url || "",
            isEnabled: assetListInfo.isEnabled || true,
          }}
          onSubmit={isEditing ? handleShowDeleteModal : handleAddAssetList}
          enableReinitialize={true}
        >
          {({
            dirty,
            isSubmitting,
            isValid,
            errors,
            values,
            setSubmitting,
          }) => (
            <Form>
              {isShowingDeleteModal ? (
                <DeleteModal
                  handleCancel={() => {
                    setIsShowingDeleteModal(false);
                    setSubmitting(false);
                  }}
                  handleSubmit={handleEditAssetList}
                />
              ) : null}
              <div>
                <label className="ModifyAssetList__label">
                  {t("Enter a Stellar Asset List compatible URL")}
                </label>
                <div className="ModifyAssetList__input">
                  <Field name="assetList">
                    {({ field }: FieldProps) => (
                      <Input
                        fieldSize="md"
                        autoFocus
                        autoComplete="off"
                        id="assetList"
                        placeholder={t("Token List URL")}
                        {...field}
                        error={errors.assetList}
                        disabled={isDefaultAssetList}
                      />
                    )}
                  </Field>
                </div>
              </div>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                isLoading={isFetchingAssetList}
                disabled={!isValid}
                onClick={(e) => handleSearch(e, values)}
              >
                {t("Fetch list information")}
              </Button>
              <div className="ModifyAssetList__results">
                {Object.keys(assetListInfo).length ? (
                  <>
                    <div className="ModifyAssetList__info">
                      <div className="AddAssetList__info__name">
                        {assetListInfo.name}
                      </div>
                      <div className="ModifyAssetList__info__provider">
                        {t("by")} {assetListInfo.provider}
                      </div>
                      <div className="ModifyAssetList__info__description">
                        {assetListInfo.description}
                      </div>
                    </div>
                    <div className="ModifyAssetList__enable">
                      <label
                        htmlFor="isEnabled"
                        className="ModifyAssetList__enable__label"
                      >
                        {t("Enable this list")}
                      </label>
                      {isEditing ? (
                        <Toggle
                          checked={assetListInfo.isEnabled}
                          id="isEnabled"
                          // @ts-ignore
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleIsEnabledChange(e)
                          }
                        />
                      ) : (
                        <Toggle
                          checked={assetListInfo.isEnabled || true}
                          customInput={<Field />}
                          id="isEnabled"
                        />
                      )}
                    </div>
                  </>
                ) : null}
                {dirty && fetchErrorString ? (
                  <div className="ModifyAssetList__not-found">
                    {fetchErrorString}
                  </div>
                ) : null}
              </div>
              {isEditing ? (
                <Button
                  size="md"
                  isFullWidth
                  variant="error"
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isDefaultAssetList}
                >
                  {t("Delete")}
                </Button>
              ) : (
                <Button
                  size="md"
                  isFullWidth
                  variant="secondary"
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={Boolean(!Object.keys(assetListInfo).length)}
                >
                  {t("Add list")}
                </Button>
              )}

              {submitErrorString ? (
                <div className="ModifyAssetList__submit-error">
                  {submitErrorString}
                </div>
              ) : null}
            </Form>
          )}
        </Formik>
      </View.Content>
    </>
  );
};
