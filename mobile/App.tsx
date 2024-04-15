/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {Welcome} from 'extension/src/popup/views/Welcome';

function App(): React.JSX.Element {
  const backgroundStyle = {
    flex: 1,
    backgroundColor: Colors.black,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: Colors.black,
            height: 100,
            display: 'flex',
            alignItems: 'center',
            marginTop: 48,
          }}>
          <Welcome />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
