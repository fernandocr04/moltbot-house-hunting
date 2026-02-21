import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './src/screens/HomeScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import FiltersScreen from './src/screens/FiltersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { COLORS } from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background, elevation: 0, shadowOpacity: 0 },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreen}
          options={{ title: 'Property', headerBackTitle: '' }}
        />
        <Stack.Screen
          name="Filters"
          component={FiltersScreen}
          options={{ title: 'Filters', headerBackTitle: '' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', headerBackTitle: '' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
