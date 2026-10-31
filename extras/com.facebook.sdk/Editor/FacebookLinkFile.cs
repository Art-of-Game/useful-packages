using System.IO;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.UnityLinker;

namespace Facebook.Unity.PostProcess
{
    /// <summary>
    /// Keeps the Android and iOS classes the SDK loads by name in a build. Unity reads no link.xml from inside a package,
    /// so this hands it the one that comes with the SDK.
    /// </summary>
    public sealed class FacebookLinkFile : IUnityLinkerProcessor
    {
        public int callbackOrder => 0;

        public string GenerateAdditionalLinkXmlFile(BuildReport report, UnityLinkerBuildPipelineData data)
        {
            return Path.GetFullPath("Packages/com.facebook.sdk/link.xml");
        }
    }
}
