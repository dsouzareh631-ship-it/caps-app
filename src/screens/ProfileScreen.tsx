import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getUser, getUserGames, updateUserProfile } from '../lib/db';
import { logOut } from '../lib/auth';
import { User, Game } from '../types';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, g] = await Promise.all([getUser(user.uid), getUserGames(user.uid)]);
    setProfile(p);
    setGames(g);
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function startEditing() {
    setEditName(profile?.displayName ?? '');
    setEditUsername(profile?.username ?? '');
    setEditing(true);
  }

  async function handleSave() {
    if (!user) return;
    if (!editName.trim() || !editUsername.trim()) {
      Alert.alert('Error', 'Name and username cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        username: editUsername.trim().toLowerCase(),
      });
      await load();
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogOut() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logOut() },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c9a844" size="large" />
      </View>
    );
  }

  const cpg =
    profile && profile.totalGames > 0
      ? (profile.totalCaps / profile.totalGames).toFixed(2)
      : '0.00';

  const winRate =
    profile && profile.totalGames > 0
      ? ((profile.totalWins / profile.totalGames) * 100).toFixed(0) + '%'
      : '—';

  return (
    <FlatList
      style={styles.container}
      data={games}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
      ListHeaderComponent={
        <>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.displayName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>{profile?.displayName}</Text>
              <Text style={styles.username}>@{profile?.username}</Text>
            </View>
            <TouchableOpacity onPress={startEditing} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {editing && (
            <View style={styles.editForm}>
              <Text style={styles.editLabel}>Display Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="#888"
              />
              <Text style={styles.editLabel}>Username</Text>
              <TextInput
                style={styles.editInput}
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
                placeholderTextColor="#888"
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{profile?.totalCaps ?? 0}</Text>
              <Text style={styles.statLbl}>Total Caps</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{cpg}</Text>
              <Text style={styles.statLbl}>CPG</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{profile?.totalGames ?? 0}</Text>
              <Text style={styles.statLbl}>Games</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{profile?.totalWins ?? 0}W</Text>
              <Text style={styles.statLbl}>{profile?.totalLosses ?? 0}L</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{winRate}</Text>
              <Text style={styles.statLbl}>Win Rate</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{profile?.currentWinStreak ?? 0} 🔥</Text>
              <Text style={styles.statLbl}>Streak</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statVal}>{profile?.bestWinStreak ?? 0}</Text>
              <Text style={styles.statLbl}>Best Streak</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Game History</Text>
        </>
      }
      renderItem={({ item }) => {
        const totalCaps = item.capsMade + item.bounces;
        const date = new Date(item.date).toLocaleDateString();
        return (
          <View style={styles.gameRow}>
            <View style={styles.gameLeft}>
              <Text style={styles.gameDate}>{date}</Text>
              <Text style={styles.gameCaps}>{totalCaps} caps</Text>
              {item.bounces > 0 && (
                <Text style={styles.bounceNote}>{item.bounces} bounce{item.bounces > 1 ? 's' : ''} *</Text>
              )}
              {item.notes ? <Text style={styles.gameNotes}>"{item.notes}"</Text> : null}
            </View>
            <View style={styles.gameRight}>
              <Text style={[styles.gameResult, item.result === 'win' ? styles.win : styles.loss]}>
                {item.result.toUpperCase()}
              </Text>
              <Text style={[styles.gameStatus, item.status === 'pending' ? styles.pendingText : item.status === 'verified' ? styles.verifiedText : styles.rejectedText]}>
                {item.status}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>No games logged yet.</Text>}
      ListFooterComponent={
        <TouchableOpacity style={styles.logOutButton} onPress={handleLogOut}>
          <Text style={styles.logOutText}>Log Out</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f2e' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#c9a844', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 28 },
  displayName: { color: '#fff', fontWeight: '700', fontSize: 22 },
  username: { color: '#888', fontSize: 14 },
  editButton: {
    backgroundColor: '#111d4a', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: '#c9a844',
  },
  editButtonText: { color: '#c9a844', fontWeight: '700', fontSize: 13 },
  editForm: {
    backgroundColor: '#111d4a', marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e2d6b',
  },
  editLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  editInput: {
    backgroundColor: '#0a0f2e', color: '#fff', borderRadius: 10, padding: 12,
    fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#1e2d6b',
  },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  cancelText: { color: '#888', fontWeight: '600' },
  saveButton: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center',
    backgroundColor: '#c9a844',
  },
  saveText: { color: '#000', fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statBlock: {
    backgroundColor: '#111d4a', borderRadius: 12, padding: 16,
    minWidth: '30%', flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#1e2d6b',
  },
  statVal: { color: '#c9a844', fontWeight: '800', fontSize: 20 },
  statLbl: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 18, paddingHorizontal: 20, marginBottom: 12 },
  gameRow: {
    backgroundColor: '#111d4a', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#1e2d6b',
  },
  gameLeft: { flex: 1 },
  gameDate: { color: '#555', fontSize: 12, marginBottom: 4 },
  gameCaps: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bounceNote: { color: '#888', fontSize: 12, marginTop: 2 },
  gameNotes: { color: '#666', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  gameRight: { alignItems: 'flex-end', gap: 4 },
  gameResult: { fontWeight: '800', fontSize: 15 },
  win: { color: '#4caf50' },
  loss: { color: '#f44336' },
  gameStatus: { fontSize: 11, fontWeight: '600' },
  pendingText: { color: '#888' },
  verifiedText: { color: '#4caf50' },
  rejectedText: { color: '#f44336' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
  logOutButton: { margin: 24, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  logOutText: { color: '#888', fontWeight: '600', fontSize: 15 },
});
