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
import Avatar from '../components/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGroupLeaderboard, getGroupPeriodLeaderboard, getAchievements, Achievements } from '../lib/db';
import { Group, LeaderboardEntry } from '../types';

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

function AchievementCard({ badge, label, desc, stat, holder }: {
  badge: string;
  label: string;
  desc: string;
  stat: string;
  holder: { photoURL?: string; displayName: string; username: string };
}) {
  return (
    <View style={styles.achievementCard}>
      <Text style={styles.achievementBadge}>{badge}</Text>
      <View style={styles.achievementInfo}>
        <View style={styles.achievementTop}>
          <Text style={styles.achievementLabel}>{label}</Text>
          <Text style={styles.achievementStat}>{stat}</Text>
        </View>
        <Text style={styles.achievementDesc}>{desc}</Text>
        <View style={styles.achievementUserRow}>
          <Avatar photoURL={holder.photoURL} displayName={holder.displayName} size={22} />
          <Text style={styles.achievementUser}>{holder.displayName}</Text>
          <Text style={styles.achievementUsername}>@{holder.username}</Text>
        </View>
      </View>
    </View>
  );
}

interface Props {
  onViewPlayer?: (uid: string) => void;
  activeGroup: Group;
  allGroups: Group[];
  onSwitchGroup: () => void;
}

export default function LeaderboardScreen({ onViewPlayer, activeGroup, allGroups, onSwitchGroup }: Props) {
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
        const ach = await getAchievements(activeGroup.members);
        setAchievements(ach);
      } else if (t === 'alltime') {
        setEntries(await getGroupLeaderboard(activeGroup.members));
      } else if (t === 'weekly') {
        setEntries(await getGroupPeriodLeaderboard(activeGroup.members, startOfWeek()));
      } else {
        setEntries(await getGroupPeriodLeaderboard(activeGroup.members, startOfMonth()));
      }
    } catch (e) {
      console.error('Leaderboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

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
        {allGroups.length > 1 && (
          <TouchableOpacity onPress={onSwitchGroup} style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{activeGroup.name} ▾</Text>
          </TouchableOpacity>
        )}
      </View>
      {allGroups.length === 1 && (
        <Text style={styles.groupSubtitle}>{activeGroup.name}</Text>
      )}

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
          {achievements?.mrRebuttal && <AchievementCard badge="🏅" label="Mr. Rebuttal" desc="Most rebuttal caps across all games" stat={String(achievements.mrRebuttal.total)} holder={achievements.mrRebuttal} />}
          {achievements?.bounceMerchant && <AchievementCard badge="🏀" label="Bounce Merchant" desc="Most caps scored via bounce" stat={String(achievements.bounceMerchant.total)} holder={achievements.bounceMerchant} />}
          {achievements?.hotStreak && <AchievementCard badge="🔥" label="Hot Streak" desc="Longest active win streak right now" stat={`${achievements.hotStreak.total} W`} holder={achievements.hotStreak} />}
          {achievements?.sharpShooter && <AchievementCard badge="🎯" label="Sharp Shooter" desc="Best caps per game (min. 3 games)" stat={`${achievements.sharpShooter.total} CPG`} holder={achievements.sharpShooter} />}
          {achievements?.ironman && <AchievementCard badge="💪" label="Ironman" desc="Most total games played" stat={`${achievements.ironman.total} G`} holder={achievements.ironman} />}
          {achievements?.burger && <AchievementCard badge="🍔" label="Burger" desc="Most total losses" stat={`${achievements.burger.total} L`} holder={achievements.burger} />}
          {achievements?.floatMaster && <AchievementCard badge="🫧" label="Cloud Nine" desc="Most caps scored via floater" stat={String(achievements.floatMaster.total)} holder={achievements.floatMaster} />}
          {achievements?.closer && <AchievementCard badge="🏁" label="LeBron" desc="Most game winners scored" stat={String(achievements.closer.total)} holder={achievements.closer} />}
          {!achievements?.mrRebuttal && !achievements?.bounceMerchant && !achievements?.hotStreak && (
            <Text style={styles.emptyText}>No achievements yet. Log some games!</Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ padding: 16 }}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a844" />}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={[styles.row, index === 0 && styles.rowFirst]} onPress={() => onViewPlayer?.(item.uid)} activeOpacity={0.75}>
              <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
                {index === 0 ? '🏆' : `#${index + 1}`}
              </Text>
              <Avatar photoURL={item.photoURL} displayName={item.displayName} size={36} />
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
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#c9a844',
  },
  achievementBadge: { fontSize: 30, marginRight: 14, marginTop: 2 },
  achievementInfo: { flex: 1 },
  achievementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  achievementLabel: { color: '#c9a844', fontWeight: '800', fontSize: 16 },
  achievementStat: { color: '#fff', fontWeight: '700', fontSize: 18 },
  achievementDesc: { color: '#aaa', fontSize: 12, marginBottom: 10 },
  achievementUserRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  achievementUser: { color: '#fff', fontWeight: '600', fontSize: 13 },
  achievementUsername: { color: '#555', fontSize: 12 },
});
