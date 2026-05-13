import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getUser, getUserGames, getPendingVerifications } from '../lib/db';
import { User, Game, Group } from '../types';
import { FloatingBubbles } from '../components/FloatingCaps';
import BeerMug from '../components/BeerMug';

interface Props {
  onLogGame: () => void;
  onViewVerifications: () => void;
  onViewGame?: (gameId: string) => void;
  activeGroup: Group;
  showGroupSwitcher: boolean;
  onSwitchGroup: () => void;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GameRow({ game }: { game: Game }) {
  const totalCaps = game.capsMade + game.bounces;
  const date = new Date(game.date).toLocaleDateString();
  return (
    <View style={styles.gameRow}>
      <View>
        <Text style={styles.gameDate}>{date}</Text>
        <Text style={styles.gameCaps}>{totalCaps} caps</Text>
      </View>
      <View style={styles.gameRight}>
        <Text style={[styles.gameResult, game.result === 'win' ? styles.win : styles.loss]}>
          {game.result.toUpperCase()}
        </Text>
        <Text style={[styles.gameStatus, game.status === 'pending' ? styles.pending : styles.verified]}>
          {game.status}
        </Text>
      </View>
    </View>
  );
}

function BouncyLogButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.logButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={styles.logButtonCap}>🎯</Text>
        <Text style={styles.logButtonText}>Log a Game</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ onLogGame, onViewVerifications, onViewGame, activeGroup, showGroupSwitcher, onSwitchGroup }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [groupTotalCaps, setGroupTotalCaps] = useState(0);
  const [groupCPG, setGroupCPG] = useState('0.0');
  const [groupRecord, setGroupRecord] = useState({ wins: 0, losses: 0 });
  const [groupStreak, setGroupStreak] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, games, pending] = await Promise.all([
      getUser(user.uid),
      getUserGames(user.uid),
      getPendingVerifications(user.uid),
    ]);
    setProfile(p);
    const groupGames = games.filter(g =>
      g.players.some(uid => uid !== user.uid && activeGroup.members.includes(uid))
    );
    const caps = groupGames.reduce((sum, g) => sum + (g.capsMade ?? 0) + (g.bounces ?? 0) + (g.rebuttals ?? 0) + (g.floaters ?? 0) + (g.gameWinners ?? 0), 0);
    const wins = groupGames.filter(g => g.result === 'win').length;
    const losses = groupGames.filter(g => g.result === 'loss').length;
    const sorted = [...groupGames].sort((a, b) => b.date - a.date);
    let streak = 0;
    for (const g of sorted) {
      if (g.result === 'win') streak++;
      else break;
    }
    setGroupTotalCaps(caps);
    setGroupCPG(groupGames.length > 0 ? (caps / groupGames.length).toFixed(1) : '0.0');
    setGroupRecord({ wins, losses });
    setGroupStreak(streak);
    setRecentGames(groupGames.slice(0, 5));
    setPendingCount(pending.length);
  }, [user, activeGroup]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c9a844" size="large" />
      </View>
    );
  }


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FloatingBubbles />
      <FlatList
        style={{ flex: 1 }}
        data={recentGames}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
        ListHeaderComponent={
          <>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>Hey, {profile?.username ?? user?.email?.split('@')[0]}</Text>
                <TouchableOpacity onPress={showGroupSwitcher ? onSwitchGroup : undefined} activeOpacity={showGroupSwitcher ? 0.7 : 1}>
                  <Text style={styles.groupName}>{activeGroup.name}{showGroupSwitcher ? ' ▾' : ''}</Text>
                </TouchableOpacity>
              </View>
              <BeerMug size={64} />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Total Caps" value={String(groupTotalCaps)} />
              <StatCard label="CPG" value={groupCPG} />
              <StatCard label="Record" value={`${groupRecord.wins}W-${groupRecord.losses}L`} />
              <StatCard label="Streak 🔥" value={String(groupStreak)} />
            </View>

            {pendingCount > 0 && (
              <TouchableOpacity style={styles.verifyBanner} onPress={onViewVerifications}>
                <Text style={styles.verifyBannerText}>
                  🔔 {pendingCount} game{pendingCount > 1 ? 's' : ''} waiting for your verification
                </Text>
                <Text style={styles.verifyBannerArrow}>›</Text>
              </TouchableOpacity>
            )}

            <BouncyLogButton onPress={onLogGame} />

            <Text style={styles.sectionTitle}>Recent Games</Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onViewGame?.(item.id)} activeOpacity={0.75}>
            <GameRow game={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No games with {activeGroup.name} yet. Log your first game above.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f2e' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#fff' },
  groupName: { fontSize: 13, color: '#c9a844', fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#111d4a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#c9a844' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  verifyBanner: {
    backgroundColor: '#0d1535',
    borderColor: '#c9a844',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifyBannerText: { color: '#c9a844', fontWeight: '600', fontSize: 14, flex: 1 },
  verifyBannerArrow: { color: '#c9a844', fontSize: 22, marginLeft: 8 },
  logButton: {
    backgroundColor: '#c9a844',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    alignItems: 'center',
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  logButtonCap: { fontSize: 20 },
  logButtonText: { color: '#000', fontWeight: '800', fontSize: 17 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginBottom: 10 },
  gameRow: {
    backgroundColor: '#111d4a',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  gameDate: { color: '#888', fontSize: 12, marginBottom: 4 },
  gameCaps: { color: '#fff', fontSize: 18, fontWeight: '700' },
  gameRight: { alignItems: 'flex-end', gap: 4 },
  gameResult: { fontWeight: '800', fontSize: 15 },
  win: { color: '#4caf50' },
  loss: { color: '#f44336' },
  gameStatus: { fontSize: 11, fontWeight: '600' },
  pending: { color: '#888' },
  verified: { color: '#4caf50' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
});
