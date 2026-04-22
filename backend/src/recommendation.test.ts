/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";

import { recommendUnlocks } from "./recommendation.js";
import type { UnlockDataset } from "@survivors-helper/shared";

const dataset: UnlockDataset = {
  meta: {
    datasetVersion: "0.1.0",
    gamePatch: "1.0",
    lastUpdatedAt: "2026-04-22",
    source: "vampire.survivors.wiki"
  },
  unlocks: [
    {
      id: "u1",
      name: "Wings",
      description: "Reach level 5",
      unlockCategory: "standard",
      sourceGroup: "base",
      rewardType: "feature",
      rewardTargets: ["Wings"],
      rewardValues: [{ rewardType: "feature", utilityTags: ["progression"], baseUtility: 70 }],
      prerequisites: [],
      isSpoiler: false,
      notes: [],
      wikiRef: "https://vampire.survivors.wiki/w/Achievements",
      sortOrder: 1
    },
    {
      id: "u2",
      name: "Secret One",
      description: "Secret",
      unlockCategory: "secret",
      sourceGroup: "base",
      rewardType: "character",
      rewardTargets: ["Secret Character"],
      rewardValues: [{ rewardType: "character", utilityTags: ["power"], baseUtility: 80 }],
      prerequisites: [
        {
          id: "p1",
          type: "enemy_kills",
          subject: "Skeleton",
          operator: "gte",
          value: 3000,
          scope: "lifetime",
          sourceUnlockId: "u2"
        }
      ],
      isSpoiler: true,
      notes: [],
      wikiRef: "https://vampire.survivors.wiki/w/Secrets",
      sortOrder: 2
    }
  ],
  dependencyLinks: [{ fromUnlockId: "u1", toUnlockId: "u2", relation: "enables", strength: "hard" }]
};

test("recommendations are deterministic", () => {
  const input = {
    completedUnlockIds: [],
    ownedSourceGroups: ["base"],
    includeSecrets: true,
    utilityPreference: { progression: 1.2 }
  };

  const a = recommendUnlocks(dataset, input);
  const b = recommendUnlocks(dataset, input);

  assert.deepEqual(a, b);
});

test("secret toggle excludes secret unlocks", () => {
  const results = recommendUnlocks(dataset, {
    completedUnlockIds: [],
    ownedSourceGroups: ["base"],
    includeSecrets: false,
    utilityPreference: {}
  });

  assert.equal(results.some((r) => r.unlockId === "u2"), false);
});
