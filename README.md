# Google Sign-In for Unity

Android uses `CredentialManager` and `AuthorizationClient`; iOS uses `GIDSignIn`. The Unity Editor and desktop players use a browser authentication flow with a local callback listener. Native code is included as source and compiled when building the consuming project.

## Version and validation status

The package ID is `com.coolishbee.google-signin`, version `1.0.0`. The declared minimum Unity version is `2021.3`, and the sample project targets `6000.3.18f1`. Package installation, sample import, and Editor compilation were verified with Unity `6000.3.18f1`. Unity `2021.3`, player builds, and device sign-in have not been verified.

## Local installation

The repository's `SampleProject/` references the package through the following relative path. It already contains the sample, so importing the sample again would create duplicate classes.

```json
"com.coolishbee.google-signin": "file:../../Packages/com.coolishbee.google-signin"
```

For other projects, select the local `package.json` in Package Manager and configure the dependency registry shown below. Projects importing the sample also need `com.unity.ugui`.

## Installation via Git

The following example installs the `v1.0.0` tag. OpenUPM installation requires separate package registration and publication.

```json
{
  "dependencies": {
    "com.coolishbee.google-signin": "https://github.com/coolishbee/google-signin-unity.git?path=Packages/com.coolishbee.google-signin#v1.0.0"
  },
  "scopedRegistries": [
    {
      "name": "package.openupm.com",
      "url": "https://package.openupm.com",
      "scopes": ["com.coolishbee.google-signin", "com.google.external-dependency-manager"]
    }
  ]
}
```

After OpenUPM registration and publication, the package dependency value can be changed to `"1.0.0"`. Merge these entries into your existing project configuration. `com.google.external-dependency-manager` resolves through the registry above; `com.unity.nuget.newtonsoft-json` resolves through Unity's registry.

## Migrating from earlier packages

Remove the old `com.google.signin` dependency before adding the new package ID. Remove legacy copies imported into the Assets folder as well to avoid duplicate classes and native code.

| Previous assembly reference | New assembly reference |
|---|---|
| `GoogleSignin` | `GoogleSignIn` |

The namespace remains `Google`. The sign-in entry points differ from the legacy plugin.

- `SignInLegacy()` starts interactive sign-in. On Android, it requests the account picker flow.
- `SignIn()` prefers an existing account. On iOS, it restores the previous sign-in; in the Editor, it uses the session cache. This path is not implemented for standalone players.
- To preserve the legacy `SignIn()` interaction, change calls to `SignInLegacy()`. Replace legacy `SignInSilently()` calls with `SignIn()`. The corresponding `Async` and `Future` methods follow the same naming changes.
- Android's `SignIn()` may still display UI, so do not assume it is always silent.

The sample's `OnSignInSilently` is a scene-bound event method name. It calls the current `SignIn()` method internally.

## Configuration and usage

Register platform-specific clients in your authentication project and configure the web client ID. Android also requires a web client ID in `WebClientId`, rather than an Android client ID.

```csharp
using Google;

GoogleSignIn.Configuration = new GoogleSignInConfiguration {
    RequestEmail = true,
    RequestProfile = true,
    RequestIdToken = true,
    RequestAuthCode = true,
    WebClientId = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
#if UNITY_EDITOR || UNITY_STANDALONE
    ClientSecret = "YOUR_CLIENT_SECRET",
#endif
};

GoogleSignInUser user = await GoogleSignIn.DefaultInstance.SignInLegacy();
```

Use the returned `IdToken` for authentication integrations and `AuthCode` for server-side authorization code exchange. Do not commit actual credentials to the repository.

In a new project, import the provided sample through Package Manager, open `Scenes/SampleScene.unity`, and configure the sample component's web client ID. The repository's [sample scene](https://github.com/coolishbee/google-signin-unity/blob/main/SampleProject/Assets/SignInSample/Scenes/SampleScene.unity) is provided in the sample project.

### Android setup

Match the application's package name and signing certificate fingerprint to the values registered in the authentication console. Use External Dependency Manager to resolve the libraries declared in `Editor/GoogleSignInDependencies.xml`. Legacy account-name hints and games-profile sign-in should not be treated as supported features of the current implementation.

### iOS setup

Add the `.plist` downloaded from the authentication console to the project. Its `BUNDLE_ID` must match the project's bundle identifier. `CLIENT_ID` and `REVERSED_CLIENT_ID` are required; add `WEB_CLIENT_ID` if you need server authorization codes.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>BUNDLE_ID</key>
    <string>com.yourcompany.yourapp</string>
    <key>CLIENT_ID</key>
    <string>YOUR_IOS_CLIENT_ID.apps.googleusercontent.com</string>
    <key>REVERSED_CLIENT_ID</key>
    <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
    <key>WEB_CLIENT_ID</key>
    <string>YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
</dict>
</plist>
```

Build post-processing uses these values to configure `GIDClientID`, the callback URL scheme, and the optional `GIDServerClientID` in `Info.plist`. The dependency file includes a Swift Package Manager declaration for native package version `9.0.0` and a replaceable CocoaPods declaration.

### Editor and standalone limitations

Editor Play Mode uses the desktop authentication implementation even when a mobile build target is selected. Checking mobile native paths requires a separate device build.

The current implementation does not include token refresh, `PKCE`, or `state` validation. Additional scopes are not applied to the desktop flow. The Editor cache disappears when the process exits. `Disconnect()` and `EnableDebugLogging()` are not implemented in the Editor/standalone implementation; standalone players also lack `SignIn()`.

## Authentication service integration

Set `RequestIdToken = true` and use the returned `IdToken` to create credentials for your authentication service. For example, use `Firebase.Auth.GoogleAuthProvider.GetCredential(user.IdToken, null)` and pass the resulting credential to `SignInWithCredentialAsync()`. Install and configure the authentication service's package separately.

## Repository and release workflow

The repository root is not a Unity project. The package lives in `Packages/com.coolishbee.google-signin/`; the [sample project](https://github.com/coolishbee/google-signin-unity/tree/main/SampleProject) references it locally.

Development and releases use `main`. There is no separate package-only branch. Update `package.json.version` and the changelog in a pull request when preparing a release. After merging, GitHub Actions validates the package and creates `v{version}` if it does not already exist. Direct pushes to `main` use the same rules. Existing tags are never overwritten; changes without a new version do not create another release.

OpenUPM registration is a one-time prerequisite. The submission template is [here](https://github.com/coolishbee/google-signin-unity/blob/main/.github/openupm.yml). Before registration, the workflow creates the tag and reports that registration is pending. Once the package is registered, set the repository variable `OPENUPM_ENABLED` to `true`. Subsequent releases request an OpenUPM scan and wait until the version is installable. No personal access token or OpenUPM secret is required.

To retry publication of an existing tag, manually run the release workflow on `main` and provide its version, for example `1.0.0`. This retries the existing tagged content; it never replaces the tag. Automatic checks cover package structure and packaging; they do not constitute a Unity build or device authentication test.

## Source and license

This project is a fork of [Google's original repository](https://github.com/googlesamples/google-signin-unity). Its implementation was adapted and reworked for this project's goals using [Thaina/google-signin-unity](https://github.com/Thaina/google-signin-unity) as a reference.

Existing copyright notices and the Apache License 2.0 text are preserved in the source files and [LICENSE](LICENSE).
