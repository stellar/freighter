import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { ContactBook } from "../ContactBook";

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    Federation: { Server: { resolve: jest.fn() } },
  };
});

jest.mock("popup/components/identicons/IdenticonImg", () => ({
  IdenticonImg: ({ publicKey }: { publicKey: string }) => (
    <div data-testid={`identicon-${publicKey}`} />
  ),
}));

jest.mock("helpers/stellar", () => ({
  isValidStellarAddress: jest.fn(() => true),
  isFederationAddress: jest.fn(() => false),
  truncatedPublicKey: jest.fn(
    (key: string) => key.slice(0, 4) + "..." + key.slice(-4),
  ),
}));

const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: any[]) => mockToastSuccess(...args) },
  Toaster: (props: any) => <div data-testid="sonner-toaster" {...props} />,
}));

const mockClipboardWriteText = jest.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: { writeText: mockClipboardWriteText },
});

const VALID_ADDRESS_1 =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const VALID_ADDRESS_2 =
  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";
const VALID_ADDRESS_3 =
  "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX";

const renderContactBook = () =>
  render(
    <Wrapper
      routes={[ROUTES.contactBook]}
      state={{
        auth: {
          error: null,
          applicationState: APPLICATION_STATE.PASSWORD_CREATED,
          publicKey: "G1",
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
      }}
    >
      <ContactBook />
    </Wrapper>,
  );

const { isValidStellarAddress } = jest.requireMock("helpers/stellar");
const { isFederationAddress } = jest.requireMock("helpers/stellar");
const { Federation } = jest.requireMock("stellar-sdk");

/**
 * Helper: add a contact via the UI (opens modal, fills fields, clicks Save).
 * Must be called after renderContactBook().
 */
const addContactViaUI = async (address: string, name: string) => {
  const plusButton = document.querySelector(".ContactBook__add-button")!;
  fireEvent.click(plusButton);

  const addressInput = screen.getByPlaceholderText("Address");
  const nameInput = screen.getByPlaceholderText("Name");

  fireEvent.change(addressInput, { target: { value: address } });
  fireEvent.blur(addressInput);
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.blur(nameInput);

  await waitFor(() => {
    expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
  });

  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => {
    expect(screen.getByText(name)).toBeInTheDocument();
  });
};

