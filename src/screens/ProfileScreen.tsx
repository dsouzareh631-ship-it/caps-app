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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getUser, getUserGames, updateUserProfile, getHeadToHead, isUsernameTaken, uploadProfilePhoto, updateUserPhotoURL } from '../lib/db';
import { logOut, deleteAccount } from '../lib/auth';
import { User, Game, Group } from '../types';

interface Props {
  uid?: string;
  onBack?: () => void;
  onViewGame?: (gameId: string) => void;
  groups?: Group[];
}

export default function ProfileScreen({ uid: viewUid, onBack, onViewGame, groups }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isOwnProfile = !viewUid || viewUid === user?.uid;
  const targetUid = viewUid ?? user?.uid ?? '';
  const [h2h, setH2h] = useState<{ wins: number; losses: number } | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!targetUid) return;
    const [p, g] = await Promise.all([getUser(targetUid), getUserGames(targetUid)]);
    setProfile(p);
    setGames(g);
    if (!isOwnProfile && user) {
      const record = await getHeadToHead(user.uid, targetUid);
      setH2h(record);
    }
  }, [targetUid, isOwnProfile, user]);

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
    const cleanUsername = editUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    setSaving(true);
    try {
      if (await isUsernameTaken(cleanUsername, user.uid)) {
        Alert.alert('Error', 'That username is already taken.');
        return;
      }
      await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        username: cleanUsername,
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

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and remove you from all groups. Your logged games will remain for other players. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'There is no way to recover your account after this.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete',
                style: 'destructive',
                onPress: async () => {
                  if (!user) return;
                  try {
                    await deleteAccount(user.uid);
                  } catch (e: any) {
                    if (e.code === 'auth/requires-recent-login') {
                      Alert.alert('Session Expired', 'Please log out and log back in, then try again.');
                    } else {
                      Alert.alert('Error', e.message);
                    }
                  }
                },
              },
            ]),
        },
      ]
    );
  }

  async function handlePickPhoto() {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(user.uid, result.assets[0].uri);
      await updateUserPhotoURL(user.uid, url);
      await load();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
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
      style={[styles.container, { paddingTop: insets.top }]}
      data={games}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
      ListHeaderComponent={
        <>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.profileHeader}>
            {isOwnProfile ? (
              <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} style={styles.avatar}>
                {uploadingPhoto ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{profile?.displayName.charAt(0).toUpperCase()}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.avatar}>
                {profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{profile?.displayName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>{profile?.displayName}</Text>
              {h2h && (
                <Text style={styles.h2hBadge}>
                  vs. You: {h2h.wins}W-{h2h.losses}L
                </Text>
              )}
            </View>
            {isOwnProfile && (
              <TouchableOpacity onPress={startEditing} style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
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
        const groupName = groups?.find(g =>
          item.players.some(uid => uid !== targetUid && g.members.includes(uid))
        )?.name ?? null;
        return (
          <TouchableOpacity style={styles.gameRow} onPress={() => onViewGame?.(item.id)} activeOpacity={onViewGame ? 0.7 : 1}>
            <View style={styles.gameLeft}>
              <Text style={styles.gameDate}>{date}</Text>
              <Text style={styles.gameCaps}>{totalCaps} caps</Text>
              {item.bounces > 0 && (
                <Text style={styles.bounceNote}>{item.bounces} bounce{item.bounces > 1 ? 's' : ''} *</Text>
              )}
              {item.notes ? <Text style={styles.gameNotes}>"{item.notes}"</Text> : null}
            </View>
            <View style={styles.gameRight}>
              {groupName && <Text style={styles.groupTag}>{groupName}</Text>}
              <Text style={[styles.gameResult, item.result === 'win' ? styles.win : styles.loss]}>
                {item.result.toUpperCase()}
              </Text>
              <Text style={[styles.gameStatus, item.status === 'pending' ? styles.pendingText : item.status === 'verified' ? styles.verifiedText : styles.rejectedText]}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>No games logged yet.</Text>}
      ListFooterComponent={
        isOwnProfile ? (
          <View>
            <TouchableOpacity style={styles.logOutButton} onPress={handleLogOut}>
              <Text style={styles.logOutText}>Log Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f2e' },
  backButton: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 },
  backButtonText: { color: '#c9a844', fontSize: 16 },
  h2hBadge: { color: '#c9a844', fontSize: 12, fontWeight: '700', marginTop: 4 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#c9a844', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
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
  groupTag: { color: '#c9a844', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gameResult: { fontWeight: '800', fontSize: 15 },
  win: { color: '#4caf50' },
  loss: { color: '#f44336' },
  gameStatus: { fontSize: 11, fontWeight: '600' },
  pendingText: { color: '#888' },
  verifiedText: { color: '#4caf50' },
  rejectedText: { color: '#f44336' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
  logOutButton: { marginHorizontal: 24, marginTop: 24, marginBottom: 8, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  logOutText: { color: '#888', fontWeight: '600', fontSize: 15 },
  deleteAccountButton: { marginHorizontal: 24, marginBottom: 40, borderRadius: 12, padding: 16, alignItems: 'center' },
  deleteAccountText: { color: '#f44336', fontWeight: '600', fontSize: 14 },
});
