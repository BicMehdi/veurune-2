import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const narrationPath = new URL("./NARRATION_DARK_FANTASY.md", import.meta.url);
const projectSourcePath = new URL("../SYSTEM/CHATGPT_PROJECT_SOURCE.md", import.meta.url);
const workerIndexPath = new URL("../worker/src/index.ts", import.meta.url);

test("les règles Dark Fantasy permanentes conservent les invariants du jeu", async () => {
  const text = await readFile(narrationPath, "utf8");

  for (const required of [
    "dark_fantasy_brutal_equilibre",
    "activation : permanente",
    "huit à douze paragraphes développés",
    "Le joueur autorise le MJ à faire parler et réagir Mehdi dans les échanges ordinaires",
    "Rendre immédiatement la main avant un engagement durable",
    "l'autorité finale du joueur sur Mehdi",
    "FER_NOIR_STRICT",
    "OOC: PAUSE",
    "limites de sécurité obligatoires de ChatGPT",
    "La violence sexuelle n'est jamais détaillée ni érotisée.",
    "Le tour a-t-il été sauvegardé avec succès",
  ]) {
    assert.ok(text.includes(required), `règle obligatoire absente: ${required}`);
  }
});

test("le bootstrap ChatGPT désigne GitHub main et load_game comme autorité", async () => {
  const text = await readFile(projectSourcePath, "utf8");

  assert.match(text, /branche `main`/);
  assert.match(text, /appeler `load_game`/);
  assert.match(text, /appliquer `persistence` et `narration_rules`/);
  assert.match(text, /appeler exactement une fois `save_turn`/);
  assert.match(text, /ne jamais restaurer automatiquement `VEY_SAVE_V1`/);
});

test("le document narratif est exposé par search et fetch", async () => {
  const text = await readFile(workerIndexPath, "utf8");

  assert.match(text, /narration: \{ title: "Règles permanentes de narration Dark Fantasy"/);
  assert.match(text, /path: "rules\/NARRATION_DARK_FANTASY.md"/);
});
