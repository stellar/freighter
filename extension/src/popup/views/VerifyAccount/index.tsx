import get from "lodash/get";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import {
  confirmPassword,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";

import "./styles.scss";
import { AppDispatch } from "popup/App";

interface VerifyAccountProps {
  isApproval?: boolean;
  customBackAction?: () => void;
  customSubmit?: (password: string) => Promise<void>;
}

export const VerifyAccount = ({
  isApproval,
  customBackAction,
  customSubmit,
}: VerifyAccountProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const publicKey = useSelector(publicKeySelector);

  const from = get(location, "state.from.pathname", "") as ROUTES;

  const navigate = useNavigate();

  const handleConfirm = async (password: string) => {
    if (customSubmit) {
      await customSubmit(password);
    } else {
      await dispatch(confirmPassword(password));
      navigateTo(from || ROUTES.account, navigate);
    }
  };

  const handleCancel = () => {
    if (customBackAction) {
      customBackAction();
      return;
    }

    navigate(-1);
  };

  return (
    <React.Fragment>
      <div className="VerifyAccount">
        <EnterPassword
          accountAddress={publicKey}
          description={
            isApproval
              ? undefined
              : t("Enter your account password to authorize this transaction.")
          }
          confirmButtonTitle={isApproval ? undefined : t("Submit")}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </React.Fragment>
  );
};
