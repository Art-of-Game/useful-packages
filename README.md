# Useful packages

A small Unity package registry, free on GitHub. Each package is its own download, a package brings its dependencies with
it, and the Package Manager window shows an **Update** button when a new version is published. Unity cannot do these with Git
URLs: it does not support Git dependencies between packages, and a Git package has no list of versions.

| Package | What it is |
|---|---|
| `com.google.firebase.messaging` | Firebase Cloud Messaging. Brings Firebase App |
| `com.google.firebase.app` | Firebase App (Core). Brings External Dependency Manager |
| `com.google.external-dependency-manager` | External Dependency Manager |

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
      "scopes": ["com.google.firebase", "com.google.external-dependency-manager"]
    }
  ]
}
```

## Update a package in a project

Package Manager window, **Packages: In Project**, select the package, **Update**.

## How new versions get here

`.github/workflows/update.yml` runs every day. When the vendor has a new version, `update.js` copies its `.tgz`, unchanged, into
a release of this repository and rewrites the files in `docs/`, which GitHub Pages serves to Unity. To run it now: **Actions**,
**Update packages**, **Run workflow**.

## Add a package

Add one entry to `packages.json`, for example `com.google.firebase.auth`, and run the workflow.

- `latestFrom` is the GitHub repository whose latest release gives the version number.
- `tarball` is the vendor's download address.

This repository is public: only packages whose licence allows it go here, with their licence inside. Never Asset Store packages.
