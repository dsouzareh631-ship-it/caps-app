import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leaveGroup } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { Group } from '../types';

interface Props {
  groups: Group[];
  activeGroupId: string;
  onSwitchGroup: (index: number) => void;
  onJoinOrCreate: () => void;
  onLeaveGroup: (groupId: string) => void;
}

export default function GroupsScreen({ groups, activeGroupId, onSwitchGroup, onJoinOrCreate, onLeaveGroup }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [leavingId, setLeavingId] = useState<string | null>(null);

  function copyCode(code: string) {
    Clipboard.setString(code);
    Alert.alert('Copied!', `Invite code ${code} copied to clipboard.`);
  }

  function confirmLeave(group: Group) {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.name}"?${group.members.length === 1 ? ' You are the only member — the group will be deleted.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLeavingId(group.id);
            try {
              await leaveGroup(group.id, user.uid);
              onLeaveGroup(group.id);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setLeavingId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Your Groups</Text>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item, index }) => {
          const isActive = item.id === activeGroupId;
          return (
            <View style={[styles.card, isActive && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.memberCount}>{item.members.length} member{item.members.length !== 1 ? 's' : ''}</Text>
                </View>
                {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
              </View>

              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>Invite Code</Text>
                <TouchableOpacity style={styles.codeBox} onPress={() => copyCode(item.code)}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <Text style={styles.copyIcon}>📋</Text>
                </TouchableOpacity>
              </View>

              {!isActive && (
                <TouchableOpacity style={styles.switchBtn} onPress={() => onSwitchGroup(index)}>
                  <Text style={styles.switchBtnText}>Switch to this group</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.leaveBtn}
                onPress={() => confirmLeave(item)}
                disabled={leavingId === item.id}
              >
                {leavingId === item.id
                  ? <ActivityIndicator color="#f44336" size="small" />
                  : <Text style={styles.leaveBtnText}>Leave Group</Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={onJoinOrCreate}>
            <Text style={styles.addBtnText}>+ Join or Create Another Group</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', padding: 24, paddingBottom: 8 },
  card: {
    backgroundColor: '#111d4a',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  cardActive: { borderColor: '#c9a844' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  groupName: { color: '#fff', fontWeight: '700', fontSize: 18 },
  memberCount: { color: '#888', fontSize: 13, marginTop: 2 },
  activeBadge: { backgroundColor: '#c9a844', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#000', fontWeight: '800', fontSize: 12 },
  codeLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  codeRow: { marginBottom: 12 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f2e',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e2d6b',
    justifyContent: 'space-between',
  },
  codeText: { color: '#c9a844', fontWeight: '900', fontSize: 22, letterSpacing: 4 },
  copyIcon: { fontSize: 18 },
  switchBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a844',
  },
  switchBtnText: { color: '#c9a844', fontWeight: '600', fontSize: 14 },
  leaveBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
    marginTop: 8,
  },
  leaveBtnText: { color: '#f44336', fontWeight: '600', fontSize: 14 },
  addBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
  },
  addBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
});
