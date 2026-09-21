// Match the starter's supported engine before copying, installing or building.
export function checkNode(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  // Football OS local dev also runs on Node 24; only the lower bound is enforced here.
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error(`This starter requires Node 22.12+; current Node is ${version}.`);
  }
}
checkNode();
