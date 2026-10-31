# Changes by Art of Game

This package was changed from the original at https://github.com/meta/facebook-sdk-for-unity/releases/download/sdk-version-19.0.0/facebook-unity-sdk-19.0.0.zip

- Made into a Unity package from Meta's `.unitypackage`. All of Meta's files are here. The only thing left out is Google's External Dependency Manager, which Meta bundles and Google has deprecated.
- Meta's examples, the IAP sample they call and the StreamingAssets files they read are under **Samples** in the Package Manager window, so they only enter a project when you import them.
- `package.json` is new and depends on `com.unity.external-dependency-manager`.
- `Editor/Facebook.Unity.PostProcess.asmdef` is new, because Unity compiles no script in a package without one.
- `Editor/FacebookLinkFile.cs` is new, because Unity reads no `link.xml` from inside a package.
- The `.meta` files of `XInputDotNetPure.dll` and the two `XInputInterface.dll` now say what Meta's `FacebookImporter` sets, because that importer does nothing to files in a package.
- `package.json` links the vendor's documentation, changelog and licence.
- Signed for the Unity organization Art Of Game, which adds `.attestation.p7m`.

Every other file is the original, under its own licence in this package.
