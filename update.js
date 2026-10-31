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

function latestVersion(entry) {
  const tag = entry.latestBy === "tag"
    ? gh("api", `repos/${entry.latestFrom}/tags`, "--jq", ".[0].name")
    : gh("api", `repos/${entry.latestFrom}/releases/latest`, "--jq", ".tag_name");
  return tag.replace(/^v/, "");
}

// Writes the vendor's files to <folder>/package with the dependency changed. Returns false when the vendor has no such file yet.
async function prepare(entry, version, folder) {
  const source = fill(entry.tarball, entry.name, version);
  const response = await fetch(source);
  if (!response.ok) {
    console.log(`${entry.name} ${version}: not available yet (${response.status} from ${source})`);
    return false;
  }

  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "source.tgz"), Buffer.from(await response.arrayBuffer()));
  execFileSync("tar", ["-xzf", "source.tgz"], { cwd: folder });
  fs.rmSync(path.join(folder, "source.tgz"));
  const tree = path.join(folder, "package");
  if (entry.folder) fs.renameSync(path.join(folder, fill(entry.folder, entry.name, version)), tree);

  const manifestFile = path.join(tree, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.name !== entry.name || manifest.version !== version) {
    throw new Error(`${source} holds ${manifest.name} ${manifest.version}`);
  }

  const changes = [];
  for (const [from, to] of Object.entries(config.replaceDependencies)) {
    if (!manifest.dependencies?.[from]) continue;
    delete manifest.dependencies[from];
    manifest.dependencies[to.name] = to.version;
    changes.push(`- \`package.json\` names \`${to.name}\` instead of \`${from}\`, which its vendor has deprecated.`);
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
  if (!fs.existsSync(upm)) execFileSync("bash", ["-c", "curl -fsSL https://cdn.packages.unity.com/upm-cli/install.sh | bash"], { stdio: "inherit" });
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
  const notes = `The vendor's files from ${fill(entry.tarball, name, version)}, changed as \`Documentation~/MODIFIED.md\` in the package says, and signed for ${config.organizationName}.`;
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

async function publishNewVersions() {
  for (const entry of config.packages) {
    const version = latestVersion(entry);
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
    const version = latestVersion(entry);
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
