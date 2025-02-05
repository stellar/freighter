import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, incrementByAmount } from "../ducks/account";
import * as Keychain from "react-native-keychain";
import Account from "../Account";

interface CounterProps {
  accountName: string;
  textColor: string;
}

export function AccountCounter({ accountName, textColor }: CounterProps) {
  const count = useSelector((state: any) => state.counter.value);
  const dispatch = useDispatch();

  // Save count to Keychain whenever it changes
  useEffect(() => {
    const saveToKeychain = async () => {
      try {
        const result = await Keychain.setGenericPassword(
          "freighter_account_count",
          JSON.stringify({ count }),
          { service: "freighter_service" },
        );
        console.log("Keychain result:", result);
      } catch (error) {
        console.error("Error saving to keychain:", error);
      }
    };

    saveToKeychain();
  }, [count, accountName]);

  const loadFromKeychain = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: "freighter_service",
      });
      console.log("Credentials:", credentials);
      if (credentials) {
        const { count: savedCount } = JSON.parse(credentials.password);
        console.log("Successfully loaded from keychain:", { savedCount });
      } else {
        console.log("No saved credentials found in keychain");
      }
    } catch (error) {
      console.error("Error loading from keychain:", error);
    }
  };

  return (
    <Account
      accountName={accountName}
      textColor={textColor}
      count={count}
      handleIncrement={() => dispatch(incrementByAmount(50))}
      handleDecrement={() => dispatch(decrement())}
      logFromKeychain={loadFromKeychain}
    />
  );
}
