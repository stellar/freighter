import React from "react";
import { FlexAlignType, Platform, Text, View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Provider } from "react-redux";
import "react-native-reanimated";

import serviceLayerTest from "@/platform/service";
import Button from "@/components/ui/Button";

import { useColorScheme } from "@/hooks/useColorScheme";
import { store } from "@shared/view/store";

import "./root-styles.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const styles = {
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as FlexAlignType,
  },
  webContainer: {
    // Web-specific styles
    width: 300,
    height: 400,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    console.log("runing effect");
    console.log(serviceLayerTest);
    serviceLayerTest();
    console.log("effect done");
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        <View
          style={[
            styles.container,
            Platform.OS === "web" && styles.webContainer,
          ]}
        >
          <Text>Freighter</Text>
          <Button />
        </View>
      </ThemeProvider>
    </Provider>
  );
}
