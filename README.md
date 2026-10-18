# Gully Masti Android APK project

This wraps the supplied Gully Masti HTML/CSS/JavaScript game in an Android WebView. The game files are in `app/src/main/assets/`.

## Build APK using GitHub mobile
1. Upload the contents of this project ZIP to a new/clean GitHub repository (keep the folders as shown; do not upload the ZIP as one file).
2. Open the repository's **Actions** tab.
3. Select **Build Gully Masti APK** and tap **Run workflow**.
4. When the run succeeds, open it and download the **Gully-Masti-APK** artifact.
5. Extract the downloaded ZIP; install `app-debug.apk` on Android.

Note: the supplied game currently loads Three.js from jsDelivr and Google Fonts from Google Fonts, so the first launch/game needs an internet connection. This is an unsigned debug APK suitable for testing and sharing directly, not Play Store release signing. The original game is a prototype and its gameplay is not modified by this Android wrapper.
