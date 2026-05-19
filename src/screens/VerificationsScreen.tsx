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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getPendingVerifications, approveGame, rejectGame, getUser } from '../lib/db';
import { notifyGameVerified, notifyGameRejected } from '../lib/notifications';
import { Game, User } from '../types';

interface Props {
  onBack: () => void;
}

interface GameWithOwner {
  game: Game;
  owner: User | null;
}

export default function VerificationsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<GameWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const games = await getPendingVerifications(user.uid);
    const withOwners = await Promise.all(
      games.map(async (g) => ({ game: g, owner: await getUser(g.userId) }))
    );
    setItems(withOwners);
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleApprove(gameId: string) {
    if (!user) return;
    setActionLoading(gameId);
    try {
      const item = items.find((i) => i.game.id === gameId);
      await approveGame(gameId, user.uid);
      setItems((prev) => prev.filter((i) => i.game.id !== gameId));
      Alert.alert('Verified!', 'Stats have been counted.');
      if (item) notifyGameVerified(item.game.userId, user.uid);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(gameId: string) {
    if (!user) return;
    Alert.alert('Reject Game?', 'Are you sure you want to reject this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(gameId);
          try {
            const item = items.find((i) => i.game.id === gameId);
            await rejectGame(gameId, user.uid);
            if (item) notifyGameRejected(item.game.userId, user.uid);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c9a844" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Verifications</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.game.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const { game, owner } = item;
          const totalCaps = game.capsMade + game.bounces + (game.floaters ?? 0) + (game.gameWinners ?? 0) + (game.rebuttals ?? 0);
          const date = new Date(game.date).toLocaleDateString();
          const isActioning = actionLoading === game.id;
          return (
            <View style={styles.card}>
              <View style={styles.ownerRow}>
                <View style={styles.ownerAvatar}>
                  {owner?.photoURL
                    ? <Image source={{ uri: owner.photoURL }} style={styles.ownerAvatarImage} />
                    : <Text style={styles.ownerAvatarText}>{(owner?.displayName ?? '?').charAt(0).toUpperCase()}</Text>}
                </View>
                <View>
                  <Text style={styles.ownerName}>{owner?.displayName ?? 'Unknown'}</Text>
                  <Text style={styles.ownerUsername}>@{owner?.username ?? '?'}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statItem}>{totalCaps} caps</Text>
                {game.bounces > 0 && <Text style={styles.bounceTag}>{game.bounces} bounce{game.bounces > 1 ? 's' : ''}</Text>}
                {(game.floaters ?? 0) > 0 && <Text style={styles.bounceTag}>{game.floaters} floater{game.floaters !== 1 ? 's' : ''}</Text>}
                {(game.gameWinners ?? 0) > 0 && <Text style={styles.bounceTag}>{game.gameWinners} game winner{game.gameWinners !== 1 ? 's' : ''}</Text>}
                {(game.rebuttals ?? 0) > 0 && <Text style={styles.bounceTag}>{game.rebuttals} rebuttal{game.rebuttals !== 1 ? 's' : ''}</Text>}
                <Text style={[styles.resultTag, game.result === 'win' ? styles.win : styles.loss]}>
                  {game.result.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.date}>{date}</Text>
              {game.notes ? <Text style={styles.notes}>"{game.notes}"</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(game.id)}
                  disabled={isActioning}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(game.id)}
                  disabled={isActioning}
                >
                  {isActioning ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.approveText}>Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No pending verifications. You're all caught up.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f2e' },
  header: { padding: 24, paddingBottom: 12 },
  backButton: { color: '#c9a844', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  card: {
    backgroundColor: '#111d4a',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  ownerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ownerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#c9a844', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  ownerAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  ownerAvatarText: { color: '#000', fontWeight: '800', fontSize: 17 },
  ownerName: { color: '#fff', fontWeight: '700', fontSize: 17 },
  ownerUsername: { color: '#888', fontSize: 13 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  statItem: { color: '#c9a844', fontWeight: '800', fontSize: 20 },
  bounceTag: { color: '#888', fontSize: 13 },
  resultTag: { fontWeight: '700', fontSize: 14 },
  win: { color: '#4caf50' },
  loss: { color: '#f44336' },
  date: { color: '#555', fontSize: 13, marginBottom: 6 },
  notes: { color: '#888', fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  rejectBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#2b0d0d',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  rejectText: { color: '#f44336', fontWeight: '700' },
  approveBtn: {
    flex: 2,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#c9a844',
  },
  approveText: { color: '#000', fontWeight: '800', fontSize: 15 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
