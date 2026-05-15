import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import * as UseGetAssetDomainsWithBalances from "helpers/hooks/useGetAssetDomainsWithBalances";

describe("ChooseAsset RequestState.ERROR", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the fetch-fail notification without throwing on RequestState.ERROR", () => {
    jest
      .spyOn(
        UseGetAssetDomainsWithBalances,
        "useGetAssetDomainsWithBalances",
      )
      .mockReturnValue({
        state: {
          state: RequestState.ERROR,
          data: null,
          error: new Error("boom"),
        },
        fetchData: jest.fn().mockResolvedValue(undefined),
      } as any);

    render(
      <Wrapper state={{}} routes={["/"]}>
        <ChooseAsset goBack={jest.fn()} />
      </Wrapper>,
    );

    expect(screen.getByTestId("choose-asset-fetch-fail")).toBeInTheDocument();
  });
});
