// <copyright file="GoogleSignInConfiguration.cs" company="Google Inc.">
// Copyright (C) 2017 Google Inc. All Rights Reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//    limitations under the License.
// </copyright>

namespace Google {
  using System.Collections.Generic;

  /// <summary>Android sign-in UI. Ignored on iOS, Editor and desktop.</summary>
  public enum AndroidSignInStyle {
    /// <summary>"Sign in with Google" dialog (GetSignInWithGoogleOption).
    /// Always shows the account chooser and allows adding an account.</summary>
    Popup,
    /// <summary>Credential Manager bottom sheet (GetGoogleIdOption).
    /// Honors HidePopups.</summary>
    BottomSheet,
  }

  /// <summary>
  /// Configuration properties for Google Sign-In.
  /// </summary>
  public class GoogleSignInConfiguration {
#if UNITY_EDITOR || UNITY_STANDALONE
    /// <summary>Fixed localhost port for the Editor and desktop GIS login page.</summary>
    /// <remarks>Register http://localhost and http://localhost:PORT as authorized
    /// JavaScript origins for WebClientId. An occupied port fails sign-in;
    /// a different port is never selected automatically.</remarks>
    public int DesktopLoginPort = 49215;
#endif
    /// <summary>Web client id associated with this app.</summary>
    /// <remarks>Required on every platform. The ID token is issued for this client.</remarks>
    public string WebClientId = null;
    /// <summary>Set to true for getting an auth code when authenticating.
    /// </summary>
    /// <remarks>Not supported by Editor/desktop GIS sign-in; it is ignored there
    /// with a warning and AuthCode stays null.</remarks>
    public bool RequestAuthCode = false;
    /// <summary>Set to true to request to reset the refresh token.
    ///   Causes re-consent.
    /// </summary>
    /// <remarks>Ignored on Editor/desktop, where SignIn always starts an
    /// interactive GIS flow without a token cache.</remarks>
    public bool ForceTokenRefresh = false;
    /// <summary>Request email address, requires consent.</summary>
    public bool RequestEmail = false;
    /// <summary>Android sign-in UI used by SignIn. Defaults to Popup.</summary>
    /// <remarks>Ignored on iOS, Editor and desktop. Not platform-gated, so shared
    /// configuration code compiles on every platform. Read once when
    /// DefaultInstance is created.</remarks>
    public AndroidSignInStyle AndroidSignInStyle = AndroidSignInStyle.Popup;
    /// <summary>Controls Android Credential Manager account selection behavior.</summary>
    /// <remarks>Applies only when AndroidSignInStyle is BottomSheet: when true, prefers
    /// immediately available credentials, filters to authorized accounts and
    /// permits automatic selection. This does not guarantee that every popup is
    /// hidden. Ignored for Popup, iOS, Editor and desktop. Defaults to false.
    /// </remarks>
    public bool HidePopups = false;
    /// <summary>Optional user ID or email hint for iOS and Editor/desktop sign-in.</summary>
    /// <remarks>Null or empty means no hint. The hint does not enforce an account.
    /// Unsupported and ignored on Android; it is never used as an ID-token nonce.</remarks>
    public string AccountName = null;
    /// <summary>Additional scopes to request, requires consent.</summary>
    public IEnumerable<string> AdditionalScopes = null;
  }
}

