import React from "react";
import { render, waitFor, screen } from "@testing-library/react";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { GrantAccess } from "../GrantAccess";
import * as blockAidHelpers from "popup/helpers/blockaid";
import * as urlHelpers from "../../../helpers/urls";

jest.spyOn(urlHelpers, "parsedSearchParam").mockImplementation(() => {
  const original = jest.requireActual("../../../helpers/urls");
  return {
    ...original,
    url: "example.com",
  };
});

describe("Grant Access view", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
  });

  it("shows a benign label when scan site returns non malicious flag", async () => {
    jest.spyOn(blockAidHelpers, "useScanSite").mockImplementation(() => {
      return {
        error: null,
        isLoading: false,
        data: {
          is_malicious: false,
        } as blockAidHelpers.BlockAidScanSiteResult,
        scanSite: (_url: string, _networkDetails: NetworkDetails) => {
          return Promise.resolve();
        },
      };
    });

    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    expect(screen.getByTestId("blockaid-benign-label")).toBeDefined();
  });

  it("shows a miss label when scan site returns a miss status", async () => {
    jest.spyOn(blockAidHelpers, "useScanSite").mockImplementation(() => {
      return {
        error: null,
        isLoading: false,
        data: {
          status: "miss",
        } as blockAidHelpers.BlockAidScanSiteResult,
        scanSite: (_url: string, _networkDetails: NetworkDetails) => {
          return Promise.resolve();
        },
      };
    });

    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    expect(screen.getByTestId("blockaid-miss-label")).toBeDefined();
  });

  it("shows a malicious label when scan site returns a malicious flag", async () => {
    jest.spyOn(blockAidHelpers, "useScanSite").mockImplementation(() => {
      return {
        error: null,
        isLoading: false,
        data: {
          is_malicious: true,
        } as blockAidHelpers.BlockAidScanSiteResult,
        scanSite: (_url: string, _networkDetails: NetworkDetails) => {
          return Promise.resolve();
        },
      };
    });

    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <GrantAccess />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("grant-access-view"));
    expect(screen.getByTestId("grant-access-view")).toBeDefined();
    expect(screen.getByTestId("blockaid-malicious-label")).toBeDefined();
  });
});
