import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGameById, getUser } from '../lib/db';
import { Game, User } from '../types';

interface Props {
  gameId: string;
  onBack: () => void;
}

export default function GameDetailScreen({ gameId, onBack }: Props) {
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
  const totalCaps = game.capsMade + game.bounces + (game.rebuttals ?? 0);

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
      </View>

      <Text style={styles.sectionLabel}>Stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{game.capsMade}</Text>
          <Text style={styles.statLbl}>Caps Made</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{game.bounces}</Text>
          <Text style={styles.statLbl}>Bounces</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{game.rebuttals ?? 0}</Text>
          <Text style={styles.statLbl}>Rebuttals</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalCaps}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Players</Text>
      {players.map((p) => {
        const isLogger = p.uid === game.userId;
        const approved = game.approvals.includes(p.uid);
        const rejected = game.rejections.includes(p.uid);
        return (
          <View key={p.uid} style={styles.playerRow}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>{p.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{p.displayName}</Text>
              <Text style={styles.playerUsername}>@{p.username}</Text>
            </View>
            <Text style={styles.playerTag}>
              {isLogger ? '📝 logged' : approved ? '✅ approved' : rejected ? '❌ rejected' : '⏳ pending'}
            </Text>
          </View>
        );
      })}

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
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: '#111d4a', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e2d6b',
  },
  statVal: { color: '#c9a844', fontWeight: '800', fontSize: 20 },
  statLbl: { color: '#888', fontSize: 10, marginTop: 4, textAlign: 'center' },
  playerRow: {
    backgroundColor: '#111d4a', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#1e2d6b',
  },
  playerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#c9a844',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  playerAvatarText: { color: '#000', fontWeight: '800', fontSize: 16 },
  playerInfo: { flex: 1 },
  playerName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  playerUsername: { color: '#555', fontSize: 12 },
  playerTag: { fontSize: 12, color: '#888' },
  notesBox: {
    backgroundColor: '#111d4a', marginHorizontal: 16, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1e2d6b', marginBottom: 8,
  },
  notesText: { color: '#aaa', fontSize: 15, fontStyle: 'italic' },
});
