import React, { useEffect, useState } from "react";
import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Account from "../Account";

const STORAGE_KEY = "@freighter_counter";

interface CounterProps {
  accountName: string;
  textColor: string;
}

export function AccountCounter({ accountName, textColor }: CounterProps) {
  const [keychainCount, setKeychainCount] = useState(0);
  const [asyncCount, setAsyncCount] = useState(0);

  const loadFromKeychain = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: "freighter_service",
      });
      if (credentials) {
        const { count: savedCount } = JSON.parse(credentials.password);
        setKeychainCount(savedCount);
        console.log("Successfully loaded from keychain:", { savedCount });
      }
    } catch (error) {
      console.error("Error loading from keychain:", error);
    }
  };

  const loadFromStorage = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const { count: savedCount } = JSON.parse(savedData);
        setAsyncCount(savedCount);
        console.log("Successfully loaded from AsyncStorage:", { savedCount });
      }
    } catch (error) {
      console.error("Error loading from AsyncStorage:", error);
    }
  };

  // Load initial values when component mounts
  useEffect(() => {
    loadFromKeychain();
    loadFromStorage();
  }, []);

  // Save to Keychain when count changes
  useEffect(() => {
    const saveToKeychain = async () => {
      try {
        await Keychain.setGenericPassword(
          "freighter_account_count",
          JSON.stringify({ count: keychainCount }),
          { service: "freighter_service" },
        );
        console.log("Keychain SET successful");
      } catch (error) {
        console.error("Error saving to Keychain:", error);
      }
    };
    saveToKeychain();
  }, [keychainCount]);

  // Save to AsyncStorage when count changes
  useEffect(() => {
    const saveToStorage = async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ count: asyncCount }),
        );
        console.log("AsyncStorage SET successful");
      } catch (error) {
        console.error("Error saving to AsyncStorage:", error);
      }
    };
    saveToStorage();
  }, [asyncCount]);

  return (
    <Account
      accountName={accountName}
      textColor={textColor}
      keychainCount={keychainCount}
      asyncCount={asyncCount}
      handleIncrement={() => {
        setKeychainCount((prev) => prev + 50);
        setAsyncCount((prev) => prev + 50);
      }}
      handleDecrement={() => {
        setKeychainCount((prev) => prev - 1);
        setAsyncCount((prev) => prev - 1);
      }}
      logFromKeychain={() => {
        loadFromKeychain();
        loadFromStorage();
      }}
    />
  );
}
