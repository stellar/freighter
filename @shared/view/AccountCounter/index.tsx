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

  const loadFromKeychain = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: "freighter_service",
      });
      console.log("Keychain LOAD 2 result:", credentials);
      if (credentials) {
        const { count: savedCount } = JSON.parse(credentials.password);
        console.log("Successfully loaded from keychain 2:", { savedCount });
      } else {
        console.log("No saved credentials found in keychain 2");
      }
    } catch (error) {
      console.error("Error loading from keychain 2:", error);
    }
  };

  // Load initial count from Keychain when component mounts
  useEffect(() => {
    const loadInitialCount = async () => {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: "freighter_service",
        });
        console.log("Keychain LOAD 1 result:", credentials);
        if (credentials) {
          const { count: savedCount } = JSON.parse(credentials.password);
          console.log("Successfully loaded from keychain 1:", { savedCount });
          dispatch(incrementByAmount(savedCount)); // Set initial state from keychain
        }
      } catch (error) {
        console.error("Error loading initial count from keychain 1:", error);
      }
    };

    loadInitialCount();
  }, []); // Empty dependency array means this runs once on mount

  // Save count to Keychain whenever it changes
  useEffect(() => {
    const saveToKeychain = async () => {
      try {
        const result = await Keychain.setGenericPassword(
          "freighter_account_count",
          JSON.stringify({ count }),
          { service: "freighter_service" },
        );
        console.log("Keychain SET result:", result);
      } catch (error) {
        console.error("Error saving to keychain:", error);
      }
    };

    saveToKeychain();
  }, [count, accountName]);

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
