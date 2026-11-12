import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import { SecretSourceType } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

import { Security } from "../Security";
import { DisplayBackupPhrase } from "../DisplayBackupPhrase";
import { TEST_PUBLIC_KEY, Wrapper } from "../../__testHelpers__";

jest.mock("helpers/metrics", () => ({
  emitScreenViewed: jest.fn(),
  emitMetric: jest.fn(),
}));

jest.mock("helpers/hooks/useGetAppData", () => {
  const actual = jest.requireActual("helpers/hooks/useGetAppData");
  return {
    ...actual,
    useGetAppData: () => ({
      state: { state: "IDLE", data: null },
      fetchData: jest.fn(),
    }),
  };
});

const phrase = {
  id: "p",
  type: SecretSourceType.PHRASE,
  label: "Seed Phrase 1",
  createdAt: 1,
};
const secretKey = {
  id: "k",
  type: SecretSourceType.SECRET_KEY,
  label: "Secret Key 1",
  createdAt: 2,
};

const state = (secretSources: unknown[]) => ({
  auth: {
    publicKey: TEST_PUBLIC_KEY,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    secretSources,
  },
  settings: { networkDetails: TESTNET_NETWORK_DETAILS },
});

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

describe("Security", () => {
  it("hides Show recovery phrase for a secret-key wallet", () => {
    render(
      <Wrapper routes={[ROUTES.security]} state={state([secretKey])}>
        <Security />
      </Wrapper>,
    );
    expect(screen.queryByText("Show recovery phrase")).toBeNull();
    expect(screen.getByText("Auto-lock timer")).toBeTruthy();
  });

  it("shows Show recovery phrase for a phrase wallet", () => {
    render(
      <Wrapper routes={[ROUTES.security]} state={state([phrase])}>
        <Security />
      </Wrapper>,
    );
    expect(screen.getByText("Show recovery phrase")).toBeTruthy();
  });
});

describe("DisplayBackupPhrase", () => {
  it("redirects to Security for a secret-key wallet", () => {
    render(
      <Wrapper routes={[ROUTES.displayBackupPhrase]} state={state([secretKey])}>
        <Routes>
          <Route
            path={ROUTES.displayBackupPhrase}
            element={<DisplayBackupPhrase />}
          />
          <Route path={ROUTES.security} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );
    expect(screen.getByTestId("location").textContent).toBe(ROUTES.security);
  });
});
