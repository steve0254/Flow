# Flow — Android APK

Flow is wrapped as a native Android app using [Capacitor](https://capacitorjs.com/), which
takes the same web app you deploy to GitHub Pages and packages it in a real Android shell with
access to native notifications and vibration.

Building an `.apk` requires the Android SDK and Gradle, which aren't available in this
environment — but they're preinstalled on GitHub's own build servers, so a GitHub Actions
workflow (`.github/workflows/build-android.yml`) does the actual compiling for you in the cloud.

## Get the APK (no local Android setup needed)

1. Push this project to your GitHub repo (see `DEPLOY.md` if you haven't already).
2. Go to the **Actions** tab → you'll see **"Build Android APK"** running automatically.
3. Wait for it to finish (a few minutes — first run downloads the Android SDK/Gradle caches).
4. Go to your repo's **Releases** page (right sidebar on the repo homepage, or `/releases`).
   You'll find a release called **"Flow — latest APK"** with `app-debug.apk` attached.
5. Open that link on your Android phone (or send it to yourself) and tap to download.
6. Android will ask you to allow "install from unknown sources" the first time — allow it,
   then tap **Install**.

Every time you push a change, this release updates automatically with a fresh APK.

> This is a **debug build** — perfectly fine for personal use, but it's signed with a
> throwaway debug key, not something you'd submit to the Play Store. If you eventually want a
> signed release build for that, say so and we can add a signing step.

## Build it yourself locally (if you have Android Studio)

```bash
npm install
npm run android:studio
```
This builds the web app, syncs it into the `android/` project, and opens Android Studio. From
there use **Build → Build Bundle(s) / APK(s) → Build APK(s)**, or plug in a phone and hit Run.

## What's native vs. web here
- **Native:** local notifications (milestone/duration alerts) and haptic vibration, via
  `@capacitor/local-notifications` and `@capacitor/haptics` — these show up as real Android
  notifications, not just in-app toasts.
- **Everything else:** the same React UI, rendered in an embedded WebView — same code as the
  desktop/web version, no separate Android-specific UI to maintain.

## If you change the app icon or name later
- App name: edit `appName` in `capacitor.config.ts`, then re-run `npm run cap:sync`.
- Icon: Capacitor's docs cover generating all the required Android icon sizes —
  https://capacitorjs.com/docs/guides/splash-screens-and-icons
