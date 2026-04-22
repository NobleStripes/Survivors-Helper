/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";

import { server } from "./index.js";

test("GET /api/meta returns dataset metadata", async (t) => {
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/api/meta`);
  assert.equal(response.status, 200);

  const body = (await response.json()) as { datasetVersion: string; source: string };
  assert.equal(typeof body.datasetVersion, "string");
  assert.equal(body.source, "vampire.survivors.wiki");
});

test("GET /api/recommendations parses query params and respects limit", async (t) => {
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }

  const url = new URL(`http://127.0.0.1:${address.port}/api/recommendations`);
  url.searchParams.set("completedUnlockIds", "base-wings,base-wings");
  url.searchParams.set("ownedSourceGroups", "moonspell,not_a_real_group");
  url.searchParams.set("includeSecrets", "false");
  url.searchParams.set("limit", "1");
  url.searchParams.set("weightUtility", "0.4");
  url.searchParams.set("utility_progression", "1.5");

  const response = await fetch(url);
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    params: {
      completedUnlockIds: string[];
      ownedSourceGroups: string[];
      includeSecrets: boolean;
      limit: number;
      weights: { utility?: number };
      utilityPreference: { progression?: number };
    };
    totalCandidates: number;
    recommendations: Array<{ unlockId: string }>;
  };

  assert.deepEqual(body.params.completedUnlockIds, ["base-wings"]);
  assert.deepEqual(body.params.ownedSourceGroups, ["base", "moonspell"]);
  assert.equal(body.params.includeSecrets, false);
  assert.equal(body.params.limit, 1);
  assert.equal(body.params.weights.utility, 0.4);
  assert.equal(body.params.utilityPreference.progression, 1.5);
  assert.equal(body.recommendations.length <= 1, true);

  for (const recommendation of body.recommendations) {
    assert.notEqual(recommendation.unlockId, "secret-marrabbio");
  }
  assert.equal(body.totalCandidates >= body.recommendations.length, true);
});

test("GET /api/recommendations handles malformed booleans with fallback", async (t) => {
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }

  const url = new URL(`http://127.0.0.1:${address.port}/api/recommendations`);
  url.searchParams.set("includeSecrets", "not-bool");

  const response = await fetch(url);
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    params: { includeSecrets: boolean };
  };

  assert.equal(body.params.includeSecrets, true);
});

test("GET /api/recommendations ignores invalid numeric weights", async (t) => {
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }

  const url = new URL(`http://127.0.0.1:${address.port}/api/recommendations`);
  url.searchParams.set("weightUtility", "abc");
  url.searchParams.set("utility_power", "NaN");

  const response = await fetch(url);
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    params: {
      weights: { utility?: number };
      utilityPreference: { power?: number };
    };
  };

  assert.equal(body.params.weights.utility, undefined);
  assert.equal(body.params.utilityPreference.power, undefined);
});

test("GET /api/recommendations clamps limit overflow to max", async (t) => {
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address unavailable");
  }

  const url = new URL(`http://127.0.0.1:${address.port}/api/recommendations`);
  url.searchParams.set("limit", "9999");

  const response = await fetch(url);
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    params: { limit: number };
    recommendations: unknown[];
  };

  assert.equal(body.params.limit, 100);
  assert.equal(body.recommendations.length <= 100, true);
});
