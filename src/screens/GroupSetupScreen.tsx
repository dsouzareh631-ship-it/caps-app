import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { logOut } from '../lib/auth';
import { createGroup, joinGroupByCode } from '../lib/db';
import { Group } from '../types';

interface Props {
  onDone: (group: Group) => void;
  onBack?: () => void;
}

export default function GroupSetupScreen({ onDone, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  async function handleCreate() {
    if (!user) return;
    if (!groupName.trim()) {
      Alert.alert('Error', 'Enter a group name.');
      return;
    }
    setLoading(true);
    try {
      const group = await createGroup(groupName.trim(), user.uid);
      setCreatedGroup(group);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!user) return;
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Enter an invite code.');
      return;
    }
    setLoading(true);
    try {
      const group = await joinGroupByCode(inviteCode.trim(), user.uid);
      onDone(group);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (createdGroup) {
    return (
      <View style={[styles.container, styles.codeContainer, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{createdGroup.name}</Text>
        <Text style={styles.subtitle}>Share this invite code with your friends.</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{createdGroup.code}</Text>
        </View>
        <TouchableOpacity style={styles.copyBtn} onPress={() => {
          Clipboard.setString(createdGroup.code);
          Alert.alert('Copied!', 'Invite code copied to clipboard.');
        }}>
          <Text style={styles.copyBtnText}>Copy Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => onDone(createdGroup)}>
          <Text style={styles.buttonText}>Enter App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Join the Game</Text>
        <Text style={styles.subtitle}>Create a group or join one with an invite code.</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'create' && styles.toggleActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.toggleText, mode === 'create' && styles.toggleTextActive]}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'join' && styles.toggleActive]}
            onPress={() => setMode('join')}
          >
            <Text style={[styles.toggleText, mode === 'join' && styles.toggleTextActive]}>Join</Text>
          </TouchableOpacity>
        </View>

        {mode === 'create' ? (
          <>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Friday Night Caps"
              placeholderTextColor="#888"
              value={groupName}
              onChangeText={setGroupName}
            />
            <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create Group</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Invite Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-character code"
              placeholderTextColor="#888"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Join Group</Text>}
            </TouchableOpacity>
          </>
        )}

        {!onBack && (
          <TouchableOpacity style={styles.signOutBtn} onPress={logOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f2e' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 36 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#111d4a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#c9a844' },
  toggleText: { color: '#888', fontWeight: '600', fontSize: 15 },
  toggleTextActive: { color: '#000' },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#111d4a',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  button: {
    backgroundColor: '#c9a844',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontWeight: '800', fontSize: 16 },
  codeContainer: { flex: 1, justifyContent: 'center', padding: 28 },
  codeBox: {
    backgroundColor: '#111d4a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c9a844',
    marginBottom: 20,
  },
  codeText: { color: '#c9a844', fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  copyBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a844',
    marginBottom: 12,
  },
  copyBtnText: { color: '#c9a844', fontWeight: '700', fontSize: 15 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: '#c9a844', fontSize: 16, fontWeight: '600' },
  signOutBtn: { marginTop: 32, alignItems: 'center', padding: 12 },
  signOutText: { color: '#555', fontSize: 14, fontWeight: '600' },
});
