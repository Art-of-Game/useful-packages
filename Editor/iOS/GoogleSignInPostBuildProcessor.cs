// <copyright file="GoogleSignInPostBuildProcessor.cs" company="Google Inc.">
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
//  limitations under the License.
// </copyright>

#if UNITY_EDITOR && UNITY_IOS
namespace Google.Editor
{
    using System.IO;
    using System.Linq;
    using UnityEditor;
    using UnityEditor.Build;
    using UnityEditor.Build.Reporting;
    using UnityEditor.iOS.Xcode;
    using UnityEngine;

    /// <summary>Writes GIDClientID into the generated Xcode Info.plist.</summary>
    /// <remarks>This is the only source of the iOS client ID: the runtime
    /// configures GIDSignIn from GIDClientID. The value is derived from the
    /// reversed client id that Unity writes into CFBundleURLTypes from
    /// PlayerSettings.iOS.iOSUrlSchemes, so the callback URL scheme and the
    /// client ID cannot disagree. The server client ID is not written here;
    /// the runtime passes GoogleSignInConfiguration.WebClientId instead.</remarks>
    public class GoogleSignInPostBuildProcessor : IPostprocessBuildWithReport
    {
        private const string ReversedClientIdPrefix = "com.googleusercontent.apps.";

        public int callbackOrder
        {
            get { return 999; }
        }

        public void OnPostprocessBuild(BuildReport report)
        {
            if (report.summary.platform != BuildTarget.iOS)
            {
                return;
            }

            string infoPlist = Path.Combine(report.summary.outputPath, "Info.plist");
            if (!File.Exists(infoPlist))
            {
                return;
            }

            string googleScheme =
                PlayerSettings.iOS.iOSUrlSchemes.FirstOrDefault(scheme => scheme.StartsWith(ReversedClientIdPrefix));
            if (string.IsNullOrEmpty(googleScheme))
            {
                Debug.LogWarning(
                    "GoogleSignIn: no '" + ReversedClientIdPrefix + "*' URL scheme is " +
                    "configured in Player Settings > iOS > Supported URL schemes.  " +
                    "Without it the sign-in callback cannot return to the app and " +
                    "GIDClientID is left out of Info.plist.");
                return;
            }

            PlistDocument plistDoc = new PlistDocument();
            plistDoc.ReadFromFile(infoPlist);
            plistDoc.root.SetString(
                "GIDClientID",
                string.Join(".", googleScheme.Split('.').Reverse().ToArray()));
            plistDoc.WriteToFile(infoPlist);
        }
    }
}
#endif
