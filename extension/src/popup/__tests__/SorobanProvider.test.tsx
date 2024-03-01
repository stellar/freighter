import React, { useContext } from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { DEFAULT_NETWORKS, NETWORKS } from "@shared/constants/stellar";
import { Wrapper, mockAccounts } from "../__testHelpers__";

import { SorobanProvider, SorobanContext } from "../SorobanContext";

describe("SorobanProvider", () => {
  const SorobanConsumer = () => {
    const sorobanClient = useContext(SorobanContext);

    return (
      <div data-testid="SorobanConsumer">
        {sorobanClient.server.serverURL._parts.hostname}
      </div>
    );
  };

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
            networkDetails: {
              sorobanRpcUrl: "https://foo.stellar.org",
            },
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SorobanProvider pubKey="GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF">
          <SorobanConsumer />
        </SorobanProvider>
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("SorobanConsumer"));
    expect(screen.getByTestId("SorobanConsumer")).toHaveTextContent(
      "foo.stellar.org",
    );
  });
  it("should find appropriate rpc url if one is missing", async () => {
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
            networkDetails: {
              network: NETWORKS.PUBLIC,
            },
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SorobanProvider pubKey="GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF">
          <SorobanConsumer />
        </SorobanProvider>
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SorobanConsumer"));
    expect(screen.getByTestId("SorobanConsumer")).toHaveTextContent(
      "soroban-rpc-pubnet-prd.soroban-rpc-pubnet-prd.svc.cluster.local",
    );
  });
});
