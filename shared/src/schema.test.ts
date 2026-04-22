/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { validateUnlockDataset } from "./schema.js";

test("seed dataset is valid", () => {
  const path = resolve(process.cwd(), "../data/unlocks/unlocks.seed.json");
  const raw = readFileSync(path, "utf8");
  const dataset = JSON.parse(raw) as unknown;
  const result = validateUnlockDataset(dataset);

  assert.equal(result.valid, true, result.errors.join("; "));
});
