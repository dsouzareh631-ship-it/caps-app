import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LogGameScreen from './src/screens/LogGameScreen';
import VerificationsScreen from './src/screens/VerificationsScreen';

const Tab = createBottomTabNavigator();

type AuthScreen = 'login' | 'signup';
type AppModal = 'logGame' | 'verifications' | null;

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Leaderboard: '🏆',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function MainTabs({
  onLogGame,
  onViewVerifications,
}: {
  onLogGame: () => void;
  onViewVerifications: () => void;
}) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0f2e',
          borderTopColor: '#1e2d6b',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarActiveTintColor: '#c9a844',
        tabBarInactiveTintColor: '#4a5080',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen onLogGame={onLogGame} onViewVerifications={onViewVerifications} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthFlow() {
  const [screen, setScreen] = useState<AuthScreen>('login');
  if (screen === 'login') {
    return <LoginScreen onNavigateToSignUp={() => setScreen('signup')} />;
  }
  return <SignUpScreen onNavigateToLogin={() => setScreen('login')} />;
}

export default function App() {
  const { user, loading } = useAuth();
  const [modal, setModal] = useState<AppModal>(null);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#c9a844" size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthFlow />
      </NavigationContainer>
    );
  }

  if (modal === 'logGame') {
    return (
      <LogGameScreen
        onSuccess={() => setModal(null)}
        onBack={() => setModal(null)}
      />
    );
  }

  if (modal === 'verifications') {
    return <VerificationsScreen onBack={() => setModal(null)} />;
  }

  return (
    <NavigationContainer>
      <MainTabs
        onLogGame={() => setModal('logGame')}
        onViewVerifications={() => setModal('verifications')}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0f2e',
  },
});
