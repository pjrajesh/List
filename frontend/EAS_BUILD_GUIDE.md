# Listorix — EAS Build & Submit Guide

This guide covers building Listorix locally and uploading the artifacts to the App Store / Google Play Store yourself.

---

## 0. Prerequisites (one-time)

On your local machine (Mac for iOS builds; any OS for Android builds):

```bash
# Install EAS CLI globally (recent version)
npm install -g eas-cli

# Verify version (need 13+)
eas --version

# Sign in to your Expo account (the one that owns the EAS Project ID
# already wired in app.json: e9de1c84-9ec5-414d-b392-77336c374cf8)
eas login

# From the project root:
cd /path/to/listorix/frontend
```

If you don't have an Expo account that owns that Project ID, you can:
- Create a new account: https://expo.dev/signup
- Then either claim ownership of that ID (via Expo support) **or** simply replace the ID in `app.json` → `expo.extra.eas.projectId` with one EAS auto-generates the first time you run `eas build`. Either is fine.

---

## 1. Development build (for testing on your phone with the dev server)

A "development build" is a custom version of Expo Go that includes your native modules (push, mic, camera). It connects to the dev server like Expo Go does.

### iOS (physical device)

```bash
# From /frontend
eas build --profile development --platform ios

# When prompted:
#  - Apple ID: your Apple Developer account email
#  - App Store Connect Team: pick your team
#  - The CLI will create the necessary cert + provisioning profile automatically
#  - Choose "Register a new device" the first time, then scan the QR with your iPhone to register UDID
```

After the build finishes (~12-18 min):
1. Download the `.ipa` from the link EAS shows
2. Install on your iPhone via:
   - **Apple Configurator 2** (Mac) — drag the .ipa onto your phone in the app, OR
   - **Diawi.com** — upload the .ipa, scan the QR with your iPhone Safari, install
3. Open the app — it'll show a "Loading dev server" screen
4. From your laptop, paste this URL into the in-app dev URL prompt:
   ```
   https://honest-critique-2.preview.emergentagent.com
   ```
5. The app loads from our dev server. You can now test mic, camera, push tokens, etc.

### Android (physical device)

```bash
eas build --profile development --platform android
```