describe("ContactBook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isValidStellarAddress as jest.Mock).mockReturnValue(true);
  });

  describe("Empty State", () => {
    it("shows empty state when no contacts exist", () => {
      renderContactBook();

      expect(
        screen.getByText(
          "Contacts are wallets you recognize, helpful for recurring or trusted sends.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Add a Contact")).toBeInTheDocument();
    });

    it("can add contact from empty state button", async () => {
      renderContactBook();

      fireEvent.click(screen.getByText("Add a Contact"));

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: { value: VALID_ADDRESS_1 },
      });

      fireEvent.change(nameInput, { target: { value: "New Contact" } });

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("New Contact")).toBeInTheDocument();
      });
    });

    it("shows empty state after all contacts are deleted", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Delete contact"));

      expect(
        screen.getByText(
          "Contacts are wallets you recognize, helpful for recurring or trusted sends.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Add Contact Flow", () => {
    it("opens add modal when plus button is clicked", () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("adds a new contact successfully", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "New Friend" } });

      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("New Friend")).toBeInTheDocument();
      });
    });

    it("shows toast when contact is added", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "New Friend" } });

      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Contact successfully added",
          {
            toasterId: "contact-book-toaster",
            className: "ContactBook__toast",
          },
        );
      });
    });

    it("closes modal when Cancel is clicked", () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");

      fireEvent.click(screen.getByText("Cancel"));

      expect(
        document.querySelector(".EditContactCard__title"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Contact List", () => {
    it("renders contacts after adding them", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(screen.getByText("Piyal")).toBeInTheDocument();
      expect(screen.getByText("Cassio")).toBeInTheDocument();
    });

    it("shows truncated addresses for contacts", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(
        screen.getByText(
          VALID_ADDRESS_1.slice(0, 4) + "..." + VALID_ADDRESS_1.slice(-4),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          VALID_ADDRESS_2.slice(0, 4) + "..." + VALID_ADDRESS_2.slice(-4),
        ),
      ).toBeInTheDocument();
    });

    it("renders identicons for each contact", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(
        screen.getByTestId(`identicon-${VALID_ADDRESS_1}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`identicon-${VALID_ADDRESS_2}`),
      ).toBeInTheDocument();
    });

    it("renders contacts sorted alphabetically by name", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Zebra");
      await addContactViaUI(VALID_ADDRESS_2, "Alpha");
      await addContactViaUI(VALID_ADDRESS_3, "Middle");

      const names = document.querySelectorAll(".ContactBook__row__name");
      expect(names[0]).toHaveTextContent("Alpha");
      expect(names[1]).toHaveTextContent("Middle");
      expect(names[2]).toHaveTextContent("Zebra");
    });

    it("uses resolved address for identicon when contact is a federation address", async () => {
      const FEDERATION_ADDRESS = "bob*stellar.org";
      const RESOLVED_ADDRESS = VALID_ADDRESS_1;

      (isFederationAddress as jest.Mock).mockImplementation(
        (addr: string) => addr === FEDERATION_ADDRESS,
      );
      (Federation.Server.resolve as jest.Mock).mockResolvedValue({
        account_id: RESOLVED_ADDRESS,
      });

      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Bob" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Bob")).toBeInTheDocument();
      });

      expect(
        screen.getByTestId(`identicon-${RESOLVED_ADDRESS}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`identicon-${FEDERATION_ADDRESS}`),
      ).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("Save button is disabled when fields are empty", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is disabled when only address is filled", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is disabled when only name is filled", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "Alice" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is enabled when both fields are valid", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.change(nameInput, { target: { value: "New Contact" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("shows error for invalid Stellar address", async () => {
      (isValidStellarAddress as jest.Mock).mockReturnValue(false);

      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: { value: "INVALIDADDRESS" },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(screen.getByText("Invalid Stellar address")).toBeInTheDocument();
      });
    });

    it("shows error for empty name", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(nameInput, { target: { value: " " } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Name cannot be empty")).toBeInTheDocument();
      });
    });

    it("shows duplicate address error", async () => {
      renderContactBook();

      // First add a contact
      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      // Now try to add another contact with the same address
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: { value: VALID_ADDRESS_1 },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(
          screen.getByText("This address already exists in your contacts"),
        ).toBeInTheDocument();
      });
    });

    it("shows duplicate name error", async () => {
      renderContactBook();

      // First add a contact
      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      // Now try to add another contact with the same name
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "Piyal" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(
          screen.getByText("This name already exists in your contacts"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Contact Menu Actions", () => {
    it("opens context menu when dots button is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);

      expect(screen.getByText("Edit contact")).toBeInTheDocument();
      expect(screen.getByText("Copy address")).toBeInTheDocument();
      expect(screen.getByText("Delete contact")).toBeInTheDocument();
    });

    it("copies address when Copy address is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Copy address"));

      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalledWith(VALID_ADDRESS_1);
        expect(mockToastSuccess).toHaveBeenCalledWith("Address copied", {
          toasterId: "contact-book-toaster",
          className: "ContactBook__toast",
        });
      });
    });

    it("deletes contact when Delete contact is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      const menuTriggers = document.querySelectorAll(
        ".ContactBook__row__menu-trigger",
      );
      fireEvent.click(menuTriggers[0]);
      fireEvent.click(screen.getByText("Delete contact"));

      expect(screen.queryByText("Cassio")).not.toBeInTheDocument();
      expect(screen.getByText("Piyal")).toBeInTheDocument();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Contact successfully deleted",
        {
          toasterId: "contact-book-toaster",
          className: "ContactBook__toast",
        },
      );
    });

    it("opens edit modal with pre-filled data", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit contact"));

      expect(screen.getByText("Edit a Contact")).toBeInTheDocument();
      expect(screen.getByDisplayValue(VALID_ADDRESS_1)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Piyal")).toBeInTheDocument();
    });

    it("saves edited contact", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit contact"));

      const nameInput = screen.getByDisplayValue("Piyal");
      fireEvent.change(nameInput, { target: { value: "Piyal Updated" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Piyal Updated")).toBeInTheDocument();
        expect(screen.queryByText("Piyal")).not.toBeInTheDocument();
      });
    });
  });

  describe("Federation Addresses", () => {
    const FEDERATION_ADDRESS = "alice*example.com";
    const RESOLVED_KEY = VALID_ADDRESS_3;

    beforeEach(() => {
      (isFederationAddress as jest.Mock).mockImplementation((addr: string) =>
        addr.includes("*"),
      );
      (Federation.Server.resolve as jest.Mock).mockResolvedValue({
        account_id: RESOLVED_KEY,
      });
    });

    it("accepts a valid federation address and enables Save", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      expect(
        screen.queryByText("Invalid Stellar address"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Failed to resolve federated address"),
      ).not.toBeInTheDocument();
    });

    it("resolves federation address and saves contact with resolved key", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // The identicon should use the resolved public key, not the federation address
      expect(
        screen.getByTestId(`identicon-${RESOLVED_KEY}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`identicon-${FEDERATION_ADDRESS}`),
      ).not.toBeInTheDocument();
    });

    it("shows error when federation resolution fails", async () => {
      (Federation.Server.resolve as jest.Mock).mockRejectedValue(
        new Error("Not found"),
      );

      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to resolve federated address"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Save").closest("button")).toBeDisabled();
    });

    it("calls Federation.Server.resolve with the federation address", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(Federation.Server.resolve).toHaveBeenCalledWith(
          FEDERATION_ADDRESS,
        );
      });
    });

    it("prevents duplicate federation addresses", async () => {
      renderContactBook();

      // Add a contact with the federation address first
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // Try to add the same federation address again
      fireEvent.click(document.querySelector(".ContactBook__add-button")!);

      const addressInput2 = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput2, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput2);

      await waitFor(() => {
        expect(
          screen.getByText("This address already exists in your contacts"),
        ).toBeInTheDocument();
      });
    });

    it("prevents adding a federation address whose resolved key matches an existing contact", async () => {
      renderContactBook();

      // Add a contact with the raw public key
      await addContactViaUI(RESOLVED_KEY, "Direct Key");

      // Now try to add a federation address that resolves to the same key
      fireEvent.click(document.querySelector(".ContactBook__add-button")!);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);

      // Wait for federation resolution to complete before interacting with name
      await waitFor(() => {
        expect(Federation.Server.resolve).toHaveBeenCalledWith(
          FEDERATION_ADDRESS,
        );
      });

      fireEvent.change(nameInput, { target: { value: "Alice Fed" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(
          screen.getByText("This address already exists in your contacts"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Save").closest("button")).toBeDisabled();
    });

    it("prevents adding a federation address whose resolved key matches another contact's resolved address", async () => {
      const FEDERATION_ADDRESS_2 = "bob*example.com";

      renderContactBook();

      // Add a federation contact first
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput);
      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // Now try to add a different federation address that resolves to the same key
      fireEvent.click(document.querySelector(".ContactBook__add-button")!);

      const addressInput2 = screen.getByPlaceholderText("Address");
      const nameInput2 = screen.getByPlaceholderText("Name");

      fireEvent.focus(addressInput2);
      fireEvent.change(addressInput2, {
        target: { value: FEDERATION_ADDRESS_2 },
      });
      fireEvent.blur(addressInput2);

      // Wait for federation resolution to complete before interacting with name
      await waitFor(() => {
        expect(Federation.Server.resolve).toHaveBeenCalledWith(
          FEDERATION_ADDRESS_2,
        );
      });

      fireEvent.change(nameInput2, { target: { value: "Bob" } });
      fireEvent.blur(nameInput2);

      await waitFor(() => {
        expect(
          screen.getByText("This address already exists in your contacts"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Save").closest("button")).toBeDisabled();
    });

    it("does not call Federation.Server.resolve for regular addresses", async () => {
      (isFederationAddress as jest.Mock).mockReturnValue(false);

      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: { value: VALID_ADDRESS_1 },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(Federation.Server.resolve).not.toHaveBeenCalled();
      });
    });

    it("displays federation address (not resolved key) in the contact row", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // The contact row should show the truncated federation address as the key
      expect(
        screen.getByText(
          FEDERATION_ADDRESS.slice(0, 4) + "..." + FEDERATION_ADDRESS.slice(-4),
        ),
      ).toBeInTheDocument();
    });

    it("can edit a federation address contact", async () => {
      renderContactBook();

      // Add a federation contact
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: { value: FEDERATION_ADDRESS },
      });
      fireEvent.blur(addressInput);
      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // Open edit modal
      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit contact"));

      expect(screen.getByDisplayValue(FEDERATION_ADDRESS)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();

      // Update the name
      const editNameInput = screen.getByDisplayValue("Alice");
      fireEvent.change(editNameInput, {
        target: { value: "Alice Updated" },
      });
      fireEvent.blur(editNameInput);

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Alice Updated")).toBeInTheDocument();
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      });
    });
  });
});
