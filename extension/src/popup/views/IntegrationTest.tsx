import React from "react";

import { createAccount } from "@shared/api/internal";

// Remove when not needed! 👇
// eslint-disable-next-line arrow-body-style
export const IntegrationTest = () => {
  // ALEC TODO - remove
  console.log("running integration tests");

  const runTests = async () => {
    const res = await createAccount("test-password");

    // ALEC TODO - remove
    console.log({ res });
  };
  console.log({ runTests });
  // runTests();

  return <div>integration tests</div>;
};
