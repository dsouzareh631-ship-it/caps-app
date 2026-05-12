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
- `users/{uid}` — profile + lifetime aggregate stats: `totalCaps`, `totalGames`, `totalWins`, `totalLosses`, `currentWinStreak`, `bestWinStreak`
- `games/{id}` — `userId` (logger), `players[]` (includes logger's uid), `capsMade`, `bounces`, `rebuttals`, `result`, `status: 'pending'|'verified'|'rejected'`, `approvals[]`, `rejections[]`

**Caps scoring nuance**: `approveGame()` increments `totalCaps` by `capsMade + bounces + rebuttals`. Display code in `ProfileScreen` and `GameDetailScreen` shows `capsMade + bounces` (no rebuttals). These are intentionally different — rebuttals count toward the lifetime aggregate but not the per-game display.

**Verification flow**: A game starts `pending`. Any one tagged non-logger player approving it immediately sets it to `verified` and updates the logger's stats. A game is only `rejected` when *every* non-logger player has rejected it. Stats increment only on verification.

**ProfileScreen dual-use**: Renders both own profile (as a bottom tab, no `uid` or `onBack` props) and other players' profiles (as an overlay, receives `uid` + `onBack`). The `isOwnProfile` flag gates the edit button, log-out button, and head-to-head record display.

**Achievements** (`getAchievements()` in `db.ts`): Mr. Rebuttal (most rebuttals), Bounce Merchant (most bounces), Hot Streak (highest current streak), Sharp Shooter (best caps-per-game, min 3 games), Ironman (most games played). All computed at query time from Firestore, not stored.

**Leaderboard modes**: All-time reads from `users` aggregates. Period-based re-aggregates from raw `games` documents filtered by `date >= since` — this does *not* use the user-level aggregate fields.

**Types**: `User`, `Game`, `LeaderboardEntry` in `src/types/index.ts`.

## Design tokens

Background: `#0a0f2e` · Cards: `#111d4a` · Borders: `#1e2d6b` · Gold accent: `#c9a844`
