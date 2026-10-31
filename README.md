# Useful packages

A small Unity package registry, free on GitHub. Each package is its own download, a package brings its dependencies with
it, the Package Manager window shows an **Update** button when a new version is published, and every package is signed for the
Unity organization Art Of Game, so Unity does not warn about it.

| Package | What it is |
|---|---|
| `com.google.firebase.messaging` | Firebase Cloud Messaging. Brings Firebase App |
| `com.google.firebase.app` | Firebase App (Core). Brings Unity's External Dependency Manager |
| `com.coolishbee.google-signin` | Google Sign-In. Brings Unity's External Dependency Manager |

These are the vendors' files with one change: they depend on Unity's `com.unity.external-dependency-manager`, because Google
deprecated and archived its own. Each package says so in `Documentation~/MODIFIED.md`.

## Install

In `Packages/manifest.json`, add the registry and only the packages you use:

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

## Install by Git URL instead

Each package has its own branch and tags in Git and each holds only that package, so each one is still its own download. Unity
brings no dependencies from Git, so list each Git package yourself. Unity's External Dependency Manager still comes by itself.

| End of the URL | What it gives |
|---|---|
| `#upm/<package>` | The newest version. **Update** in the Package Manager window fetches a new one |
| `#upm/<package>/<version>` | Exactly that version, it never changes |

```json
{
  "dependencies": {
    "com.google.firebase.app": "https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.app",
    "com.google.firebase.messaging": "https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.messaging"
  }
}
```

GitHub takes no file over 100 MiB, so a version with a bigger file gets no Git tag (the workflow warns about it) but is still in
the registry.

## Update a package in a project

Package Manager window, **Packages: In Project**, select the package, **Update**. From the registry you can also pick an older
version under **Version History**. From a Git branch, press **Update** on Firebase App first, then on Firebase Cloud Messaging.

## How new versions get here

`.github/workflows/update.yml` runs every day. When the vendor has a new version, `update.js` takes its files, changes the
dependency, signs the package, puts the `.tgz` in a release of this repository, adds its Git tag, moves its branch and rewrites the
files in `docs/`, which GitHub Pages serves to Unity. To run it now: **Actions**, **Update packages**, **Run workflow**.

## Signing

Signing in the workflow needs a Unity service account, once:

1. [Unity Cloud Dashboard](https://cloud.unity.com), organization **Art Of Game**, **Administration**, **Service accounts**: create one
   and generate a key.
2. Add it at the organization level, **Manage organization roles**, **Package Manager**: **Package Manager Package Signer**.
3. This repository, **Settings**, **Secrets and variables**, **Actions**: add `UPM_SERVICE_ACCOUNT_KEY_ID` and
   `UPM_SERVICE_ACCOUNT_KEY_SECRET`.
4. **Actions**, **Update packages**, **Run workflow**, tick **Only check that signing works**.

Without these secrets the workflow fails when a new version comes out, so nothing unsigned gets published and GitHub says so by
email. To publish by hand, sign in an open Editor signed in to the organization:

```bash
node update.js prepare com.google.firebase.app 14.1.0 work/app
```

```csharp
UnityEditor.PackageManager.Client.Pack("work/app/package", "work/signed", "18968138129184");
```

```bash
node update.js publish work/signed/com.google.firebase.app-14.1.0.tgz
```

## Add a package

Add one entry to `packages.json`, for example `com.google.firebase.auth`, and run the workflow. Add its scope to your `manifest.json`
if it has a new one.

- `latestFrom` is the GitHub repository whose latest release gives the version number. With `"latestBy": "tag"`, its newest tag.
- `tarball` is the vendor's download address.
- `folder` is where the package sits inside that archive, when it is not `package/`.

This repository is public: only packages whose licence allows it go here, with their licence inside. Never Asset Store packages.
