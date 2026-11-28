// <copyright file="GoogleSignIn.cs" company="Google Inc.">
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

namespace Google
{
    using System;
    using System.Runtime.Serialization;
    using System.Threading.Tasks;
    using Google.Impl;
    using UnityEngine;

    /// <summary>
    /// Google sign in API.
    /// </summary>
    /// <remarks>This class implements the GoogleSignInAPI for Unity.
    /// Typical usage is to set the Configuration options as needed, then
    /// get the DefaultInstance and call SignIn.  See
    /// the <a href="https://developers.google.com/identity">
    /// Google Sign-In API documentation for more details.</a>
    /// <para>
    /// <code>
    /// private static readonly GoogleSignInConfiguration configuration =
    ///                        new GoogleSignInConfiguration {
    ///                          WebClientId = "<your client id here >"
    ///                        };
    ///
    /// public void OnSignIn() {
    ///   GoogleSignIn.Configuration = configuration;
    ///   GoogleSignIn.DefaultInstance.SignIn().ContinueWith(
    ///           OnAuthenticationFinished);
    /// }
    /// </code>
    /// </para>
    /// </remarks>
    public class GoogleSignIn
    {
#if !UNITY_ANDROID && !UNITY_IOS && !UNITY_EDITOR && !UNITY_STANDALONE
  static GoogleSignIn() {
    Debug.LogError("This platform is not supported");
  }
#endif

        private static GoogleSignIn theInstance = null;
        private static GoogleSignInConfiguration theConfiguration = null;
        private ISignInImpl impl;

        ///<summary> The configuration settings for Google Sign-in.</summary>
        ///<remarks> The configuration should be set before calling the sign-in
        /// methods.  Once the configuration is set it cannot be changed.
        ///</remarks>
        public static GoogleSignInConfiguration Configuration
        {
            set
            {
                // Can set the configuration until the singleton is created.
                if (theInstance == null || theConfiguration == value || theConfiguration == null)
                {
                    theConfiguration = value;
                }
                else
                {
                    throw new SignInException(GoogleSignInStatusCode.DEVELOPER_ERROR,
                        "DefaultInstance already created. Cannot change configuration after creation.");
                }
            }

            get { return theConfiguration; }
        }

        /// <summary>
        /// Singleton instance of this class.
        /// </summary>
        /// <value>The instance.</value>
        public static GoogleSignIn DefaultInstance
        {
            get
            {
                if (theInstance == null)
                {
#if UNITY_EDITOR || UNITY_STANDALONE
                    theInstance = new GoogleSignIn(new GoogleSignInImplEditor(Configuration));
#elif UNITY_ANDROID || UNITY_IOS
          theInstance = new GoogleSignIn(new GoogleSignInImpl(Configuration));
#else
          theInstance = new GoogleSignIn(null);
          throw new SignInException(GoogleSignInStatusCode.DEVELOPER_ERROR,"This platform is not supported by GoogleSignIn");
#endif
                }

                return theInstance;
            }
        }

        internal GoogleSignIn(ISignInImpl impl)
        {
            this.impl = impl;
        }

        public void EnableDebugLogging(bool flag)
        {
            impl.EnableDebugLogging(flag);
        }

        /// <summary>Starts an explicit authentication request.</summary>
        /// <remarks>
        /// May display account picker popups and consent prompts. On Android the
        /// UI is chosen by Configuration.AndroidSignInStyle (Popup by default, or
        /// BottomSheet). iOS, Editor and desktop always use their single
        /// interactive flow. This method does not provide a cache-only or silent
        /// sign-in API.
        /// </remarks>
        public Task<GoogleSignInUser> SignIn()
        {
            var tcs = new TaskCompletionSource<GoogleSignInUser>();
            SignInHelperObject.Instance.StartCoroutine(impl.SignIn().WaitForResult(tcs));
            return tcs.Task;
        }

        public Task<GoogleSignInUser> SignInAsync()
        {
            var tcs = new TaskCompletionSource<GoogleSignInUser>();
            impl.SignIn().WaitForResultAsync(tcs).ContinueWith((task) => { });
            return tcs.Task;
        }

        public Future<GoogleSignInUser> SignInFuture() => impl.SignIn();

        /// <summary>
        /// Signs out the User.
        /// </summary>
        /// <remarks>Clears app authentication state while retaining the initial configuration and the Google account session.
        /// The caller is responsible for ending the game server session.</remarks>
        public void SignOut()
        {
            impl.SignOut();
        }

        /// <summary>
        /// Disconnect this instance.
        /// </summary>
        /// <remarks>Revokes app access on mobile or Google ID token sharing consent on desktop.
        /// Desktop opens a browser and requires the most recent signed-in account.
        /// Asynchronous completion and failures are logged. The game server session is unchanged.</remarks>
        public void Disconnect()
        {
            impl.Disconnect();
        }

        /// <summary>
        /// Sign in exception.  This is a checked exception for handling specific
        /// errors during the sign-in process.
        /// </summary>
        [Serializable]
        public class SignInException : Exception
        {
            internal SignInException(GoogleSignInStatusCode status)
            {
                Status = status;
            }

            public SignInException(GoogleSignInStatusCode status, string message) :
                base(message)
            {
                Status = status;
            }

            public SignInException(GoogleSignInStatusCode status, string message,
                Exception innerException) : base(message, innerException)
            {
                Status = status;
            }

            protected SignInException(GoogleSignInStatusCode status,
                SerializationInfo info,
                StreamingContext context) :
                base(info, context)
            {
                Status = status;
            }

            public GoogleSignInStatusCode Status { get; internal set; }
        }
    }

    internal interface ISignInImpl
    {
        Future<GoogleSignInUser> SignIn();
        void EnableDebugLogging(bool flag);
        void SignOut();
        void Disconnect();
    }
} // namespace Google