import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  authErrorSelector,
  publicKeySelector,
  recoverAccount,
} from "ducks/authServices";
import { ErrorMessage } from "components/form";

const RecoverAccount = () => {
  const firstRender = useRef(true);
  const publicKey = useSelector(publicKeySelector);
  const authError = useSelector(authErrorSelector);
  const [password, setPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [formErrors, setFormErrors] = useState(true);

  const dispatch = useDispatch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(recoverAccount({ password, mnemonicPhrase }));
  };

  const formValidation = useCallback(() => {
    if (password === confirmPassword && termsChecked) {
      setFormErrors(false);
    } else {
      setFormErrors(true);
    }
  }, [setFormErrors, password, confirmPassword, termsChecked]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    formValidation();
  }, [formValidation]);

  useEffect(() => {
    if (publicKey) {
      window.close();
    }
  }, [publicKey]);

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create a password</h1>
      <ul>
        <li>
          <label htmlFor="mnemonicPhrase">
            <p>Enter your 12 words phrase to restore your wallet</p>
          </label>
          <textarea
            id="mnemonicPhrase"
            onChange={(e) => setMnemonicPhrase(e.target.value)}
          />
        </li>
        <li>
          <input
            autoComplete="off"
            onChange={(e) => setPassword(e.target.value)}
            name="password"
            placeholder="New password"
            type="text"
          ></input>
        </li>
        <li>
          <input
            autoComplete="off"
            onChange={(e) => setconfirmPassword(e.target.value)}
            name="confirmPassword"
            placeholder="Confirm password"
            type="text"
          ></input>
        </li>
        <li>
          <input
            id="termsOfUse"
            name="termsOfUse"
            checked={termsChecked}
            onChange={() => setTermsChecked(!termsChecked)}
            type="checkbox"
          ></input>
          <label htmlFor="termsOfUse">
            I have read and agree to Terms of Use
          </label>
        </li>
      </ul>
      <button type="submit" disabled={formErrors}>
        Recover
      </button>
      <div>
        <Link to="/?sameTab=true">Go back</Link>
      </div>
      <ErrorMessage authError={authError}></ErrorMessage>
    </form>
  );
};

export default RecoverAccount;
