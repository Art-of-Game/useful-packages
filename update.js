// Publishes new versions of the packages in packages.json: copies the vendor's .tgz, unchanged, into a
// GitHub release of this repository and rewrites the registry files in docs/ that Unity reads.
//
//   node update.js                       the newest version of every package
//   node update.js <package> <version>   one particular version

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

async function publish(entry, version) {
  const doc = readDoc(entry.name);
  if (doc.versions[version]) {
    console.log(`${entry.name} ${version}: already published`);
    return false;
  }

  const source = entry.tarball.replaceAll("{name}", entry.name).replaceAll("{version}", version);
  const response = await fetch(source);
  if (!response.ok) {
    console.log(`${entry.name} ${version}: not available yet (${response.status} from ${source})`);
    return false;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const fileName = `${entry.name}-${version}.tgz`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "useful-packages-"));
  const tempFile = path.join(tempDir, fileName);
  fs.writeFileSync(tempFile, bytes);

  const manifest = JSON.parse(
    execFileSync("tar", ["-xzOf", fileName, "package/package.json"], { cwd: tempDir, encoding: "utf8" })
  );
  if (manifest.name !== entry.name || manifest.version !== version) {
    throw new Error(`${source} holds ${manifest.name} ${manifest.version}`);
  }

  const tag = `${entry.name}-${version}`;
  if (hasRelease(tag)) {
    gh("release", "upload", tag, tempFile, "--clobber", "--repo", config.repo);
  } else {
    gh("release", "create", tag, tempFile, "--repo", config.repo, "--latest=false",
      "--title", `${manifest.displayName} ${version}`, "--notes", `The vendor's original file, unchanged: ${source}`);
  }
  fs.rmSync(tempDir, { recursive: true, force: true });

  doc.versions[version] = {
    ...manifest,
    _id: `${entry.name}@${version}`,
    dist: {
      tarball: `https://github.com/${config.repo}/releases/download/${tag}/${fileName}`,
      shasum: hash("sha1", bytes, "hex"),
      integrity: `sha512-${hash("sha512", bytes, "base64")}`,
    },
  };
  doc.description = manifest.description;
  doc["dist-tags"].latest = newest(Object.keys(doc.versions));
  doc.time[version] = new Date().toISOString();
  doc.time.modified = doc.time[version];
  write(entry.name, doc);
  console.log(`${entry.name} ${version}: published`);
  return true;
}

// A Git URL needs the package's files in Git. Each version gets its own tag, and that tag's commit holds only
// that package with no parent, so a shallow clone of the tag downloads just that package.
async function ensureGitTag(name, version, tarball) {
  const tag = `upm/${name}/${version}`;
  const run = (cwd, env, ...args) =>
    execFileSync("git", ["-c", "core.autocrlf=false", "-c", "core.longpaths=true", "-c", "user.name=github-actions[bot]",
      "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", ...args],
      { cwd, env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

  if (run(__dirname, {}, "ls-remote", "--tags", "origin", `refs/tags/${tag}`)) return;

  const response = await fetch(tarball);
  if (!response.ok) throw new Error(`${response.status} from ${tarball}`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "useful-packages-"));
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
  run(__dirname, {}, "push", "origin", `${commit}:refs/tags/${tag}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`${name} ${version}: Git tag ${tag}`);
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

async function main() {
  const [onlyName, onlyVersion] = process.argv.slice(2);
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, ".nojekyll"), "");

  for (const entry of config.packages) {
    if (onlyName && entry.name !== onlyName) continue;
    const version = onlyVersion ?? gh("api", `repos/${entry.latestFrom}/releases/latest`, "--jq", ".tag_name").replace(/^v/, "");
    await publish(entry, version);
  }
  writeListings();

  // A refused Git tag (GitHub takes no file over 100 MiB) must not stop the registry, which has no such limit.
  for (const { name } of config.packages) {
    for (const [version, { dist }] of Object.entries(readDoc(name).versions)) {
      try {
        await ensureGitTag(name, version, dist.tarball);
      } catch (error) {
        console.log(`::warning::${name} ${version} has no Git tag: ${error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
