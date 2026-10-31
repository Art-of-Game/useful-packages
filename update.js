// Publishes new versions of the packages in packages.json. It takes the vendor's files, points them at Unity's External
// Dependency Manager, signs the package for the Unity organization, puts the .tgz in a GitHub release, rewrites the registry
// files in docs/ that Unity reads, and keeps the Git tags and branches.
//
//   node update.js                                       the newest version of every package, signed with the UPM CLI
//   node update.js test-signing <package>                signs the package's newest version and publishes nothing
//   node update.js prepare <package> <version> <folder>  writes the changed package to <folder>/package, to sign elsewhere
//   node update.js publish <signed .tgz>                 publishes a package that was signed elsewhere

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "packages.json"), "utf8"));
const docs = path.join(__dirname, "docs");

const gh = (...args) => execFileSync("gh", args, { cwd: __dirname, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const newest = (versions) => [...versions].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
const hash = (algorithm, bytes, encoding) => crypto.createHash(algorithm).update(bytes).digest(encoding);
const fill = (text, name, version) => text.replaceAll("{name}", name).replaceAll("{version}", version);
// {ref} is the version, or the commit "commits" names for it when the vendor fixed something after tagging that version.
const fillRef = (text, entry, version) => fill(text, entry.name, version).replaceAll("{ref}", entry.commits?.[version] ?? version);
const tempFolder = () => fs.mkdtempSync(path.join(os.tmpdir(), "useful-packages-"));

const run = (cwd, env, ...args) =>
  execFileSync("git", ["-c", "core.autocrlf=false", "-c", "core.longpaths=true", "-c", "user.name=Art of Game",
    "-c", "user.email=186954620+ArtOfGameGit@users.noreply.github.com", ...args],
    { cwd, env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function readDoc(name) {
  const file = path.join(docs, name);
  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { name, "dist-tags": {}, versions: {}, time: {} };
}

function write(relativePath, value) {
  const file = path.join(docs, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function hasRelease(tag) {
  try {
    gh("release", "view", tag, "--repo", config.repo, "--json", "tagName");
    return true;
  } catch {
    return false;
  }
}

// Google's Play packages have no releases of their own, only this page.
let googleArchive;
async function newestInGoogleArchive(name) {
  googleArchive ??= await (await fetch("https://developers.google.com/unity/archive")).text();
  const found = [...googleArchive.matchAll(/registry\/unity\/([a-z0-9.\-]+)\/\1-(\d[0-9a-zA-Z.\-]*)\.tgz/g)]
    .filter((match) => match[1] === name)
    .map((match) => match[2]);
  if (!found.length) throw new Error(`${name} is not on Google's archive page`);
  return newest(found);
}

async function latestVersion(entry) {
  if (entry.latestBy === "archive") return newestInGoogleArchive(entry.name);
  const tag = entry.latestBy === "tag"
    ? gh("api", `repos/${entry.latestFrom}/tags`, "--jq", ".[0].name")
    : gh("api", `repos/${entry.latestFrom}/releases/latest`, "--jq", ".tag_name");
  return tag.replace(/^\D+/, "");
}

// A package.json must name an exact version, so "latest" becomes the Unity Registry's newest version when a package is published.
async function newestInUnityRegistry(name) {
  const response = await fetch(`https://packages.unity.com/${name}`);
  if (!response.ok) throw new Error(`${response.status} from the Unity Registry for ${name}`);
  return (await response.json())["dist-tags"].latest;
}

// Unity wants a .meta next to every file and folder of a package. The same path always gets the same guid.
function addMissingMetas(name, tree, folder = tree) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    if (item.name.endsWith(".meta") || item.name.endsWith("~")) continue;
    const full = path.join(folder, item.name);
    if (item.isDirectory()) addMissingMetas(name, tree, full);
    if (fs.existsSync(`${full}.meta`)) continue;
    const relative = path.relative(tree, full).replaceAll("\\", "/");
    const lines = ["fileFormatVersion: 2", `guid: ${hash("md5", `${name}/${relative}`, "hex")}`];
    if (item.isDirectory()) lines.push("folderAsset: yes", "DefaultImporter:", "  externalObjects: {}", "  userData: ", "  assetBundleName: ", "  assetBundleVariant: ");
    fs.writeFileSync(`${full}.meta`, lines.join("\n") + "\n");
  }
}

async function addLicence(entry, version, tree) {
  const licence = await fetch(fill(entry.licence, entry.name, version));
  if (!licence.ok) throw new Error(`${licence.status} from ${entry.licence}`);
  fs.writeFileSync(path.join(tree, "LICENSE.txt"), Buffer.from(await licence.arrayBuffer()));
  addMissingMetas(entry.name, tree);
}

// A vendor without a package ships a .unitypackage, which is one folder per file: its path, the file and its .meta. This takes
// the paths named in "take", then adds extras/<package> and the licence.
async function packageFromUnitypackage(entry, version, folder) {
  const { name } = entry;
  const tree = path.join(folder, "package");
  const files = path.join(folder, "files");
  fs.mkdirSync(files);
  execFileSync("unzip", ["-q", "source.download", "-d", "zip"], { cwd: folder });
  execFileSync("tar", ["-xzf", `../zip/${fill(entry.unitypackage, name, version)}`], { cwd: files });

  for (const guid of fs.readdirSync(files)) {
    const pathFile = path.join(files, guid, "pathname");
    if (!fs.existsSync(pathFile) || !fs.existsSync(path.join(files, guid, "asset"))) continue;
    const vendorPath = fs.readFileSync(pathFile, "utf8").split("\n")[0].trim();
    const start = Object.keys(entry.take).find((prefix) => vendorPath.startsWith(prefix));
    if (!start) {
      // Something new from the vendor must not go missing without anyone noticing.
      if (!entry.leaveOut.some((prefix) => vendorPath.startsWith(prefix))) throw new Error(`${name} ${version} has ${vendorPath}, which packages.json does not mention`);
      continue;
    }
    const target = path.join(tree, entry.take[start], vendorPath.slice(start.length));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(files, guid, "asset"), target);
    fs.copyFileSync(path.join(files, guid, "asset.meta"), `${target}.meta`);
  }

  // The vendor's importer only sets a plugin's platforms under Assets, so these take the .meta of a file set the way it sets them.
  for (const [file, like] of Object.entries(entry.metaLike ?? {})) {
    const own = /^guid: .*$/m.exec(fs.readFileSync(path.join(tree, `${file}.meta`), "utf8"))[0];
    fs.writeFileSync(path.join(tree, `${file}.meta`), fs.readFileSync(path.join(tree, `${like}.meta`), "utf8").replace(/^guid: .*$/m, own));
  }

  fs.cpSync(path.join(__dirname, "extras", name), tree, { recursive: true });
  const manifestFile = path.join(tree, "package.json");
  fs.writeFileSync(manifestFile, fill(fs.readFileSync(manifestFile, "utf8"), name, version));

  await addLicence(entry, version, tree);
  fs.rmSync(files, { recursive: true, force: true });
  fs.rmSync(path.join(folder, "zip"), { recursive: true, force: true });
}

// Writes the vendor's files to <folder>/package with the dependency changed. Returns false when the vendor has no such file yet.
async function prepare(entry, version, folder) {
  const source = fillRef(entry.tarball, entry, version);
  const response = await fetch(source);
  if (!response.ok) {
    console.log(`${entry.name} ${version}: not available yet (${response.status} from ${source})`);
    return false;
  }

  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "source.download"), Buffer.from(await response.arrayBuffer()));
  const tree = path.join(folder, "package");
  if (entry.take) {
    await packageFromUnitypackage(entry, version, folder);
  } else {
    execFileSync("tar", ["-xzf", "source.download"], { cwd: folder });
    if (entry.folder) fs.renameSync(path.join(folder, fillRef(entry.folder, entry, version)), tree);
    if (entry.licence) await addLicence(entry, version, tree);
  }
  fs.rmSync(path.join(folder, "source.download"));

  const manifestFile = path.join(tree, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.name !== (entry.vendorName ?? entry.name) || manifest.version !== version) {
    throw new Error(`${source} holds ${manifest.name} ${manifest.version}`);
  }

  const changes = [...(entry.changes ?? [])];
  if (entry.commits?.[version]) changes.push(`- Taken from commit \`${entry.commits[version]}\`, which is newer than the vendor's ${version} tag and has the same version number.`);
  if (entry.vendorName) {
    manifest.name = entry.name;
    changes.push(`- Named \`${entry.name}\` instead of \`${entry.vendorName}\`, so it sits with the other Google packages.`);
  }
  if (entry.description) {
    manifest.description = entry.description;
    changes.push("- `package.json` has a longer description that names the authors.");
  }
  if (entry.author) {
    manifest.author = entry.author;
    changes.push(`- \`package.json\` names ${entry.author.name} as the author, which the original leaves out.`);
  }
  // The Documentation, Changelog and Licenses links in the Package Manager window read these fields.
  if (entry.links) {
    for (const [field, url] of Object.entries(entry.links)) manifest[field] = fill(url, entry.name, version);
    changes.push("- `package.json` links the vendor's documentation, changelog and licence.");
  }
  for (const [dependency, wanted] of Object.entries(entry.addDependencies ?? {})) {
    (manifest.dependencies ??= {})[dependency] = wanted;
    changes.push(`- \`package.json\` names \`${dependency}\`, which the package uses without naming it.`);
  }
  for (const [from, to] of Object.entries(config.replaceDependencies)) {
    if (!manifest.dependencies?.[from]) continue;
    delete manifest.dependencies[from];
    manifest.dependencies[to.name] = to.version;
    changes.push(`- \`package.json\` names \`${to.name}\` instead of \`${from}\`, which its vendor has deprecated.`);
  }
  for (const [dependency, wanted] of Object.entries(manifest.dependencies ?? {})) {
    if (wanted === "latest") manifest.dependencies[dependency] = await newestInUnityRegistry(dependency);
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

  // Documentation~ is ignored by Unity, so this note needs no .meta file.
  fs.mkdirSync(path.join(tree, "Documentation~"), { recursive: true });
  fs.writeFileSync(path.join(tree, "Documentation~", "MODIFIED.md"), [
    "# Changes by Art of Game",
    "",
    `This package was changed from the original at ${source}`,
    "",
    ...changes,
    `- Signed for the Unity organization ${config.organizationName}, which adds \`.attestation.p7m\`.`,
    "",
    "Every other file is the original, under its own licence in this package.",
    "",
  ].join("\n"));
  return true;
}

function sign(tree, destination, what) {
  if (!process.env.UPM_SERVICE_ACCOUNT_KEY_ID || !process.env.UPM_SERVICE_ACCOUNT_KEY_SECRET) {
    throw new Error(`${what} cannot be signed: add the repository secrets UPM_SERVICE_ACCOUNT_KEY_ID and UPM_SERVICE_ACCOUNT_KEY_SECRET.`);
  }
  const upm = path.join(os.homedir(), ".upm", "bin", "upm");
  if (!fs.existsSync(upm)) execFileSync("bash", ["-o", "pipefail", "-c", "curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 https://cdn.packages.unity.com/upm-cli/install.sh | bash"], { stdio: "inherit" });
  execFileSync(upm, ["pack", tree, "--organization-id", config.organizationId, "--destination", destination], { stdio: "inherit" });

  const files = fs.readdirSync(destination).filter((file) => file.endsWith(".tgz"));
  if (files.length !== 1) throw new Error(`expected one .tgz in ${destination}, found ${files.length}`);
  return path.join(destination, files[0]);
}

function publish(tarball) {
  const cwd = path.dirname(tarball);
  const fileName = path.basename(tarball);
  const listing = execFileSync("tar", ["-tzf", fileName], { cwd, encoding: "utf8", maxBuffer: 1 << 26 });
  if (!listing.split("\n").includes("package/.attestation.p7m")) throw new Error(`${fileName} is not signed`);

  const manifest = JSON.parse(execFileSync("tar", ["-xzOf", fileName, "package/package.json"], { cwd, encoding: "utf8" }));
  const { name, version } = manifest;
  const entry = config.packages.find((item) => item.name === name);
  if (!entry) throw new Error(`${name} is not in packages.json`);

  const assetName = `${name}-${version}.tgz`;
  const tag = `${name}-${version}`;
  const notes = `The vendor's files from ${fillRef(entry.tarball, entry, version)}, changed as \`Documentation~/MODIFIED.md\` in the package says, and signed for ${config.organizationName}.`;
  const title = `${manifest.displayName} ${version}`;
  const asset = `${tarball}#${assetName}`;
  if (hasRelease(tag)) {
    gh("release", "upload", tag, asset, "--clobber", "--repo", config.repo);
    gh("release", "edit", tag, "--repo", config.repo, "--title", title, "--notes", notes);
  } else {
    gh("release", "create", tag, asset, "--repo", config.repo, "--latest=false", "--title", title, "--notes", notes);
  }

  const bytes = fs.readFileSync(tarball);
  const doc = readDoc(name);
  doc.versions[version] = {
    ...manifest,
    _id: `${name}@${version}`,
    dist: {
      tarball: `https://github.com/${config.repo}/releases/download/${tag}/${assetName}`,
      shasum: hash("sha1", bytes, "hex"),
      integrity: `sha512-${hash("sha512", bytes, "base64")}`,
    },
  };
  doc.description = manifest.description;
  doc["dist-tags"].latest = newest(Object.keys(doc.versions));
  doc.time[version] = new Date().toISOString();
  doc.time.modified = doc.time[version];
  write(name, doc);
  console.log(`${name} ${version}: published`);
}

// The branch upm/<package> always sits on the newest version. A project installed from the branch gets a new version
// from the Update button of the Package Manager window, one installed from a tag stays on that version.
function moveNewestBranch(name, version) {
  const remoteCommit = (ref) => run(__dirname, {}, "ls-remote", "origin", ref).split(/\s/)[0];
  const tag = `refs/tags/upm/${name}/${version}`;
  const branch = `refs/heads/upm/${name}`;
  const commit = remoteCommit(tag);
  if (!commit || commit === remoteCommit(branch)) return;
  run(__dirname, {}, "fetch", "--depth=1", "origin", tag);
  run(__dirname, {}, "push", "--force", "origin", `${commit}:${branch}`);
  console.log(`${name}: branch upm/${name} is now on ${version}`);
}

// A Git URL needs the package's files in Git. Each version gets its own tag, and that tag's commit holds only
// that package with no parent, so a shallow clone of the tag downloads just that package.
async function syncGitTag(doc, version) {
  const { name } = doc;
  const entry = doc.versions[version];
  if (entry._gitTagOf === entry.dist.shasum) return;

  const response = await fetch(entry.dist.tarball);
  if (!response.ok) throw new Error(`${response.status} from ${entry.dist.tarball}`);
  const tempDir = tempFolder();
  fs.writeFileSync(path.join(tempDir, "package.tgz"), Buffer.from(await response.arrayBuffer()));
  execFileSync("tar", ["-xzf", "package.tgz"], { cwd: tempDir });

  const tree = path.join(tempDir, "package");
  fs.writeFileSync(path.join(tree, ".gitattributes"), "* -text\n");
  const env = {
    GIT_DIR: path.join(__dirname, ".git"),
    GIT_WORK_TREE: tree,
    GIT_INDEX_FILE: path.join(tempDir, "index"),
  };
  run(tree, env, "add", "-A", "-f", ".");
  const commit = run(tree, env, "commit-tree", run(tree, env, "write-tree"), "-m", `${name} ${version}`);
  run(__dirname, {}, "push", "--force", "origin", `${commit}:refs/tags/upm/${name}/${version}`);
  fs.rmSync(tempDir, { recursive: true, force: true });

  entry._gitTagOf = entry.dist.shasum;
  write(name, doc);
  console.log(`${name} ${version}: Git tag upm/${name}/${version}`);
}

// Unity lists a registry's packages from these two files, the package's own file says everything else.
function writeListings() {
  const all = { _updated: 0 };
  const objects = [];
  for (const { name } of config.packages) {
    const doc = readDoc(name);
    const latest = doc["dist-tags"].latest;
    if (!latest) continue;
    const manifest = doc.versions[latest];
    all[name] = {
      name,
      description: manifest.description,
      "dist-tags": doc["dist-tags"],
      versions: { [latest]: "latest" },
      time: { modified: doc.time.modified },
    };
    objects.push({
      package: {
        name,
        version: latest,
        displayName: manifest.displayName,
        description: manifest.description,
        keywords: manifest.keywords,
        author: manifest.author,
        date: doc.time.modified,
      },
      score: { final: 1, detail: { quality: 1, popularity: 1, maintenance: 1 } },
      searchScore: 1,
    });
  }
  write("-/all", all);
  write("-/v1/search", { objects, total: objects.length, time: new Date(0).toUTCString() });
}

// One vendor's surprise must not hold back the others. The run still fails at the end, so GitHub sends its email.
async function publishNewVersions() {
  for (const entry of config.packages) {
    try {
      // "alsoVersions" are older versions a project stays on, like the MagicOnion client that must match its server.
      for (const version of [...(entry.alsoVersions ?? []), await latestVersion(entry)]) {
        if (readDoc(entry.name).versions[version]) {
          console.log(`${entry.name} ${version}: already published`);
          continue;
        }
        const work = tempFolder();
        if (await prepare(entry, version, work)) {
          publish(sign(path.join(work, "package"), path.join(work, "signed"), `${entry.name} ${version}`));
        }
        fs.rmSync(work, { recursive: true, force: true });
      }
    } catch (error) {
      console.log(`::error::${entry.name}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const entryNamed = (name) => {
    const entry = config.packages.find((item) => item.name === name);
    if (!entry) throw new Error(`${name} is not in packages.json`);
    return entry;
  };

  if (command === "prepare") {
    const [name, version, folder] = args;
    if (!(await prepare(entryNamed(name), version, folder))) process.exit(1);
    return;
  }
  if (command === "publish") {
    args.forEach(publish);
    writeListings();
    return;
  }
  if (command === "test-signing") {
    const entry = entryNamed(args[0]);
    const version = await latestVersion(entry);
    const work = tempFolder();
    if (!(await prepare(entry, version, work))) process.exit(1);
    const signed = sign(path.join(work, "package"), path.join(work, "signed"), `${entry.name} ${version}`);
    console.log(`Signing works: ${path.basename(signed)}, ${fs.statSync(signed).size} bytes, nothing was published.`);
    return;
  }

  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, ".nojekyll"), "");
  await publishNewVersions();
  writeListings();

  // A refused Git tag (GitHub takes no file over 100 MiB) must not stop the registry, which has no such limit.
  for (const { name } of config.packages) {
    const doc = readDoc(name);
    for (const version of Object.keys(doc.versions)) {
      try {
        await syncGitTag(doc, version);
      } catch (error) {
        console.log(`::warning::${name} ${version} has no Git tag: ${error.message}`);
      }
    }
    if (doc["dist-tags"].latest) moveNewestBranch(name, doc["dist-tags"].latest);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
