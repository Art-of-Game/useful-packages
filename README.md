# Useful packages

Unity packages I use in my projects, collected in one place. Each one installs on its own, so you only download what you need.

## What's here

| Package | What it is | Source | Also brings |
|---|---|---|---|
| `com.google.firebase.app` | Firebase App (Core) | [firebase/firebase-unity-sdk](https://github.com/firebase/firebase-unity-sdk) | External Dependency Manager |
| `com.google.firebase.messaging` | Firebase Cloud Messaging | [firebase/firebase-unity-sdk](https://github.com/firebase/firebase-unity-sdk) | Firebase App |
| `com.coolishbee.google-signin` | Google Sign-In | [coolishbee/google-signin-unity](https://github.com/coolishbee/google-signin-unity) | External Dependency Manager |
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
      "scopes": ["com.google.firebase", "com.coolishbee", "com.facebook"]
    }
  ]
}
```

Or add the registry in **Project Settings**, **Package Manager**, and install from **My Registries** in the Package Manager window.

## Install with a Git URL

In the Package Manager window press **+**, then **Install package from git URL**, and paste one of these:

```
https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.app
https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.messaging
https://github.com/Art-of-Game/useful-packages.git#upm/com.coolishbee.google-signin
https://github.com/Art-of-Game/useful-packages.git#upm/com.facebook.sdk
```

To stay on one version, add it to the end, like `#upm/com.google.firebase.app/14.1.0`.

Unity fetches a package's dependencies from a registry, never from Git. So with Git URLs, add Firebase App first and Firebase Cloud Messaging after it. With the scoped registry above, Firebase Cloud Messaging brings Firebase App by itself.

## Update

Select the package in the Package Manager window and press **Update**.
