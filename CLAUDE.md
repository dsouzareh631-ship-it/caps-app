# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # start dev server (choose iOS/Android/web)
npx expo start --ios    # launch in iOS simulator directly
npx expo start --android
npx tsc --noEmit        # type-check without building
node scripts/seed-data.mjs          # seed Firestore with sample games
node scripts/seed-test-users.mjs    # seed test user accounts
```

No test suite is configured.

## Architecture

**Entry point**: `App.tsx` — owns all navigation state via `useState`. Screens are rendered conditionally (not via a navigation stack): the 3 tabs (`Home`, `Leaderboard`, `Profile`) use `@react-navigation/bottom-tabs` inside a `NavigationContainer`, but `LogGameScreen`, `VerificationsScreen`, `GameDetailScreen`, and the player-profile overlay are rendered by replacing the entire tree. Back navigation is always a callback prop, never `navigation.goBack()`.

**Auth flow**: `useAuth` (`src/hooks/useAuth.ts`) subscribes to Firebase Auth. Unauthenticated → `AuthFlow` (login/signup toggle). Authenticated → `MainTabs` or an overlay screen.

**Data layer**: All reads/writes go through `src/lib/db.ts`. Firebase initialized once in `src/lib/firebase.ts` (config is hardcoded there, not in `.env`). No local cache — every screen fetches fresh from Firestore on mount.

**Firestore schema**:
- `users/{uid}` — profile + lifetime aggregate stats: `totalCaps`, `totalGames`, `totalWins`, `totalLosses`, `currentWinStreak`, `bestWinStreak`, `groupIds[]`, `expoPushToken?`
- `games/{id}` — `userId` (logger), `players[]` (includes logger's uid), `capsMade`, `bounces`, `rebuttals`, `floaters`, `gameWinners`, `result`, `status: 'pending'|'verified'|'rejected'`, `approvals[]`, `rejections[]`
- `groups/{id}` — `name`, `code` (6-char join code), `createdBy`, `members[]`

**Caps scoring formula**: The canonical total for a game is `capsMade + bounces + rebuttals + floaters + gameWinners`. This is what `approveGame()` adds to `totalCaps` and what all leaderboard/group aggregation functions use. Display code in `ProfileScreen` and `GameDetailScreen` shows only `capsMade + bounces` — this is intentional, not a bug.

**Verification flow**: A game starts `pending`. Any one tagged non-logger player approving it immediately sets it to `verified` and updates the logger's stats atomically via `runTransaction`. A game is only `rejected` when *every* non-logger tagged player has rejected it. Stats increment only on verification.

**Win streak calculation**: Computed at approval time by fetching all already-verified games for the logger plus the game being approved, sorted by date descending. The streak is the leading run of wins.

**ProfileScreen dual-use**: Renders both own profile (as a bottom tab, no `uid` or `onBack` props) and other players' profiles (as an overlay, receives `uid` + `onBack`). The `isOwnProfile` flag gates the edit button, log-out button, and head-to-head record display.

**Groups**: Users can create or join groups via a 6-char code (`GroupSetupScreen`). `GroupsScreen` shows all groups the user belongs to, with a per-group leaderboard that only counts games where both the logger and at least one opponent are group members. Group leaderboard functions (`getGroupLeaderboard`, `getGroupPeriodLeaderboard`) in `db.ts` compute stats from raw `games` documents (not user aggregates).

**Push notifications** (`src/lib/notifications.ts`): Three events trigger pushes — tagging players in a new game (`notifyTaggedPlayers`), a game being approved (`notifyGameVerified`), and a game being rejected (`notifyGameRejected`). Tokens are stored as `expoPushToken` on the user document and sent directly to Expo's push endpoint. Notifications are no-ops on simulators.

**Achievements** (`getAchievements()` in `db.ts`): Computed at query time from `games` documents, scoped to games where both logger and opponent are group members. Eight titles: Mr. Rebuttal (most rebuttals), Bounce Merchant (most bounces), Hot Streak (highest current streak), Sharp Shooter (best caps-per-game, min 3 games), Ironman (most games), Burger (most losses), Float Master (most floaters), Closer (most game-winners).

**Leaderboard modes**: All-time reads from `users` aggregates. Period-based re-aggregates from raw `games` documents filtered by `date >= since`.

**Types**: `User`, `Game`, `Group`, `LeaderboardEntry` in `src/types/index.ts`.

## Design tokens

Background: `#0a0f2e` · Cards: `#111d4a` · Borders: `#1e2d6b` · Gold accent: `#c9a844`
