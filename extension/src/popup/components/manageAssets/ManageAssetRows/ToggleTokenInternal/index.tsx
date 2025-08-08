import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Asset, Badge, Button, Icon, Text } from "@stellar/design-system";
import { Networks } from "stellar-sdk";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { AppDispatch } from "popup/App";
import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import { addTokenId } from "popup/ducks/accountServices";
import { removeTokenId } from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface ToggleTokenInternalProps {
  asset: {
    code: string;
    issuer: string;
    image: string;
    isTrustlineActive: boolean;
    domain: string;
    contract?: string;
    name?: string;
  };
  networkDetails: NetworkDetails;
  onCancel: () => void;
  publicKey: string;
}

export const ToggleTokenInternal = ({
  asset,
  networkDetails,
  onCancel,
  publicKey,
}: ToggleTokenInternalProps) => {
  const dispatch: AppDispatch = useDispatch();
  const nav = useNavigate();

  const onConfirm = async () => {
    if (!asset.isTrustlineActive) {
      await dispatch(
        addTokenId({
          publicKey,
          tokenId: asset.contract!,
          network: networkDetails.network as Networks,
        }),
      );
    } else {
      await dispatch(
        removeTokenId({
          contractId: asset.contract!,
          network: networkDetails.network as NETWORKS,
        }),
      );
    }
    navigateTo(ROUTES.account, nav);
  };
  return (
    <div className="ToggleToken__wrapper">
      <div className="ToggleToken__wrapper__body">
        <div className="ToggleToken__wrapper__header">
          {asset.image && (
            <div className="ToggleToken__wrapper__icon-logo">
              <Asset
                size="lg"
                variant="single"
                sourceOne={{
                  altText: "Token logo",
                  image: asset.image,
                }}
              />
            </div>
          )}

          {!asset.image && asset.code && (
            <div className="ToggleToken__wrapper__code-logo">
              <Text
                as="div"
                size="sm"
                weight="bold"
                addlClassName="ToggleToken__wrapper--logo-label"
              >
                {asset.code.slice(0, 2)}
              </Text>
            </div>
          )}

          <Text as="div" size="sm" weight="medium">
            {asset.name || asset.code}
          </Text>
          <div className="ToggleToken__wrapper__badge">
            <Badge
              size="sm"
              variant="secondary"
              icon={<Icon.PlusCircle />}
              iconPosition="left"
            >
              {asset.isTrustlineActive ? "Remove Token" : "Add Token"}
            </Badge>
          </div>
        </div>

        <div className="ToggleToken__Description">
          {asset.isTrustlineActive
            ? "Remove token from your account balance view"
            : "Allow token to be displayed and used with this wallet address"}
        </div>
        <div className="ToggleToken__Metadata">
          <div className="ToggleToken__Metadata__Row">
            <div className="ToggleToken__Metadata__Label">
              <Icon.Wallet01 />
              <span>Wallet</span>
            </div>
            <div className="ToggleToken__Metadata__Value">
              <KeyIdenticon publicKey={publicKey} />
            </div>
          </div>
        </div>
        <div className="ToggleToken__Actions">
          <Button
            isRounded
            isFullWidth
            size="lg"
            variant="tertiary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            isFullWidth
            isRounded
            size="lg"
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};
