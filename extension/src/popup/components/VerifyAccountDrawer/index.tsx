import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";

import { confirmPassword } from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";
import { AppDispatch } from "popup/App";
import { SlideupModal } from "../SlideupModal";

import "./styles.scss";

interface VerifyAccountProps {
  publicKey: string;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
}

export const VerifyAccount = ({
  publicKey,
  isModalOpen,
  setIsModalOpen,
}: VerifyAccountProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const handleConfirm = async (password: string) => {
    await dispatch(confirmPassword(password));
    setIsModalOpen(false);
  };

  return (
    <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
      <div className="VerifyAccount">
        <EnterPassword
          accountAddress={publicKey}
          description={t(
            "Enter your account password to authorize this transaction.",
          )}
          confirmButtonTitle={t("Submit")}
          onConfirm={handleConfirm}
          onCancel={() => setIsModalOpen(false)}
        />
      </div>
    </SlideupModal>
  );
};
