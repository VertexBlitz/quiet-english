# Quiet English Preview for Android

This is a Trusted Web Activity (TWA) wrapper for the existing Quiet English preview site:

- Origin: https://quiet-english-speaking-preview.onrender.com
- Android package: `com.vertexblitz.quietenglish.preview`
- Android target API: 36
- Web app manifest: `/manifest.webmanifest`

The Android app does not contain a second backend or database. It opens the existing preview service.

## Debug APK

Every push to `feat/pronunciation-and-listening-library` runs the mobile workflow. The debug APK is published as a GitHub Actions artifact named `quiet-english-preview-debug-apk`.

Debug builds use the package suffix `.debug` and a debug signing key. They are for testing only and are not suitable for Google Play or as upgrade-compatible releases.

## Signed release and Google Play

A tag named `quiet-english-preview-v1.0.0` (or a later version) starts the signed release workflow. Before creating the tag, the adult owner of the Play Console developer account should create the Upload Key locally using `android/scripts/create-upload-key.ps1` (Windows PowerShell) or `android/scripts/create-upload-key.sh` (macOS/Linux). These scripts create files only in the ignored `android/signing/` directory. Keep a secure offline backup of the `.jks` file. Do not send the keystore or passwords through chat or commit them to Git.

Then add these repository secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64` — Base64-encoded release keystore file.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — key alias.
- `ANDROID_KEY_PASSWORD` — key password.
- `ANDROID_PLAY_APP_SIGNING_SHA256` — optional SHA-256 fingerprint of the app-signing certificate shown in Play Console. Add this after Play App Signing is configured so the Play Store-installed build is also verified as a TWA.

Create a release keystore once and retain a secure backup. Never commit the keystore or its passwords to Git. Every future Android update must use the same release key.

Example keystore creation command:

```bash
keytool -genkeypair -v -keystore quiet-english-release.jks -alias quietenglish -keyalg RSA -keysize 2048 -validity 10000
```

Encode the keystore for the `ANDROID_KEYSTORE_BASE64` secret:

- macOS/Linux: `base64 < quiet-english-release.jks | tr -d '\n'`
- PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("quiet-english-release.jks"))`

The release workflow now fails explicitly when any required signing secret is missing; it will not report a successful release while skipping the AAB.

The tagged workflow derives a unique `versionCode` from `GITHUB_RUN_NUMBER` and uses the semantic version from the tag. The tagged workflow produces:

- `app-release.apk` — installable Android package for GitHub Releases.
- `app-release.aab` — Android App Bundle for Google Play Console.
- `assetlinks.json` — Digital Asset Links statement for the release package and signing certificate(s).

Google Play submissions for new apps require an Android App Bundle (AAB); the APK remains available for direct download.

## Google Play Internal Testing

Use the adult owner's existing Play Console account. Create an app with the exact package name `com.vertexblitz.quietenglish.preview` and enroll in Google Play App Signing, letting Google manage the app-signing key. The first AAB is signed with the local Upload Key; Google signs the APKs delivered to testers.

After the signed AAB has been generated:

1. Push a tag such as `quiet-english-preview-v1.0.0` to start the signed build.
2. Download `app-release.aab` from the GitHub Release.
3. In Play Console, open **Test and release → Testing → Internal testing**.
4. Create a release, upload the AAB, review the release details, and roll it out to the internal track.
5. Add tester email addresses or a Google Group, save the tester list, and share the opt-in link with testers.

An internal test supports up to 100 individually listed email testers. Internal testers can be in different countries. Internal testing is for initial QA; it does not publish the app to the public Play Store.

Keep the package name `com.vertexblitz.quietenglish.preview` for this preview app. It is intentionally separate from any future production Android application ID.

## Verify the domain (required for fullscreen TWA)

The file `public/.well-known/assetlinks.json` is intentionally an empty JSON array until the release signing certificate exists. After the first signed release:

1. Download `assetlinks.json` from the GitHub Release.
2. Replace `public/.well-known/assetlinks.json` with that exact file.
3. Commit and deploy the change to the preview branch.
4. Confirm that `https://quiet-english-speaking-preview.onrender.com/.well-known/assetlinks.json` returns the statement.

Until the package name and SHA-256 certificate fingerprint match, Android Browser Helper falls back to a browser Custom Tab (with browser UI) rather than a verified fullscreen Trusted Web Activity.

## iPhone

iPhone distribution is the PWA, not an iOS App Store binary. Open the preview site in Safari, tap **Share → Add to Home Screen**, then choose **Open as Web App** when shown.
