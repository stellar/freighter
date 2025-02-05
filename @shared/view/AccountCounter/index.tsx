import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, incrementByAmount } from "../ducks/account";
import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Account from "../Account";

const STORAGE_KEY = "@freighter_counter";

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

  const loadFromStorage = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      console.log("AsyncStorage LOAD 2 result:", savedData);
      if (savedData) {
        const { count: savedCount } = JSON.parse(savedData);
        console.log("Successfully loaded from AsyncStorage 2:", { savedCount });
      } else {
        console.log("No saved data found in AsyncStorage 2");
      }
    } catch (error) {
      console.error("Error loading from AsyncStorage 2:", error);
    }
  };

  // Load initial count from both storages when component mounts
  useEffect(() => {
    const loadInitialCount = async () => {
      try {
        // Load from Keychain
        const credentials = await Keychain.getGenericPassword({
          service: "freighter_service",
        });
        console.log("Keychain LOAD 1 result:", credentials);
        if (credentials) {
          const { count: savedCount } = JSON.parse(credentials.password);
          console.log("Successfully loaded from keychain 1:", { savedCount });
          dispatch(incrementByAmount(savedCount));
        }

        // Load from AsyncStorage
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        console.log("AsyncStorage LOAD 1 result:", savedData);
        if (savedData) {
          const { count: savedCount } = JSON.parse(savedData);
          console.log("Successfully loaded from AsyncStorage 1:", {
            savedCount,
          });
          dispatch(incrementByAmount(savedCount));
        }
      } catch (error) {
        console.error("Error loading initial count:", error);
      }
    };

    loadInitialCount();
  }, []);

  // Save count to both storages whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        // Save to Keychain
        const keychainResult = await Keychain.setGenericPassword(
          "freighter_account_count",
          JSON.stringify({ count }),
          { service: "freighter_service" },
        );
        console.log("Keychain SET result:", keychainResult);

        // Save to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ count }));
        console.log("AsyncStorage SET successful");
      } catch (error) {
        console.error("Error saving data:", error);
      }
    };

    saveData();
  }, [count, accountName]);

  return (
    <Account
      accountName={accountName}
      textColor={textColor}
      count={count}
      handleIncrement={() => dispatch(incrementByAmount(50))}
      handleDecrement={() => dispatch(decrement())}
      logFromKeychain={() => {
        loadFromKeychain();
        loadFromStorage();
      }}
    />
  );
}
