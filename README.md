# Google Sign-In for Unity

## Installation

In Unity `2022.3` or newer, install the package using its Git URL in Package Manager. Append a published version tag to pin a release.

```text
https://github.com/coolishbee/google-signin-unity.git?path=Packages/com.coolishbee.google-signin
```

Dependencies resolve from Unity's registry. Remove any existing `com.google.external-dependency-manager` package or `Assets/ExternalDependencyManager` copy before using `com.unity.external-dependency-manager`. Install only one dependency manager. The scoped registry previously used exclusively for Google's dependency manager is no longer needed.

## Sign-in

Set the configuration before creating the default instance and do not modify it afterward. Sign-out retains the initial configuration. Each sign-in call starts a Google authentication flow instead of returning success from a cached result or restoring a previous login. Google and the operating system control whether UI appears and whether an account is automatically selected.

```csharp
GoogleSignIn.Configuration = new GoogleSignInConfiguration
{
    WebClientId = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
    RequestEmail = true,
    AndroidSignInStyle = AndroidSignInStyle.Popup
};
GoogleSignInUser user = await GoogleSignIn.DefaultInstance.SignIn();
// Send the ID token to your game server. Never write it to logs.
```

`SignInAsync()` and `SignInFuture()` use the same authentication flow. The ID token and profile are returned by default. Run continuations that access Unity objects on the Unity synchronization context.

```csharp
GoogleSignIn.DefaultInstance.SignIn().ContinueWith(
    OnAuthenticationFinished,
    TaskScheduler.FromCurrentSynchronizationContext());
```

### Android

Set `WebClientId` to a Web application client ID. Also configure an Android client in Google Cloud Console with the correct application package name and signing certificate fingerprint.

`AndroidSignInStyle.Popup` is the default and uses the explicit Google sign-in dialog. `BottomSheet` uses the Credential Manager bottom sheet. `HidePopups` applies only to the bottom sheet, preferring authorized accounts and permitting automatic selection; it does not guarantee that UI is hidden. Account hints are ignored on Android.

### iOS

Set the deployment target to `15.0` or newer to meet the authentication SDK requirement.

Add the reversed client ID, `com.googleusercontent.apps.*`, to the supported URL schemes in Player Settings. The post-build processor derives `GIDClientID` from this scheme. The Web client ID is supplied at runtime. Separate credential property list assets in the project are not read.

### Editor and desktop

Sign-in uses the system browser and a local listener. No client secret is required. Register `http://localhost` and `http://localhost:49215` as authorized JavaScript origins for your Web client. If you change `DesktopLoginPort`, update the registered origin accordingly. The sample defaults to port `49215`.

An occupied port causes failure; the implementation does not choose a different port automatically. Requests time out after two minutes. This browser sign-in flow does not provide server authorization codes or additional Google API scopes. `RequestAuthCode` is ignored with a warning.

The client checks that token claims match the request, but your game server must verify the token signature. Do not use locally decoded profile data as proof of server authentication.

## Sign-out and disconnect

To sign out:

```csharp
GoogleSignIn.DefaultInstance.SignOut();
```

To disconnect instead:

```csharp
GoogleSignIn.DefaultInstance.Disconnect();
```

These are separate operations. You do not need to sign out before disconnecting. On iOS, disconnect must be called before sign-out.

| Platform | Sign-out | Disconnect |
|---|---|---|
| Android | Cancels the pending credential request, clears local authentication results, and resets credential state | Revokes Google access for the most recent signed-in account, then clears local state |
| iOS | Clears app sign-in state through the Google SDK | Revokes access through the Google SDK |
| Editor and desktop | Cancels the pending request and closes the local listener | Opens the browser to revoke ID token sharing consent for the most recent signed-in account |

Both methods retain their existing `void` return type. Asynchronous completion and failures are logged. Android and desktop retain the account identifier in memory only. If no account is available after restarting the app, sign in before disconnecting. The identifier is not used for automatic sign-in.

Sign-out does not sign the Google account out of the device or browser. Desktop ID token sharing consent revocation differs from Google API authorization revocation; see [Google's revocation guide](https://developers.google.com/identity/gsi/web/guides/revoke). Your game is responsible for ending game server sessions, deleting game accounts, and invalidating game server tokens.

## Migration from earlier versions

- `SignInLegacy()` and its `Async` and `Future` variants have been removed. Use the `SignIn()` family.
- Select the Android sign-in UI through `AndroidSignInStyle`. The default is `Popup`.
- Remove assignments to `ClientSecret`, `UseGameSignIn`, `RequestIdToken`, and `RequestProfile`.
- The minimum Unity version and dependency manager have changed. Follow the installation steps to remove duplicate dependency managers.
- The iOS client ID is derived exclusively from the supported URL scheme.
- Legacy sample event handler names remain for serialized scene references, but all sign-in handlers start explicit sign-in.

## Verification scope

This update is checked for compilation errors only. Authentication flows, access revocation, device behavior, and game server integration have not been tested.