After the build finishes:
1. Download the `.apk` directly to your Android phone (just open the EAS link in your phone's browser)
2. Install (you may need to allow "Install from unknown sources" once)
3. Open and connect to dev server (same URL as iOS)

---

## 2. Preview / TestFlight build (no dev server, full standalone)

Use this for sharing with testers before going to the store.

```bash
# iOS
eas build --profile preview --platform ios

# Android
eas build --profile preview --platform android
```

iOS preview builds are `.ipa` files for ad-hoc / internal distribution. Android preview builds are `.apk` files.

---

## 3. Production build (App Store / Play Store ready)

```bash
# iOS — produces an .ipa for App Store submission
eas build --profile production --platform ios

# Android — produces an .aab (app bundle) for Play Store submission
eas build --profile production --platform android

# Both at once
eas build --profile production --platform all
```

`autoIncrement: true` is set, so EAS will automatically bump `buildNumber` (iOS) and `versionCode` (Android) for each production build.

### To upload to stores manually

You said you'd handle uploads yourself. The pieces you need:

#### iOS → App Store Connect
1. Download the `.ipa` from the EAS build
2. Open **Transporter.app** (free from Mac App Store)
3. Drag the `.ipa` in → Click "Deliver"
4. Wait ~10-30 min for processing → it'll appear under TestFlight → eventually submit for review

**OR** use Xcode's "Archives" → "Distribute App" workflow with the `.ipa`.

#### Android → Google Play Console
1. Download the `.aab` from the EAS build
2. Go to Play Console → Your app → Production / Internal testing → Create release → Upload `.aab`
3. Fill in release notes → Save → Submit for review

---

## 4. Updating the app after first publish (OTA)

For JS-only changes, you can ship updates without rebuilding using Expo Updates:

```bash
# Install once
yarn add expo-updates

# Then to publish an update
eas update --branch production --message "Fix: AddItemSheet bug"
```

OTA updates skip the App Store review for JS/asset-only changes.
Native changes (new permissions, native modules) STILL require a fresh build.

---

## 5. Troubleshooting

### "Project not found" error on `eas build`
Either you're logged into the wrong Expo account, or the project ID in `app.json` doesn't belong to your account.
Fix: run `eas init` to create a new project under your account; this rewrites the projectId in app.json.

### iOS build fails with "No matching profile/certificate"
Run `eas credentials` and have EAS regenerate them. Confirm your Apple Developer account is paid ($99/yr).

### "Bundle identifier 'com.listorix.app' is already taken"
That's fine if it's taken by YOUR Apple Developer account. If it's taken by someone else, change it in `app.json` → `ios.bundleIdentifier` and `android.package` to a unique value (e.g. `com.yourname.listorix`).

### Push notifications not arriving on dev build
Verify `EXPO_PROJECT_ID` is in `app.json.extra.eas.projectId`. Run the in-app "Send a test notification" from Profile → Notifications to verify the token registered.

### Voice/Scan returning 401
Backend can't reach Supabase service role. Check `/api/ai/health` returns `openai_configured: true` and that `/app/backend/.env` has the SUPABASE_SERVICE_ROLE_KEY set (it does — already verified earlier).

---

## 6. Submission checklist (before first store upload)

- [ ] App icon + splash screen assets are non-placeholder
- [ ] Privacy policy URL set (Apple requires this)
- [ ] Description, keywords, screenshots prepared (3-5 screenshots per device size)
- [ ] All required iOS Info.plist usage strings present (✅ already done: mic, camera, photo library, push)
- [ ] Apple Developer account paid + active
- [ ] Google Play Developer account paid ($25 one-time)
- [ ] Test the production build on a fresh device — make sure it runs WITHOUT your dev server
- [ ] Run `eas build --profile preview --platform ios` first and TestFlight it before submitting prod

---

## Quick reference

| Task | Command |
|---|---|
| Login | `eas login` |
| Dev build (iOS) | `eas build --profile development --platform ios` |
| Dev build (Android) | `eas build --profile development --platform android` |
| Preview / TestFlight | `eas build --profile preview --platform <ios\|android>` |
| Production build | `eas build --profile production --platform <ios\|android\|all>` |
| OTA update | `eas update --branch production` |
| Show credentials | `eas credentials` |
| Show project info | `eas whoami` + `eas project:info` |

---

## 7. Android Home-Screen Widget

A 4×2 home-screen widget ("Listorix — Your List") is bundled. It shows the
top 5 unchecked items + count + a quick "+ Add" button.

**Important:** widgets only work in DEV / PREVIEW / PRODUCTION builds —
NOT in Expo Go. They require native Android code that gets compiled in via
the `react-native-android-widget` config plugin (already wired in app.json).

### How it shows up after install
1. After installing the dev/preview/production APK on your Android phone,
   long-press the home screen → "Widgets" → scroll to **Listorix**.
2. Drag the 4×2 widget onto your home screen.
3. When you launch the app and add/check items, the widget refreshes
   immediately. When the app is closed, the widget refreshes every 30 min
   automatically (Android system schedule).

### Tap behavior
- Tap the widget body → opens the app to your list (`listorix://list`)
- Tap "+ Add item" → opens the app on the list screen (`listorix://add`)

### Customizing the widget UI
Edit `/app/frontend/src/widgets/ListWidget.tsx`. Re-build with EAS to see
changes on device. Common tweaks:
- Change the gold/sapphire palette (constants near the top of the file)
- Show more or fewer items (edit `slice(0, 5)` in `sync.tsx`)
- Adjust min size in `app.json` → `react-native-android-widget` plugin

### iOS widget — IMPLEMENTED (Swift + WidgetKit)
The iOS widget is fully wired via `@bacons/apple-targets` config plugin.

- **Source**: `/app/frontend/targets/widget/Widget.swift` — Swift code that the
  config plugin adds as a WidgetKit extension target during `expo prebuild`.
- **Sizes**: `systemSmall` (count + label) and `systemMedium` (top 5 items + Add button).
- **Data sharing**: An **App Group** (`group.com.listorix.app.shared`) shares
  a JSON snapshot between the main app (writes via
  `react-native-shared-group-preferences`) and the widget extension
  (reads via `UserDefaults(suiteName:)`).
- **Refresh cadence**: every 30 min via `Timeline.policy(.after(...))`. The
  widget always reads the latest snapshot from App Group on each refresh.
- **Tap behavior**: tapping the widget body opens `listorix://list`,
  tapping "+ Add item" opens `listorix://add`.

#### One-time setup before the FIRST iOS build
1. **Add App Group capability** in your Apple Developer portal:
   - Apple Developer → Certificates, IDs & Profiles → Identifiers
   - Edit your bundle ID `com.listorix.app` → enable **App Groups** capability
   - Click **Configure** → add `group.com.listorix.app.shared` → Save
   - **CRUCIAL**: do the same on the WIDGET bundle ID (`com.listorix.app.widget`)
   - Both must share the same App Group identifier.

2. **Run prebuild + build**:
   ```bash
   eas build --profile development --platform ios
   ```
   EAS auto-prebuilds and the `@bacons/apple-targets` plugin generates the
   Xcode widget target. EAS handles certs/profiles for both targets.

3. **After install on device**: long-press home screen → tap "+" top-left
   → search "Listorix" → drag the widget to a home screen page.

#### Troubleshooting
- **Widget shows "Your list is empty" forever** → App Groups not configured
  on Apple Developer for one of the two bundle IDs. See setup step 1.
- **"Could not find module 'WidgetKit'"** during build → `deploymentTarget`
  in `targets/widget/expo-target.config.json` must be `16.0` or higher.
- **Widget data doesn't refresh** → iOS aggressively caches widget timelines.
  Force-quit the app, wait 5 sec, reopen — should trigger a new timeline.
