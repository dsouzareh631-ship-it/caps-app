import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Show alerts and play sound when a notification arrives while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return; // simulators can't receive push notifications

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const { data: token } = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    await updateDoc(doc(db, 'users', userId), { expoPushToken: token });
  } catch (e) {
    // Non-fatal: app works fine without push notifications
    console.warn('Push token registration failed:', e);
  }
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data().displayName as string) : 'Someone';
  } catch {
    return 'Someone';
  }
}

async function getTokensForUsers(uids: string[]): Promise<string[]> {
  const results = await Promise.all(
    uids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? (snap.data().expoPushToken as string | undefined) : undefined;
      } catch {
        return undefined;
      }
    })
  );
  return results.filter((t): t is string => Boolean(t));
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
): Promise<void> {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, title, body, sound: 'default' }));
  try {
    await fetch('https://exp.host/--/expo-push-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('Failed to send push notifications:', e);
  }
}

// Called after logging a game — notifies each tagged player
export async function notifyTaggedPlayers(
  playerUids: string[],
  senderUid: string,
): Promise<void> {
  const [tokens, senderName] = await Promise.all([
    getTokensForUsers(playerUids),
    getUserDisplayName(senderUid),
  ]);
  await sendPushNotifications(
    tokens,
    'New game to verify 🎯',
    `${senderName} tagged you in a game — tap to verify their stats.`,
  );
}

// Called after a game is approved — notifies the game's logger
export async function notifyGameVerified(
  ownerUid: string,
  verifierUid: string,
): Promise<void> {
  const [tokens, verifierName] = await Promise.all([
    getTokensForUsers([ownerUid]),
    getUserDisplayName(verifierUid),
  ]);
  await sendPushNotifications(
    tokens,
    'Game verified! ✅',
    `${verifierName} verified your game. Stats updated.`,
  );
}

// Called after a game is rejected — notifies the game's logger
export async function notifyGameRejected(
  ownerUid: string,
  verifierUid: string,
): Promise<void> {
  const [tokens, verifierName] = await Promise.all([
    getTokensForUsers([ownerUid]),
    getUserDisplayName(verifierUid),
  ]);
  await sendPushNotifications(
    tokens,
    'Game rejected',
    `${verifierName} rejected your game.`,
  );
}
