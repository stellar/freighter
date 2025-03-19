import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { TokenWarning } from "../WarningMessages";
import { Wrapper } from "popup/__testHelpers__";
import { ActionStatus } from "@shared/api/types";
import { ROUTES } from "popup/constants/routes";

describe("Token Warning", () => {
  it("should correctly label warning as token", async () => {
    render(
      <Wrapper
        routes={[ROUTES.addAsset]}
        state={{
          settings: {
            submitStatus: ActionStatus.IDLE,
          },
        }}
      >
        <TokenWarning
          domain="example.com"
          code="E2E"
          onClose={() => {}}
          isVerifiedToken={true}
          verifiedLists={[]}
          handleAddToken={() => Promise.resolve()}
          isCustomToken={true}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("TokenWarning"));
    expect(screen.getByTestId("DescriptionLabel")).toHaveTextContent(
      "Add Asset",
    );
    expect(screen.getByTestId("add-asset")).toHaveTextContent("Add asset");
  });
  it("should correctly label warning as asset trustline", async () => {
    render(
      <Wrapper
        routes={[ROUTES.addAsset]}
        state={{
          settings: {
            submitStatus: ActionStatus.IDLE,
          },
        }}
      >
        <TokenWarning
          domain="example.com"
          code="E2E"
          onClose={() => {}}
          isVerifiedToken={true}
          verifiedLists={[]}
          handleAddToken={() => Promise.resolve()}
          isCustomToken={false}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("TokenWarning"));
    expect(screen.getByTestId("DescriptionLabel")).toHaveTextContent(
      "Add Asset Trustline",
    );
    expect(screen.getByTestId("add-asset")).toHaveTextContent("Add asset");
  });
});
