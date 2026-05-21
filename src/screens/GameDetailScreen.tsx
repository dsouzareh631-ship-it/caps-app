import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Avatar from '../components/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGameById, getUser, deleteGame } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { Game, User } from '../types';

interface Props {
  gameId: string;
  onBack: () => void;
  onViewPlayer?: (uid: string) => void;
  onEdit?: (gameId: string) => void;
}

export default function GameDetailScreen({ gameId, onBack, onViewPlayer, onEdit }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const g = await getGameById(gameId);
      if (!g) { setLoading(false); return; }
      setGame(g);
      const users = await Promise.all(g.players.map((uid) => getUser(uid)));
      setPlayers(users.filter(Boolean) as User[]);
      setLoading(false);
    }
    load();
  }, [gameId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c9a844" size="large" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Game not found.</Text>
      </View>
    );
  }

  const date = new Date(game.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalCaps = game.capsMade + game.bounces + (game.rebuttals ?? 0) + (game.floaters ?? 0) + (game.gameWinners ?? 0);
  const logger = players.find(p => p.uid === game.userId);
  const opponents = players.filter(p => p.uid !== game.userId);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Game Detail</Text>
      </View>

      <View style={styles.resultCard}>
        <Text style={[styles.resultText, game.result === 'win' ? styles.win : styles.loss]}>
          {game.result.toUpperCase()}
        </Text>
        <Text style={styles.dateText}>{date}</Text>
        <Text style={[styles.statusBadge, game.status === 'verified' ? styles.verified : game.status === 'pending' ? styles.pending : styles.rejected]}>
          {game.status.toUpperCase()}
        </Text>
        {user?.uid === game.userId && game.status !== 'verified' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => onEdit?.(gameId)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert('Delete Game', 'Are you sure you want to delete this game? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGame(gameId); onBack(); } },
                ]);
              }}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionLabel}>Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{game.capsMade}</Text>
          <Text style={styles.statLbl}>Caps Made</Text>
        </View>
        {(game.bounces > 0) && (
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{game.bounces}</Text>
            <Text style={styles.statLbl}>Bounces</Text>
          </View>
        )}
        {((game.floaters ?? 0) > 0) && (
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{game.floaters}</Text>
            <Text style={styles.statLbl}>Floaters</Text>
          </View>
        )}
        {((game.gameWinners ?? 0) > 0) && (
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{game.gameWinners}</Text>
            <Text style={styles.statLbl}>Game Winners</Text>
          </View>
        )}
        {((game.rebuttals ?? 0) > 0) && (
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{game.rebuttals}</Text>
            <Text style={styles.statLbl}>Rebuttals</Text>
          </View>
        )}
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalCaps}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
      </View>

      {logger && (
        <>
          <Text style={styles.sectionLabel}>Logged By</Text>
          <View style={styles.playerRow}>
            <Avatar photoURL={logger.photoURL} displayName={logger.displayName} size={40} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{logger.displayName}</Text>
              <Text style={styles.playerUsername}>@{logger.username}</Text>
            </View>
          </View>
        </>
      )}

      {opponents.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Opponents</Text>
          {opponents.map((p) => {
            const approved = game.approvals.includes(p.uid);
            const rejected = game.rejections.includes(p.uid);
            return (
              <TouchableOpacity
                key={p.uid}
                style={styles.playerRow}
                onPress={() => onViewPlayer?.(p.uid)}
                activeOpacity={onViewPlayer ? 0.7 : 1}
              >
                <Avatar photoURL={p.photoURL} displayName={p.displayName} size={40} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{p.displayName}</Text>
                  <Text style={styles.playerUsername}>@{p.username}</Text>
                </View>
                <Text style={styles.playerTag}>
                  {approved ? '✅ verified' : rejected ? '❌ rejected' : '⏳ pending'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {game.notes ? (
        <>
          <Text style={styles.sectionLabel}>Notes</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>"{game.notes}"</Text>
          </View>
        </>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f2e' },
  errorText: { color: '#888', fontSize: 16 },
  header: { padding: 24, paddingBottom: 8 },
  back: { color: '#c9a844', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  resultCard: {
    backgroundColor: '#111d4a', marginHorizontal: 16, borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#1e2d6b',
  },
  resultText: { fontSize: 36, fontWeight: '900', marginBottom: 8 },
  win: { color: '#4caf50' },
  loss: { color: '#f44336' },
  dateText: { color: '#888', fontSize: 14, marginBottom: 10 },
  statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verified: { backgroundColor: '#0d2b0d', color: '#4caf50' },
  pending: { backgroundColor: '#1a1a2e', color: '#888' },
  rejected: { backgroundColor: '#2b0d0d', color: '#f44336' },
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: '#111d4a', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e2d6b',
  },
  statVal: { color: '#c9a844', fontWeight: '800', fontSize: 20 },
  statLbl: { color: '#888', fontSize: 10, marginTop: 4, textAlign: 'center' },
  playerRow: {
    backgroundColor: '#111d4a', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    gap: 12, borderWidth: 1, borderColor: '#1e2d6b',
  },
  playerInfo: { flex: 1 },
  playerName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  playerUsername: { color: '#555', fontSize: 12 },
  playerTag: { fontSize: 12, color: '#888' },
  notesBox: {
    backgroundColor: '#111d4a', marginHorizontal: 16, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1e2d6b', marginBottom: 8,
  },
  notesText: { color: '#aaa', fontSize: 15, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editButton: { flex: 1, backgroundColor: '#1e2d6b', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editButtonText: { color: '#c9a844', fontWeight: '700', fontSize: 14 },
  deleteButton: { flex: 1, backgroundColor: '#2b0d0d', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteButtonText: { color: '#f44336', fontWeight: '700', fontSize: 14 },
});
