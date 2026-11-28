# Changelog

## 1.1.0

This release includes breaking API and compatibility changes. See the migration guide in the README before upgrading.

### Breaking changes

- Unified authentication under the `SignIn()` family and added Android sign-in UI style selection.
- Removed the client secret and unused profile and token request settings.
- Raised the minimum Unity version to `2022.3` and switched to Unity External Dependency Manager `2.1.1`.
- Made the supported URL scheme the single source of the iOS client ID.

### Added and fixed

- Added browser sign-in without a client secret, request cancellation, and timeouts for Editor and desktop.
- Implemented Android and desktop disconnect while retaining native mobile sign-out and disconnect.
- Updated the Android authentication library to `22.0.0` for access revocation.
- Updated the iOS authentication library to `10.1.0`.
- Retained the initial configuration after sign-out and corrected the linker preservation type name.
- Fixed additional scope forwarding and UTF-8 string buffer lengths on iOS.
- Updated the samples and documentation for the new authentication flow.

## 1.0.0

- Added UPM package distribution and an importable sign-in sample.
- Added automated version tagging and releases from the default branch.
- Updated Android authentication to Credential Manager and Authorization Client.
- Updated the iOS authentication library to version 9.x.
- Separated authentication entry points into `SignInLegacy()` and `SignIn()`.
