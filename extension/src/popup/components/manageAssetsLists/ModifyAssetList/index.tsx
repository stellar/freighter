import React, { useEffect, useState } from "react";
import { Button, Input, Toggle, Notification } from "@stellar/design-system";
import { Formik, Form, Field, FieldProps } from "formik";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { captureException } from "@sentry/browser";

import {
  DEFAULT_ASSETS_LISTS,
  AssetsListKey,
  AssetListResponse,
} from "@shared/constants/soroban/asset-list";
import { schemaValidatedAssetList } from "@shared/api/helpers/token-list";
import { ROUTES } from "popup/constants/routes";
import { AppDispatch } from "popup/App";

import { AssetsListsData } from "popup/views/ManageAssetsLists";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { addAssetsList, modifyAssetsList } from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";
import { saveTokenLists } from "popup/ducks/cache";
import { DeleteModal } from "../DeleteModal";

import "./styles.scss";

interface ModifyAssetListProps {
  selectedNetwork: AssetsListKey;
  assetsListsData: AssetsListsData[];
}

interface FormValues {
  assetList: string;
}

export const ModifyAssetList = ({
  selectedNetwork,
  assetsListsData,
}: ModifyAssetListProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const assetListUrl = params.get("asset-list-url");
  const dispatch = useDispatch<AppDispatch>();
  const [fetchErrorString, setFetchErrorString] = useState("");
  const [submitErrorString, setSubmitErrorString] = useState("");
  const [assetListInfo, setAssetListInfo] = useState({} as AssetsListsData);
  const [isFetchingAssetList, setIsFetchingAssetList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDefaultAssetList, setIsDefaultAssetList] = useState(false);
  const [isShowingDeleteModal, setIsShowingDeleteModal] = useState(false);

  const defaultAssetsList = DEFAULT_ASSETS_LISTS[selectedNetwork];

  useEffect(() => {
    if (assetListUrl) {
      /* Based on the query param, we're in EDIT mode. Prepopulate some information */
      const decodedAssetListUrl = decodeURIComponent(assetListUrl);
      const assetsListsSelection = assetsListsData.find(
        ({ url }) => url === decodedAssetListUrl,
      );
      if (assetsListsSelection) {
        const { url, name, description, provider, isEnabled } =
          assetsListsSelection;
        setAssetListInfo({
          url,
          name,
          description,
          provider,
          isEnabled,
        });
        setIsEditing(true);

        if (
          defaultAssetsList.find(
            ({ url: defaultUrl }) => defaultUrl === decodedAssetListUrl,
          )
        ) {
          // this is a default network, disable some features
          setIsDefaultAssetList(true);
        }
      }
    }
  }, [assetsListsData, assetListUrl, defaultAssetsList]);

  const handleSearch = async (event: React.MouseEvent, values: FormValues) => {
    let url;
    let res;
    setIsFetchingAssetList(true);
    setFetchErrorString("");
    setSubmitErrorString("");
    setAssetListInfo({} as AssetsListsData);
    event.preventDefault();

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

    const resJson: AssetListResponse = await res.json();

    // check against the SEP-0042 schema
    const validatedList = await schemaValidatedAssetList(resJson);

    if (!validatedList) {
      captureException("Unable to fetch SEP-0042 JSON schema");
      setFetchErrorString("Unable to validate asset asset list");
      return;
    }

    if (validatedList.errors?.length) {
      const errors = validatedList.errors.map(
        ({ stack }: { stack: string }) => stack,
      );

      setFetchErrorString(
        `Fetched asset list does not conform to schema: ${JSON.stringify(
          errors.join(" | "),
        )}`,
      );
      setIsFetchingAssetList(false);
      return;
    }

    if (resJson.network !== selectedNetwork.toLowerCase()) {
      const getNetworkName = (network: string) =>
        network === "public" ? "Mainnet" : "Testnet";
      setFetchErrorString(
        `The entered asset list belongs to "${getNetworkName(
          resJson.network,
        )}": Currently editing "${getNetworkName(
          selectedNetwork.toLowerCase(),
        )}" lists.`,
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
      isEnabled:
        assetListInfo.isEnabled === undefined ? true : assetListInfo.isEnabled,
    });

    setIsFetchingAssetList(false);
  };

  /* handle editing an exisiting asset list's "enabled" status */
  const handleIsEnabledChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAssetListInfo({
      ...assetListInfo,
      isEnabled: e.target.checked,
    });
    if (isEditing) {
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
      isEnabled: assetListInfo.isEnabled,
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
      navigateTo(ROUTES.manageAssetsLists, navigate);
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
      dispatch(saveTokenLists([]));
      navigateTo(ROUTES.manageAssetsLists, navigate);
    }
  };

  /* Show the confirm delete modal */
  const handleShowDeleteModal = () => {
    setIsShowingDeleteModal(true);
  };

  return (
    <>
      <SubviewHeader title={isEditing ? "Manage List" : "Add Asset List"} />
      <View.Content hasNoTopPadding>
        <Formik
          initialValues={{
            assetList: assetListInfo.url || "",
            isEnabled: assetListInfo.isEnabled || true,
          }}
          onSubmit={isEditing ? handleShowDeleteModal : handleAddAssetList}
          enableReinitialize={true}
        >
          {({ isSubmitting, isValid, errors, values, setSubmitting }) => (
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
                <span className="ModifyAssetList__label">
                  {t("Enter a Stellar Asset List compatible URL")}
                </span>
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
                isRounded
                variant="tertiary"
                isLoading={isFetchingAssetList}
                disabled={!isValid || isDefaultAssetList}
                onClick={(e) => handleSearch(e, values)}
              >
                {t("Fetch list information")}
              </Button>
              <div className="ModifyAssetList__results">
                {Object.keys(assetListInfo).length ? (
                  <div className="ModifyAssetList__info">
                    <div className="ModifyAssetList__info__title-row">
                      <div>
                        <div className="ModifyAssetList__info__name">
                          {assetListInfo.name}
                        </div>
                        <div className="ModifyAssetList__info__provider">
                          {t("by")} {assetListInfo.provider}
                        </div>
                      </div>
                      <Toggle
                        checked={assetListInfo.isEnabled}
                        id="isEnabled"
                        // @ts-ignore
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleIsEnabledChange(e)
                        }
                      />
                    </div>
                    <div className="ModifyAssetList__info__description">
                      {assetListInfo.description}
                    </div>
                  </div>
                ) : null}
                {fetchErrorString ? (
                  <View.Inset hasScrollShadow>
                    <div className="ModifyAssetList__not-found">
                      {fetchErrorString}
                    </div>
                  </View.Inset>
                ) : null}
                {submitErrorString ? (
                  <div className="ModifyAssetList__submit-error">
                    <Notification variant="warning" title={submitErrorString} />
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
                  {t("Remove List")}
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
            </Form>
          )}
        </Formik>
      </View.Content>
    </>
  );
};
