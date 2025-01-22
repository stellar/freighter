import { useEffect } from "react";
import { Linking } from "react-native";

// to be used in NavigationContainer
/*
  <NavigationContainer linking={linking}>
    ...Your navigation structure...
  </NavigationContainer>
*/
const linking = {
  prefixes: ["https://www.freighter.app/", "freighter://"],
  config: {
    screens: {
      Sign: "sign/:data",
      Home: "/",
    },
  },
};

const watchUrl = () => {
  useEffect(() => {
    async function watch() {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log("Initial URL:", url);
        const unsubscribe = Linking.addEventListener("url", (event) => {
          console.log("Received URL:", event.url);
          // parse/validate/handle URL API calls
        });
        return () => unsubscribe.remove();
      }
    }
    watch();
  }, []);
};

export { linking, watchUrl };
