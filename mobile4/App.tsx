/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AccountBalance} from './src/views/account-balance';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={{backgroundColor: 'black', height: '100%'}}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="AccountBalance"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen name="AccountBalance" component={AccountBalance} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default App;
