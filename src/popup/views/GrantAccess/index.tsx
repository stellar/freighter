import React from "react";
import { useLocation } from "react-router-dom";
import { rejectAccess, grantAccess } from "api/internal";

const GrantAccess = () => {
  const location = useLocation();
  const decodedTab = atob(location.search.replace("?", ""));
  const tabToUnlock = decodedTab ? JSON.parse(decodedTab) : {};
  const { url, title } = tabToUnlock;

  const rejectAndClose = async () => {
    await rejectAccess();
    window.close();
  };

  const grantAndClose = async () => {
    await grantAccess(url);
    window.close();
  };

  return (
    <>
      <h1>Connection request</h1>
      <img alt="favicon of site" src={`${url}/favico.png`} />
      <h3>{title}</h3>
      <h3>{url}</h3>

      <h3>{title} wants to know your public key</h3>
      <p>
        This site is asking for access to the public key associated with this
        Lyra wallet. Only share your information with websites you trust.{" "}
      </p>
      <button onClick={() => rejectAndClose()}>Reject</button>
      <button onClick={() => grantAndClose()}>Connect</button>
    </>
  );
};

export default GrantAccess;
