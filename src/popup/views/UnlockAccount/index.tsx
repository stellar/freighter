import React, { useState } from "react";
import { get } from "lodash";
import { history } from "popup/App";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { confirmPassword, authErrorSelector } from "popup/ducks/authServices";

const UnlockAccount = () => {
  const location = useLocation();
  const from = get(location, "state.from.pathname", "");
  const queryParams = get(location, "search", "");
  const destination = from ? `${from}${queryParams}` : "/account";

  const [password, setPassword] = useState("");
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(confirmPassword(password));
    history.push(destination);
  };

  const authError = useSelector(authErrorSelector);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <ul>
          <li>
            <input
              type="text"
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
          </li>
          <li>{authError ? <label>{authError}</label> : null}</li>
          <li>
            <button type="submit">Log In</button>
          </li>
        </ul>
      </form>
      <ul>
        <li>
          <a href="/">Help</a>
        </li>
        <li>
          <a href="/">Recover account from backup phrase</a>
        </li>
      </ul>
    </>
  );
};

export default UnlockAccount;
