import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllTimeLeaderboard, getPeriodLeaderboard, getAchievements, getAllUsers, Achievements } from '../lib/db';
import { LeaderboardEntry } from '../types';

type Tab = 'weekly' | 'monthly' | 'alltime' | 'achievements';

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function startOfMonth(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const TAB_LABELS: Record<Tab, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  alltime: 'All Time',
  achievements: 'Achievements',
};

interface Props {
  onViewPlayer?: (uid: string) => void;
}

export default function LeaderboardScreen({ onViewPlayer }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievements | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'achievements') {
        const users = await getAllUsers();
        const ach = await getAchievements(users.map(u => u.uid));
        setAchievements(ach);
      } else if (t === 'alltime') {
        setEntries(await getAllTimeLeaderboard());
      } else if (t === 'weekly') {
        setEntries(await getPeriodLeaderboard(startOfWeek()));
      } else {
        setEntries(await getPeriodLeaderboard(startOfMonth()));
      }
    } catch (e) {
      console.error('Leaderboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      <View style={styles.tabs}>
        {(['weekly', 'monthly', 'alltime', 'achievements'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#c9a844" size="large" />
        </View>
      ) : tab === 'achievements' ? (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
        >
          {achievements?.mrRebuttal ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🏅</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Mr. Rebuttal</Text>
                <Text style={styles.achievementDesc}>Most rebuttal caps across all games</Text>
                <Text style={styles.achievementUser}>@{achievements.mrRebuttal.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.mrRebuttal.total}</Text>
            </View>
          ) : null}
          {achievements?.bounceMerchant ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🏀</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Bounce Merchant</Text>
                <Text style={styles.achievementDesc}>Most caps scored via bounce</Text>
                <Text style={styles.achievementUser}>@{achievements.bounceMerchant.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.bounceMerchant.total}</Text>
            </View>
          ) : null}
          {achievements?.hotStreak ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🔥</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Hot Streak</Text>
                <Text style={styles.achievementDesc}>Longest active win streak right now</Text>
                <Text style={styles.achievementUser}>@{achievements.hotStreak.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.hotStreak.total} W</Text>
            </View>
          ) : null}
          {achievements?.sharpShooter ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🎯</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Sharp Shooter</Text>
                <Text style={styles.achievementDesc}>Best caps per game (min. 3 games)</Text>
                <Text style={styles.achievementUser}>@{achievements.sharpShooter.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.sharpShooter.total} CPG</Text>
            </View>
          ) : null}
          {achievements?.ironman ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>💪</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Ironman</Text>
                <Text style={styles.achievementDesc}>Most total games played</Text>
                <Text style={styles.achievementUser}>@{achievements.ironman.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.ironman.total} G</Text>
            </View>
          ) : null}
          {achievements?.burger ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🍔</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Burger</Text>
                <Text style={styles.achievementDesc}>Most total losses</Text>
                <Text style={styles.achievementUser}>@{achievements.burger.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.burger.total} L</Text>
            </View>
          ) : null}
          {achievements?.floatMaster ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🫧</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Cloud Nine</Text>
                <Text style={styles.achievementDesc}>Most caps scored via floater</Text>
                <Text style={styles.achievementUser}>@{achievements.floatMaster.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.floatMaster.total}</Text>
            </View>
          ) : null}
          {achievements?.closer ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🏁</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>LeBron</Text>
                <Text style={styles.achievementDesc}>Most game winners scored</Text>
                <Text style={styles.achievementUser}>@{achievements.closer.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.closer.total}</Text>
            </View>
          ) : null}
          {!achievements?.mrRebuttal && !achievements?.bounceMerchant && !achievements?.hotStreak && (
            <Text style={styles.emptyText}>No achievements yet. Log some games!</Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={[styles.row, index === 0 && styles.rowFirst]} onPress={() => onViewPlayer?.(item.uid)} activeOpacity={0.75}>
              <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
                {index === 0 ? '🏆' : `#${index + 1}`}
              </Text>
              <View style={styles.playerInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.caps}>{item.totalCaps}</Text>
                <Text style={styles.capsLabel}>caps</Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.cpg}>{item.capsPerGame.toFixed(1)}</Text>
                <Text style={styles.capsLabel}>CPG</Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.record}>{item.totalWins}W-{item.totalLosses}L</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No games logged {tab === 'alltime' ? 'yet' : 'this ' + (tab === 'weekly' ? 'week' : 'month')}.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  groupSubtitle: { color: '#c9a844', fontSize: 13, fontWeight: '600', paddingHorizontal: 24, paddingBottom: 12 },
  groupBadge: { backgroundColor: '#111d4a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#c9a844' },
  groupBadgeText: { color: '#c9a844', fontWeight: '600', fontSize: 13 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#111d4a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#c9a844' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 11 },
  tabTextActive: { color: '#000' },
  row: {
    backgroundColor: '#111d4a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  rowFirst: { borderColor: '#c9a844', backgroundColor: '#0d1535' },
  rank: { color: '#888', fontWeight: '700', fontSize: 14, width: 32 },
  rankFirst: { fontSize: 20 },
  playerInfo: { flex: 1, marginLeft: 4 },
  name: { color: '#fff', fontWeight: '700', fontSize: 14 },
  username: { color: '#555', fontSize: 12 },
  stats: { alignItems: 'center', marginLeft: 12 },
  caps: { color: '#c9a844', fontWeight: '800', fontSize: 16 },
  cpg: { color: '#fff', fontWeight: '700', fontSize: 15 },
  capsLabel: { color: '#555', fontSize: 10 },
  record: { color: '#888', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
  achievementCard: {
    backgroundColor: '#111d4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a844',
  },
  achievementBadge: { fontSize: 32, marginRight: 14 },
  achievementInfo: { flex: 1 },
  achievementLabel: { color: '#c9a844', fontWeight: '800', fontSize: 16 },
  achievementDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  achievementUser: { color: '#555', fontSize: 12, marginTop: 4 },
  achievementStat: { color: '#fff', fontWeight: '700', fontSize: 20 },
});
