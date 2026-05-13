import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import { getUserGroups } from './src/lib/db';
import { Group, User } from './src/types';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LogGameScreen from './src/screens/LogGameScreen';
import VerificationsScreen from './src/screens/VerificationsScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import GroupSetupScreen from './src/screens/GroupSetupScreen';
import GroupsScreen from './src/screens/GroupsScreen';

const Tab = createBottomTabNavigator();

type AuthScreen = 'login' | 'signup';
type AppModal = 'logGame' | 'verifications' | null;

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Leaderboard: '🏆',
    Groups: '👥',
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
  onViewPlayer,
  onViewGame,
  activeGroup,
  allGroups,
  activeGroupIndex,
  onSwitchGroup,
  onSwitchGroupIndex,
  onJoinOrCreate,
}: {
  onLogGame: () => void;
  onViewVerifications: () => void;
  onViewPlayer: (uid: string) => void;
  onViewGame: (gameId: string) => void;
  activeGroup: Group;
  allGroups: Group[];
  activeGroupIndex: number;
  onSwitchGroup: () => void;
  onSwitchGroupIndex: (index: number) => void;
  onJoinOrCreate: () => void;
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
          <HomeScreen
            onLogGame={onLogGame}
            onViewVerifications={onViewVerifications}
            onViewGame={onViewGame}
            activeGroup={activeGroup}
            showGroupSwitcher={allGroups.length > 1}
            onSwitchGroup={onSwitchGroup}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Leaderboard">
        {() => (
          <LeaderboardScreen
            onViewPlayer={onViewPlayer}
            activeGroup={activeGroup}
            allGroups={allGroups}
            onSwitchGroup={onSwitchGroup}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Groups">
        {() => (
          <GroupsScreen
            groups={allGroups}
            activeGroupId={activeGroup.id}
            onSwitchGroup={onSwitchGroupIndex}
            onJoinOrCreate={onJoinOrCreate}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen onViewGame={onViewGame} />}
      </Tab.Screen>
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
  const [viewingPlayer, setViewingPlayer] = useState<string | null>(null);
  const [viewingGame, setViewingGame] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setGroupsLoading(true);
    try {
      const g = await getUserGroups(user.uid);
      setGroups(g);
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadGroups();
    else setGroupsLoading(false);
  }, [user, loadGroups]);

  if (loading || groupsLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color="#c9a844" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthFlow />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  if (groups.length === 0) {
    return (
      <SafeAreaProvider>
        <GroupSetupScreen
          onDone={(group) => {
            setGroups([group]);
            setActiveGroupIndex(0);
          }}
        />
      </SafeAreaProvider>
    );
  }

  const activeGroup = groups[activeGroupIndex] ?? groups[0];

  if (modal === 'logGame') {
    return (
      <SafeAreaProvider>
        <LogGameScreen
          onSuccess={() => setModal(null)}
          onBack={() => setModal(null)}
          activeGroup={activeGroup}
        />
      </SafeAreaProvider>
    );
  }

  if (modal === 'verifications') {
    return (
      <SafeAreaProvider>
        <VerificationsScreen onBack={() => setModal(null)} />
      </SafeAreaProvider>
    );
  }

  if (viewingGame) {
    return (
      <SafeAreaProvider>
        <GameDetailScreen gameId={viewingGame} onBack={() => setViewingGame(null)} />
      </SafeAreaProvider>
    );
  }

  if (viewingPlayer) {
    return (
      <SafeAreaProvider>
        <ProfileScreen
          uid={viewingPlayer}
          onBack={() => setViewingPlayer(null)}
          onViewGame={(gameId) => setViewingGame(gameId)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabs
          onLogGame={() => setModal('logGame')}
          onViewVerifications={() => setModal('verifications')}
          onViewPlayer={(uid) => setViewingPlayer(uid)}
          onViewGame={(gameId) => setViewingGame(gameId)}
          activeGroup={activeGroup}
          allGroups={groups}
          activeGroupIndex={activeGroupIndex}
          onSwitchGroup={() => setShowGroupSwitcher(true)}
          onSwitchGroupIndex={(index) => setActiveGroupIndex(index)}
          onJoinOrCreate={() => setGroups([])}
        />
      </NavigationContainer>
      <Modal visible={showGroupSwitcher} transparent animationType="fade" onRequestClose={() => setShowGroupSwitcher(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGroupSwitcher(false)}>
          <View style={styles.switcherCard}>
            <Text style={styles.switcherTitle}>Switch Group</Text>
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.switcherItem, index === activeGroupIndex && styles.switcherItemActive]}
                  onPress={() => {
                    setActiveGroupIndex(index);
                    setShowGroupSwitcher(false);
                  }}
                >
                  <Text style={styles.switcherItemName}>{item.name}</Text>
                  <Text style={styles.switcherItemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.switcherJoin}
              onPress={() => {
                setShowGroupSwitcher(false);
                setGroups([]);
              }}
            >
              <Text style={styles.switcherJoinText}>+ Join Another Group</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0f2e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  switcherCard: {
    backgroundColor: '#111d4a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  switcherTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 16 },
  switcherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#0a0f2e',
  },
  switcherItemActive: { borderWidth: 1, borderColor: '#c9a844' },
  switcherItemName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  switcherItemCode: { color: '#555', fontSize: 13 },
  switcherJoin: { marginTop: 8, padding: 14, alignItems: 'center' },
  switcherJoinText: { color: '#c9a844', fontWeight: '600', fontSize: 14 },
});
