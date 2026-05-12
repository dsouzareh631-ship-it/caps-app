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
import { getAllTimeLeaderboard, getPeriodLeaderboard, getAchievements, Achievements } from '../lib/db';
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

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievements | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    if (t === 'achievements') {
      const ach = await getAchievements();
      setAchievements(ach);
    } else if (t === 'alltime') {
      setEntries(await getAllTimeLeaderboard());
    } else if (t === 'weekly') {
      setEntries(await getPeriodLeaderboard(startOfWeek()));
    } else {
      setEntries(await getPeriodLeaderboard(startOfMonth()));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

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
                <Text style={styles.achievementUser}>@{achievements.mrRebuttal.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.mrRebuttal.total}</Text>
            </View>
          ) : null}
          {achievements?.bounceMerchant ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementBadge}>🎯</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>Bounce Merchant</Text>
                <Text style={styles.achievementUser}>@{achievements.bounceMerchant.username}</Text>
              </View>
              <Text style={styles.achievementStat}>{achievements.bounceMerchant.total}</Text>
            </View>
          ) : null}
          {!achievements?.mrRebuttal && !achievements?.bounceMerchant && (
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
            <View style={[styles.row, index === 0 && styles.rowFirst]}>
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
            </View>
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
  title: { fontSize: 28, fontWeight: '800', color: '#fff', padding: 24, paddingBottom: 16 },
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
  achievementUser: { color: '#888', fontSize: 13, marginTop: 2 },
  achievementStat: { color: '#fff', fontWeight: '700', fontSize: 20 },
});
