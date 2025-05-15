import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import * as ApiInternal from "@shared/api/internal";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { Discover } from "../Discover";

describe("Discover view", () => {
  it("displays Discover protocols with links that are not blacklisted", async () => {
    jest.spyOn(ApiInternal, "getDiscoverData").mockImplementation(() =>
      Promise.resolve([
        {
          description: "description text",
          name: "Foo",
          iconUrl: "https://example.com/icon.png",
          websiteUrl: "https://foo.com",
          tags: ["tag1", "tag2"],
          isBlacklisted: false,
        },
        {
          description: "description text",
          name: "Baz",
          iconUrl: "https://example.com/icon.png",
          websiteUrl: "https://baz.com",
          tags: ["tag1", "tag2"],
          isBlacklisted: true,
        },
      ]),
    );
    render(
      <Wrapper
        routes={[ROUTES.discover]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Discover />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Discover",
      );
    });
    const protocolLinks = screen.queryAllByTestId("discover-row");

    expect(protocolLinks).toHaveLength(1);
    expect(protocolLinks[0]).toHaveTextContent("Foo");
    expect(screen.getByTestId("discover-row-button")).toHaveAttribute(
      "href",
      "https://foo.com",
    );
  });
});
