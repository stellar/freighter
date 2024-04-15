import React from "react";
import { Platform, Text, Colors } from "react-native";

export const TestComponent = () => {
  const Component = Platform.select({
    ios: () => (
      <Text style={{ color: Colors.black }}>
        Hello! from React Native on IOS
      </Text>
    ),
    web: () => <h1 style={{ color: "black" }}>Hello from a web browser</h1>,
  });

  return <Component />;
};
