import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getGroupMembers, getRecentTeammates, logGame, updateGame, getGameById } from '../lib/db';
import { notifyTaggedPlayers } from '../lib/notifications';
import Avatar from '../components/Avatar';
import { Group, User } from '../types';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
  activeGroup: Group;
  editGameId?: string;
}

export default function LogGameScreen({ onSuccess, onBack, activeGroup, editGameId }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [capsMade, setCapsMade] = useState('');
  const [bounces, setBounces] = useState('');
  const [rebuttals, setRebuttals] = useState('');
  const [floaters, setFloaters] = useState('');
  const [gameWinners, setGameWinners] = useState('');
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [notes, setNotes] = useState('');
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const otherMemberIds = activeGroup.members.filter((id) => id !== user.uid);
    Promise.all([
      getRecentTeammates(user.uid, 5),
      getGroupMembers(otherMemberIds),
    ]).then(([recent, members]) => {
      setAllUsers(members);
      setRecentUsers(recent.filter((u) => otherMemberIds.includes(u.uid)));
    }).catch((e) => {
      console.error('LogGame users load error:', e);
    }).finally(() => {
      setUsersLoading(false);
    });
  }, [user, activeGroup]);

  useEffect(() => {
    if (!editGameId || !user) return;
    getGameById(editGameId).then((g) => {
      if (!g) return;
      setSelectedPlayers(g.players.filter((uid) => uid !== user.uid));
      setCapsMade(String(g.capsMade));
      setBounces(String(g.bounces));
      setRebuttals(String(g.rebuttals ?? 0));
      setFloaters(String(g.floaters ?? 0));
      setGameWinners(String(g.gameWinners ?? 0));
      setResult(g.result);
      setGameDate(new Date(g.date));
      setNotes(g.notes ?? '');
    });
  }, [editGameId, user]);

  function togglePlayer(uid: string) {
    setSelectedPlayers((prev) => prev.includes(uid) ? [] : [uid]);
  }

  function parseNonNegativeInt(val: string): number | null {
    if (!val && val !== '0') return 0;
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }

  async function handleSubmit() {
    if (!user) return;
    if (selectedPlayers.length === 0) {
      Alert.alert('Error', 'Select a teammate to verify your game.');
      return;
    }
    const capsVal = parseNonNegativeInt(capsMade);
    if (capsVal === null || (!capsMade && capsMade !== '0')) {
      Alert.alert('Error', 'Enter a valid number of caps made (whole number, 0 or more).');
      return;
    }
    const bouncesVal = parseNonNegativeInt(bounces);
    const rebuttalsVal = parseNonNegativeInt(rebuttals);
    const floatersVal = parseNonNegativeInt(floaters);
    const gameWinnersVal = parseNonNegativeInt(gameWinners);
    if (bouncesVal === null || rebuttalsVal === null || floatersVal === null || gameWinnersVal === null) {
      Alert.alert('Error', 'All stat fields must be whole numbers (0 or more).');
      return;
    }
    if (!result) {
      Alert.alert('Error', 'Select a result (Win or Loss).');
      return;
    }
    setLoading(true);
    try {
      const allPlayers = [user.uid, ...selectedPlayers];
      if (editGameId) {
        await updateGame(editGameId, user.uid, allPlayers, capsVal, bouncesVal, rebuttalsVal, floatersVal, gameWinnersVal, result, notes.trim(), gameDate.getTime());
        Alert.alert('Game Updated!', 'Your game has been updated and sent for re-verification.');
        notifyTaggedPlayers(selectedPlayers, user.uid);
      } else {
        await logGame(user.uid, allPlayers, capsVal, bouncesVal, rebuttalsVal, floatersVal, gameWinnersVal, result, notes.trim(), gameDate.getTime());
        const names = selectedPlayers
          .map((uid) => allUsers.find((u) => u.uid === uid)?.displayName ?? 'them')
          .join(', ');
        Alert.alert('Game Logged!', `Verification requests have been sent to ${names}.`);
        notifyTaggedPlayers(selectedPlayers, user.uid);
      }
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const isShowingRecent = !search.trim() && recentUsers.length > 0;
  const filtered = search.trim()
    ? allUsers.filter(
        (u) =>
          (u.displayName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (u.username ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : recentUsers.length > 0 ? recentUsers : allUsers;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editGameId ? 'Edit Game' : 'Log a Game'}</Text>
      </View>

      {/* Player Selection */}
      <Text style={styles.sectionLabel}>Teammate</Text>
      <Text style={styles.sectionHint}>
        {selectedPlayers.length === 0
          ? 'Select your teammate — they\'ll verify your stats'
          : 'Teammate selected — tap to change'}
      </Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search players..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      {usersLoading ? (
        <ActivityIndicator color="#c9a844" style={{ marginVertical: 16 }} />
      ) : allUsers.length === 0 ? (
        <Text style={styles.noPlayersText}>No other members in this group yet. Share your invite code to add players.</Text>
      ) : filtered.length === 0 && search.trim() ? (
        <Text style={styles.noPlayersText}>No players found.</Text>
      ) : (
        <>
          {!search.trim() && (
            <Text style={styles.listHeader}>{isShowingRecent ? 'Recent teammates' : 'Group members'}</Text>
          )}
          {filtered.map((u) => {
          const selected = selectedPlayers.includes(u.uid);
          return (
            <TouchableOpacity
              key={u.uid}
              style={[styles.playerRow, selected && styles.playerRowSelected]}
              onPress={() => togglePlayer(u.uid)}
            >
              <Avatar photoURL={u.photoURL} displayName={u.displayName} size={36} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.playerName}>{u.displayName}</Text>
                <Text style={styles.playerUsername}>@{u.username}</Text>
              </View>
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
        </>
      )}

      {/* Caps Made */}
      <Text style={styles.sectionLabel}>Caps Made (clean)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={capsMade}
        onChangeText={setCapsMade}
      />

      <Text style={styles.sectionLabel}>Bounces Made (caps bounce in)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={bounces}
        onChangeText={setBounces}
      />

      <Text style={styles.sectionLabel}>Floaters (cap lands floating on top)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={floaters}
        onChangeText={setFloaters}
      />

      <Text style={styles.sectionLabel}>Game Winners (cap lands on back handle)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={gameWinners}
        onChangeText={setGameWinners}
      />

      <Text style={styles.sectionLabel}>Rebuttals Made</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={rebuttals}
        onChangeText={setRebuttals}
      />

      {/* Result */}
      <Text style={styles.sectionLabel}>Result</Text>
      <View style={styles.resultRow}>
        <TouchableOpacity
          style={[styles.resultButton, result === 'win' && styles.resultWin]}
          onPress={() => setResult('win')}
        >
          <Text style={[styles.resultText, result === 'win' && styles.resultTextActive]}>Win</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resultButton, result === 'loss' && styles.resultLoss]}
          onPress={() => setResult('loss')}
        >
          <Text style={[styles.resultText, result === 'loss' && styles.resultTextActive]}>Loss</Text>
        </TouchableOpacity>
      </View>

      {/* Date */}
      <Text style={styles.sectionLabel}>Date</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={styles.dateButtonIcon}>📅</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={gameDate}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            themeVariant="dark"
            onChange={(_, selected) => {
              if (selected) {
                setGameDate(selected);
                setShowDatePicker(false);
              }
            }}
          />
        </View>
      )}

      {/* Notes */}
      <Text style={styles.sectionLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Anything memorable..."
        placeholderTextColor="#888"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitText}>{editGameId ? 'Update Game' : 'Submit for Verification'}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  header: { padding: 24, paddingBottom: 8 },
  backButton: { color: '#c9a844', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sectionLabel: { color: '#888', fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginTop: 22, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { color: '#555', fontSize: 12, paddingHorizontal: 20, marginBottom: 10 },
  searchInput: {
    backgroundColor: '#111d4a',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  playerRow: {
    backgroundColor: '#111d4a',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  playerRowSelected: { borderColor: '#c9a844', backgroundColor: '#0d1535' },
  playerName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  playerUsername: { color: '#888', fontSize: 13, marginRight: 8 },
  checkmark: { color: '#c9a844', fontWeight: '800', fontSize: 16 },
  noPlayersText: { color: '#555', fontSize: 14, textAlign: 'center', marginHorizontal: 16, marginVertical: 12 },
  listHeader: { color: '#555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8 },
  input: {
    backgroundColor: '#111d4a',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  notesInput: { height: 100, textAlignVertical: 'top', fontSize: 15 },
  resultRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  resultButton: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#111d4a',
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  resultWin: { backgroundColor: '#0d2b0d', borderColor: '#4caf50' },
  resultLoss: { backgroundColor: '#2b0d0d', borderColor: '#f44336' },
  resultText: { color: '#888', fontWeight: '700', fontSize: 16 },
  resultTextActive: { color: '#fff' },
  dateButton: {
    backgroundColor: '#111d4a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e2d6b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: { color: '#fff', fontSize: 16 },
  dateButtonIcon: { fontSize: 18 },
  datePickerContainer: {
    marginHorizontal: 16,
    backgroundColor: '#111d4a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2d6b',
    overflow: 'hidden',
  },
  submitButton: {
    backgroundColor: '#c9a844',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitText: { color: '#000', fontWeight: '800', fontSize: 17 },
});
