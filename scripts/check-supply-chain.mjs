// Fails if the supply-chain settings in pnpm-workspace.yaml or .npmrc are
// removed or relaxed. Run by the agent Stop hook and CI.
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const workspace = readFileSync(new URL("pnpm-workspace.yaml", root), "utf8");
const npmrc = readFileSync(new URL(".npmrc", root), "utf8");
const setting = (text, key, separator) => text.match(new RegExp(`^${key}\\s*${separator}\\s*(\\S+)`, "m"))?.[1];

const required = [
  ["pnpm-workspace.yaml", "strictPeerDependencies", value => value === "true"],
  ["pnpm-workspace.yaml", "saveExact", value => value === "true"],
  ["pnpm-workspace.yaml", "preferFrozenLockfile", value => value === "true"],
  ["pnpm-workspace.yaml", "ignoreScripts", value => value === "true"],
  ["pnpm-workspace.yaml", "verifyStoreIntegrity", value => value === "true"],
  ["pnpm-workspace.yaml", "minimumReleaseAge", value => Number(value) >= 10080],
  ["pnpm-workspace.yaml", "trustPolicy", value => value === "no-downgrade"],
  [".npmrc", "registry", value => value === "https://registry.npmjs.org/"],
  [".npmrc", "strict-ssl", value => value === "true"],
  [".npmrc", "min-release-age", value => Number(value) >= 7],
  [".npmrc", "ignore-scripts", value => value === "true"],
];

const problems = required.flatMap(([file, key, ok]) => {
  const value = file === ".npmrc" ? setting(npmrc, key, "=") : setting(workspace, key, ":");
  return ok(value) ? [] : [`${file}: ${key} is ${value ?? "missing"}; it must not be relaxed`];
});

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
