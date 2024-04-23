import React from "react";
import {
  Platform,
  View as RNView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Colors } from "react-native/Libraries/NewAppScreen";

export const Welcome = () => {
  const Component = Platform.select({
    ios: () => {
      const styles = StyleSheet.create({
        button: {
          marginTop: 24,
          backgroundColor: "#7c66dc",
          borderRadius: 4,
          paddingVertical: 12,
          paddingHorizontal: 20,
        },
        buttonImport: {
          marginTop: 24,
          backgroundColor: "#161618",
          borderRadius: 4,
          paddingVertical: 12,
          paddingHorizontal: 20,
        },
        buttonText: {
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
        },
        title: {
          color: Colors.white,
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 32,
        },
        importCard: {
          backgroundColor: "black",
          borderRadius: 4,
          borderWidth: 1,
          borderColor: "#2e2e2e",
          paddingVertical: 24,
          paddingHorizontal: 10,
          marginTop: 24,
          width: "95%",
          height: 160,
        },
        createCard: {
          backgroundColor: "#161618",
          borderRadius: 4,
          borderWidth: 1,
          borderColor: "#2e2e2e",
          paddingVertical: 24,
          paddingHorizontal: 10,
          marginTop: 64,
          width: "95%",
          height: 160,
        },
        cardTextTitle: {
          color: Colors.white,
          fontSize: 16,
          fontWeight: "bold",
        },
        cardText: {
          color: Colors.white,
          fontSize: 14,
          marginTop: 12,
        },
      });
      return (
        <React.Fragment>
          <Text style={styles.title}>
            Welcome! Is this your first time using Freighter?
          </Text>
          <RNView style={styles.createCard}>
            <Text style={styles.cardTextTitle}>I'm new!</Text>
            <Text style={styles.cardText}>I'm going to need a seed phrase</Text>
            <TouchableOpacity
              onPress={() => console.log("pressed create!")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Create Wallet</Text>
            </TouchableOpacity>
          </RNView>
          <RNView style={styles.importCard}>
            <Text style={styles.cardTextTitle}>I've done this before</Text>
            <Text style={styles.cardText}>I have my 12 word seed phrase</Text>
            <TouchableOpacity
              onPress={() => console.log("pressed import!")}
              style={styles.buttonImport}
            >
              <Text style={styles.buttonText}>Import Wallet</Text>
            </TouchableOpacity>
          </RNView>
        </React.Fragment>
      );
    },
    web: () => import("./welcome-web") as any,
  })!;

  return <Component />;
};
