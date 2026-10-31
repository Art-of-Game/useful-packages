# Useful packages

Unity packages I use in my projects, collected in one place. Each one installs on its own, so you only download what you need.

I made this with the help of AI, to make the work lighter for everyone.

## What's here

### Firebase

From [firebase/firebase-unity-sdk](https://github.com/firebase/firebase-unity-sdk).

| Package | What it is | Also brings |
|---|---|---|
| `com.google.firebase.app` | Firebase App (Core) | External Dependency Manager |
| `com.google.firebase.analytics` | Google Analytics for Firebase | Firebase App |
| `com.google.firebase.app-check` | Firebase App Check | Firebase App |
| `com.google.firebase.auth` | Firebase Authentication | Firebase App |
| `com.google.firebase.crashlytics` | Firebase Crashlytics | Firebase App |
| `com.google.firebase.firestore` | Cloud Firestore | Firebase App |
| `com.google.firebase.messaging` | Firebase Cloud Messaging | Firebase App |
| `com.google.firebase.remote-config` | Firebase Remote Config | Firebase App |

### Google

| Package | What it is | Source | Also brings |
|---|---|---|---|
| `com.google.signin` | Google Sign-In | [coolishbee/google-signin-unity](https://github.com/coolishbee/google-signin-unity) | External Dependency Manager |
| `com.google.play.games` | Google Play Games | [playgameservices/play-games-plugin-for-unity](https://github.com/playgameservices/play-games-plugin-for-unity) | External Dependency Manager |
| `com.google.play.review` | Play In-App Review | [google/play-unity-plugins](https://github.com/google/play-unity-plugins) | Play Core, Play Common |
| `com.google.play.appupdate` | Play In-App Updates | [google/play-unity-plugins](https://github.com/google/play-unity-plugins) | Play Core, Play Common |
| `com.google.play.core` | Play Core | [google/play-unity-plugins](https://github.com/google/play-unity-plugins) | External Dependency Manager |
| `com.google.play.common` | Play Common | [google/play-unity-plugins](https://github.com/google/play-unity-plugins) | Unity UI |

Google wrote Google Sign-In and later archived [its repo](https://github.com/googlesamples/google-signin-unity). [Thaina](https://github.com/Thaina/google-signin-unity) and [coolishbee](https://github.com/coolishbee/google-signin-unity) brought it up to date, and coolishbee's fork is what you get here.

Google has archived `play-unity-plugins` too. Those packages are the newest versions on [Google's archive page](https://developers.google.com/unity/archive).

### Facebook

| Package | What it is | Source | Also brings |
|---|---|---|---|
| `com.facebook.sdk` | Facebook SDK | [meta/facebook-sdk-for-unity](https://github.com/meta/facebook-sdk-for-unity) | External Dependency Manager |

All the work belongs to their authors, and each package keeps its own licence. I only point them at Unity's External Dependency Manager and sign them. Meta ships the Facebook SDK as a `.unitypackage`, so I also turned it into a package and moved Meta's examples under **Samples** in the Package Manager window. Each package says what changed in `Documentation~/MODIFIED.md`.

## External Dependency Manager

Google deprecated its External Dependency Manager with v1.2.190 on September 29, 2026 and archived it on October 26, 2026, in favor of the [official package Unity announced](https://unity.com/blog/external-dependency-manager). So the packages here only use Unity's. It comes by itself, and you don't need Google's.

A package published here always names Unity's newest version at that time. To get a newer one sooner, add `com.unity.external-dependency-manager` to `Packages/manifest.json` with the version you want.

## Install with a scoped registry

Add this to `Packages/manifest.json`, with only the packages you want:

```json
{
  "dependencies": {
    "com.google.firebase.messaging": "14.1.0"
  },
  "scopedRegistries": [
    {
      "name": "Useful Packages",
      "url": "https://art-of-game.github.io/useful-packages",
      "scopes": ["com.google", "com.facebook"]
    }
  ]
}
```

Or add the registry in **Project Settings**, **Package Manager**, and install from **My Registries** in the Package Manager window.

## Install with a Git URL

In the Package Manager window press **+**, then **Install package from git URL**, and paste the URL with the package's name after `upm/`:

```
https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.app
https://github.com/Art-of-Game/useful-packages.git#upm/com.google.signin
```

To stay on one version, add it to the end, like `#upm/com.google.firebase.app/14.1.0`.

Unity fetches a package's dependencies from a registry, never from Git. So with Git URLs, add what the tables say a package brings first, like Firebase App before Firebase Cloud Messaging. With the scoped registry above, each package brings them by itself.

## Update

Select the package in the Package Manager window and press **Update**.
