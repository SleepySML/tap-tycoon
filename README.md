# Tap Tycoon — React Native (Expo)

Cross-platform idle tycoon game for **iOS, Android, and Web** from a single TypeScript codebase, with **Google + Email authentication** and **cloud save sync**.

## Tech Stack & Architecture Decisions

| Choice | Why |
|--------|-----|
| **Expo SDK 52** | Zero-config iOS/Android/Web, OTA updates, free EAS builds |
| **Zustand** (not Context/Redux) | Selector-based re-renders prevent waterfall during 10 tick/sec game loop. 1KB bundle. |
| **Supabase** (not Firebase/Auth0) | 50K MAU free, PostgreSQL for saves + leaderboards, unlimited API, open-source |
| **Anonymous-first auth** | Zero friction to start playing (max ad impressions), optional sign-in for cloud sync |
| **AsyncStorage** (not MMKV) | Works identically on iOS/Android/Web. MMKV has web compat issues. |
| **Reanimated** | UI-thread animations for smooth 60fps tap feedback |
| **StyleSheet** (not NativeWind) | Zero overhead, optimized by RN engine — max render performance |
| **TypeScript strict** | Prevents NaN/undefined bugs in game math |
| **Pure calculation functions** | All game math in `utils/calculations.ts` — testable, store stays thin |

## Project Structure

```
App.tsx                          # Root (SafeAreaProvider + auth init)
src/
├── types/index.ts               # Shared TypeScript interfaces
├── config/
│   ├── theme.ts                 # Colors, spacing, typography, radii
│   ├── constants.ts             # Game balance tuning knobs
│   ├── supabase.ts              # Supabase client (auth + database)
│   ├── businesses.ts            # 10 business definitions
│   ├── upgrades.ts              # 17 upgrades + 6 prestige upgrades
│   └── achievements.ts          # 22 achievements + 7 daily rewards
├── utils/
│   ├── format.ts                # Number/money/time formatting (pure)
│   └── calculations.ts          # ALL game math (pure functions)
├── store/
│   ├── gameStore.ts             # Zustand game state + persist + selectors
│   └── authStore.ts             # Zustand auth state (user, session)
├── hooks/
│   ├── useGameLoop.ts           # 10 tick/sec game loop (delta-time)
│   ├── useAppState.ts           # Background/foreground handling
│   ├── useAuth.ts               # Auth operations (Google, email, init)
│   └── useCloudSync.ts          # Auto-save/load to/from Supabase
└── components/
    ├── Header.tsx               # Money display + stat pills + profile btn
    ├── TapButton.tsx            # Tap area + floating particles
    ├── TabBar.tsx               # Tab navigation
    ├── BoostBar.tsx             # Active boost timer
    ├── BusinessCard.tsx         # Business row (pure props)
    ├── UpgradeCard.tsx          # Upgrade row (reused for prestige)
    ├── PrestigePanel.tsx        # Prestige info + prestige upgrades
    ├── AchievementCard.tsx      # Achievement row
    ├── AuthModal.tsx            # Google + email sign-in modal
    └── GameScreen.tsx           # Main screen (panels, modals, loop)
supabase/
└── schema.sql                   # Database tables + RLS policies
```

## Performance Architecture

```
GameScreen (subscribes to full state, 10 re-renders/sec)
├── Header
│   ├── MoneyText (selector: money only)
│   ├── IncomePill (derives from state)
│   ├── TapPill (derives from state)
│   └── PrestigePill (selector: prestigePoints only)
├── BoostBar (selector: boostEndTime, internal 1s timer)
├── TapButton (selector: tap action only, local particle state)
├── TabBar (local activeTab state)
└── ScrollView
    ├── BusinessCard[] (memo'd, re-render only on prop change)
    ├── UpgradeCard[] (memo'd)
    ├── PrestigePanel (memo'd)
    └── AchievementCard[] (memo'd)
```

## Authentication Setup (Supabase — Free)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to your users)
3. Copy your **Project URL** and **anon key** from Settings → API

### 2. Configure Credentials
Edit `src/config/supabase.ts` and replace the placeholders:
```typescript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Create Database Tables
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the contents of `supabase/schema.sql`
4. Run the query

This creates:
- `profiles` — user display names + avatars (auto-created on signup)
- `game_saves` — cloud save data (JSONB, one row per user)
- `leaderboards` — public rankings (sorted by total earned)
- Row-Level Security policies so users can only access their own data

### 4. Enable Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard → Auth → Providers → Google:
   - Enable Google provider
   - Paste Client ID and Client Secret

### 5. Enable Email Auth
Email/password auth is enabled by default in Supabase. Optionally:
- Go to Auth → Settings to configure email templates
- Disable "Confirm email" for faster onboarding (optional)

### Auth Flow
```
App starts → Game loads instantly (zero friction)
                ↓
Player taps "Sign In" → AuthModal opens
                ↓
Google OAuth  or  Email/Password
                ↓
Session created → Cloud sync activates
                ↓
Auto-save every 60s to Supabase
Leaderboard updated on each save
Cloud save loaded on next sign-in
```

### Cost at Scale
| Users | Supabase Tier | Monthly Cost |
|-------|--------------|-------------|
| 0–50K MAU | Free | $0 |
| 50K–100K MAU | Pro | $25/month |
| 100K+ MAU | Self-host | Server costs only |

## Running the App

```bash
# Install dependencies
npm install

# Web
npm run web

# iOS (requires Xcode)
npm run ios

# Android (requires Android Studio)
npm run android

# Start Expo dev server (choose platform)
npm start
```

## Building for Production

### Web
```bash
npx expo export --platform web
# Output in dist/ — deploy to Netlify/Vercel/Cloudflare Pages
```

### Mobile (via EAS Build)
```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Monetization Setup

### 1. Google AdSense (Web)
Add to the exported `index.html`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_ID"></script>
```

### 2. AdMob (Mobile)
```bash
npx expo install expo-ads-admob
```
Integrate rewarded video ads for the 2× boost button.

### 3. IAP (Remove Ads)
Use `expo-in-app-purchases` for mobile, or Stripe for web.

## Extending the Game

### Add a new business
Edit `src/config/businesses.ts`:
```typescript
{
  id: 'space',
  name: 'Space Station',
  icon: '🚀',
  baseCost: 50_000_000_000,
  baseIncome: 100_000_000,
  description: 'The final frontier',
}
```

### Add a new upgrade
Edit `src/config/upgrades.ts` — follow the existing pattern.

### Adjust game balance
All tuning knobs are in `src/config/constants.ts`.

### Add a new feature
1. Add types to `src/types/index.ts`
2. Add pure logic to `src/utils/calculations.ts`
3. Add state + actions to `src/store/gameStore.ts`
4. Create component in `src/components/`

## Cost Breakdown

| Item | Cost |
|------|------|
| Hosting (Netlify/Vercel) | $0 |
| Domain (optional) | $10/year |
| Google Play | $25 one-time |
| Apple App Store | $99/year (optional) |
| EAS Build (free tier) | $0 |
| **Total** | **$0 – $35** |

## License

MIT
