# Useful packages

Unity packages I use in my projects, collected in one place. Each one installs on its own, so you only download what you need.

## What's here

| Package | What it is | Also brings |
|---|---|---|
| `com.google.firebase.app` | Firebase App (Core) | External Dependency Manager |
| `com.google.firebase.messaging` | Firebase Cloud Messaging | Firebase App |
| `com.coolishbee.google-signin` | Google Sign-In | External Dependency Manager |

These are the original packages from their authors, under their own licences. I only point them at Unity's External Dependency Manager and sign them. Each package says so in `Documentation~/MODIFIED.md`.

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
      "scopes": ["com.google.firebase", "com.coolishbee"]
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
```

To stay on one version, add it to the end, like `#upm/com.google.firebase.app/14.1.0`.

Git packages don't bring each other, so install Firebase App before Firebase Cloud Messaging.

## Update

Select the package in the Package Manager window and press **Update**.
