import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const base = process.argv[2];
if (!base) {
  console.error("Usage: node rules/check-append-only.mjs <base-git-ref>");
  process.exit(2);
}

const files = fs.existsSync("events")
  ? fs.readdirSync("events").filter((name) => name.endsWith(".jsonl")).map((name) => path.posix.join("events", name))
  : [];

for (const file of files) {
  let previous;
  try {
    previous = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    continue;
  }
  const current = fs.readFileSync(file, "utf8");
  if (!current.startsWith(previous)) {
    console.error(`${file}: une ligne existante a été modifiée ou supprimée; le journal est append-only.`);
    process.exit(1);
  }
}

console.log(`Validation append-only réussie par rapport à ${base}.`);
