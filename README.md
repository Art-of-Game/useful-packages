# Useful packages

A small Unity package registry, free on GitHub. Each package is its own download, a package brings its dependencies with
it, and the Package Manager window shows an **Update** button when a new version is published. Unity cannot do these with Git
URLs: it does not support Git dependencies between packages, and a Git package has no list of versions.

| Package | What it is |
|---|---|
| `com.google.firebase.messaging` | Firebase Cloud Messaging. Brings Firebase App |
| `com.google.firebase.app` | Firebase App (Core). Brings External Dependency Manager |
| `com.google.external-dependency-manager` | Google's External Dependency Manager, deprecated. See below |

Unity marks these packages as unsigned (a yellow triangle and a **Missing Signature** notice), because the vendor's `.tgz` is not
signed. That is expected.

## External Dependency Manager

Google archived its package and points to Unity's, so use `com.unity.external-dependency-manager` from the Unity Registry. Firebase
App still names Google's package, so:

1. Add both to the project. Google's is here only so that Firebase App can install.
2. Choose **Use Unity's External Dependency Manager**, or **Assets > External Dependency Manager > Change To Unity's EDM**.
3. Unity writes an empty stand-in at `Packages/com.google.external-dependency-manager`. Commit that folder, along with
   `ProjectSettings/ExternalDependencyManagerSettings.json` and `ExternalDependencyManagerResolverSettings.asset`.

After this Google's package is no longer needed in `manifest.json`.

## Install

In `Packages/manifest.json`, add the registry and only the packages you use:

```json
{
  "dependencies": {
    "com.google.firebase.messaging": "14.1.0",
    "com.unity.external-dependency-manager": "2.1.1"
  },
  "scopedRegistries": [
    {
      "name": "Useful Packages",
      "url": "https://art-of-game.github.io/useful-packages",
      "scopes": ["com.google.firebase", "com.google.external-dependency-manager"]
    }
  ]
}
```

## Install by Git URL instead

Each package has its own branch and tags in Git and each holds only that package, so each one is still its own download. Unity
brings no dependencies for Git packages, so list each one yourself.

| End of the URL | What it gives |
|---|---|
| `#upm/<package>` | The newest version. **Update** in the Package Manager window fetches a new one |
| `#upm/<package>/<version>` | Exactly that version, it never changes |

```json
{
  "dependencies": {
    "com.google.external-dependency-manager": "https://github.com/Art-of-Game/useful-packages.git#upm/com.google.external-dependency-manager",
    "com.google.firebase.app": "https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.app",
    "com.google.firebase.messaging": "https://github.com/Art-of-Game/useful-packages.git#upm/com.google.firebase.messaging",
    "com.unity.external-dependency-manager": "2.1.1"
  }
}
```

GitHub takes no file over 100 MiB, so a version with a bigger file gets no Git tag (the workflow warns about it) but is still in
the registry.

## Update a package in a project

Package Manager window, **Packages: In Project**, select the package, **Update**. From the registry you can also pick any older
version under **Version History**. From a Git branch, press **Update** on Firebase App first, then on Firebase Cloud Messaging.

## How new versions get here

`.github/workflows/update.yml` runs every day. When the vendor has a new version, `update.js` copies its `.tgz`, unchanged, into
a release of this repository, adds its Git tag, moves its branch and rewrites the files in `docs/`, which GitHub Pages serves to
Unity. To run it now: **Actions**, **Update packages**, **Run workflow**.

## Add a package

Add one entry to `packages.json`, for example `com.google.firebase.auth`, and run the workflow.

- `latestFrom` is the GitHub repository whose latest release gives the version number.
- `tarball` is the vendor's download address.

This repository is public: only packages whose licence allows it go here, with their licence inside. Never Asset Store packages.
