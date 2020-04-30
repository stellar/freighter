import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { recoverAccount } from "ducks/authServices";

const RecoverAccount = () => {
  const firstRender = useRef(true);
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

  const formValidation = () => {
    if (password === confirmPassword && termsChecked) {
      setFormErrors(false);
    } else {
      setFormErrors(true);
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    formValidation();
  });

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
    </form>
  );
};

export default RecoverAccount;
