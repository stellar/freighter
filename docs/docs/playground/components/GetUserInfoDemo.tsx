import React, { useState } from "react";
import { getUserInfo } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetUserInfoDemo = () => {
  const [userInfoResult, setUserInfoResult] = useState({});

  const btnHandler = async () => {
    let userInfo;
    let error = "";

    try {
      userInfo = await getUserInfo();
    } catch (e) {
      error = e;
    }

    setUserInfoResult(userInfo || error);
  };

  return (
    <section>
      <div>
        What is Freighter's user info?
        <PlaygroundInput readOnly value={JSON.stringify(userInfoResult)} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get User Info
      </button>
    </section>
  );
};
