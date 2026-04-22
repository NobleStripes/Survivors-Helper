import React, { useEffect, useMemo, useState } from "react";

type Recommendation = {
  unlockId: string;
  finalScore: number;
  scores: {
    effort: number;
    depth: number;
    utility: number;
    chain: number;
    dlcAvailability: number;
    secretComplexity: number;
  };
  why: string[];
};

type RecommendationResponse = {
  params: Record<string, unknown>;
  totalCandidates: number;
  recommendations: Recommendation[];
};

const dlcGroups = [
  "moonspell",
  "foscari",
  "emergency_meeting",
  "operation_guns",
  "ode_to_castlevania",
  "emerald_diorama",
  "ante_chamber",
  "extra"
];

export const STORAGE_KEY = "survivors-helper:filters:v1";

type PersistedFilters = {
  completedUnlockIds: string;
  ownedGroups: string[];
  includeSecrets: boolean;
  limit: number;
  weights: {
    effort: number;
    depth: number;
    utility: number;
    chain: number;
    dlcAvailability: number;
    secretComplexity: number;
  };
};

const defaultFilters: PersistedFilters = {
  completedUnlockIds: "",
  ownedGroups: [],
  includeSecrets: true,
  limit: 25,
  weights: {
    effort: 0.22,
    depth: 0.16,
    utility: 0.24,
    chain: 0.2,
    dlcAvailability: 0.1,
    secretComplexity: 0.08
  }
};

function readPersistedFilters(): PersistedFilters {
  if (typeof globalThis.localStorage === "undefined") {
    return defaultFilters;
  }

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;

    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    const parsedWeights: Partial<PersistedFilters["weights"]> = parsed.weights ?? {};
    const ownedGroups = Array.isArray(parsed.ownedGroups)
      ? parsed.ownedGroups.filter((group): group is string => dlcGroups.includes(group))
      : [];

    const limitValue = typeof parsed.limit === "number" ? parsed.limit : defaultFilters.limit;

    return {
      completedUnlockIds:
        typeof parsed.completedUnlockIds === "string" ? parsed.completedUnlockIds : defaultFilters.completedUnlockIds,
      ownedGroups,
      includeSecrets: typeof parsed.includeSecrets === "boolean" ? parsed.includeSecrets : defaultFilters.includeSecrets,
      limit: Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : defaultFilters.limit,
      weights: {
        effort: typeof parsedWeights.effort === "number" ? parsedWeights.effort : defaultFilters.weights.effort,
        depth: typeof parsedWeights.depth === "number" ? parsedWeights.depth : defaultFilters.weights.depth,
        utility: typeof parsedWeights.utility === "number" ? parsedWeights.utility : defaultFilters.weights.utility,
        chain: typeof parsedWeights.chain === "number" ? parsedWeights.chain : defaultFilters.weights.chain,
        dlcAvailability:
          typeof parsedWeights.dlcAvailability === "number"
            ? parsedWeights.dlcAvailability
            : defaultFilters.weights.dlcAvailability,
        secretComplexity:
          typeof parsedWeights.secretComplexity === "number"
            ? parsedWeights.secretComplexity
            : defaultFilters.weights.secretComplexity
      }
    };
  } catch {
    return defaultFilters;
  }
}

export function App(): JSX.Element {
  const persisted = useMemo(() => readPersistedFilters(), []);

  const [completedUnlockIds, setCompletedUnlockIds] = useState(persisted.completedUnlockIds);
  const [ownedGroups, setOwnedGroups] = useState<string[]>(persisted.ownedGroups);
  const [includeSecrets, setIncludeSecrets] = useState(persisted.includeSecrets);
  const [limit, setLimit] = useState(persisted.limit);

  const [weightEffort, setWeightEffort] = useState(persisted.weights.effort);
  const [weightDepth, setWeightDepth] = useState(persisted.weights.depth);
  const [weightUtility, setWeightUtility] = useState(persisted.weights.utility);
  const [weightChain, setWeightChain] = useState(persisted.weights.chain);
  const [weightDlcAvailability, setWeightDlcAvailability] = useState(persisted.weights.dlcAvailability);
  const [weightSecretComplexity, setWeightSecretComplexity] = useState(persisted.weights.secretComplexity);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<RecommendationResponse | null>(null);

  const queryPreview = useMemo(() => {
    const query = new URLSearchParams();
    if (completedUnlockIds.trim()) query.set("completedUnlockIds", completedUnlockIds.trim());
    if (ownedGroups.length > 0) query.set("ownedSourceGroups", ownedGroups.join(","));
    query.set("includeSecrets", String(includeSecrets));
    query.set("limit", String(limit));
    query.set("weightEffort", String(weightEffort));
    query.set("weightDepth", String(weightDepth));
    query.set("weightUtility", String(weightUtility));
    query.set("weightChain", String(weightChain));
    query.set("weightDlcAvailability", String(weightDlcAvailability));
    query.set("weightSecretComplexity", String(weightSecretComplexity));
    return query.toString();
  }, [
    completedUnlockIds,
    includeSecrets,
    limit,
    ownedGroups,
    weightChain,
    weightDepth,
    weightDlcAvailability,
    weightEffort,
    weightSecretComplexity,
    weightUtility
  ]);

  function toggleGroup(group: string): void {
    setOwnedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  useEffect(() => {
    if (typeof globalThis.localStorage === "undefined") {
      return;
    }

    const payload: PersistedFilters = {
      completedUnlockIds,
      ownedGroups,
      includeSecrets,
      limit: Math.min(Math.max(limit, 1), 100),
      weights: {
        effort: weightEffort,
        depth: weightDepth,
        utility: weightUtility,
        chain: weightChain,
        dlcAvailability: weightDlcAvailability,
        secretComplexity: weightSecretComplexity
      }
    };

    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    completedUnlockIds,
    ownedGroups,
    includeSecrets,
    limit,
    weightEffort,
    weightDepth,
    weightUtility,
    weightChain,
    weightDlcAvailability,
    weightSecretComplexity
  ]);

  async function runRecommendations(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const result = await fetch(`/api/recommendations?${queryPreview}`);
      if (!result.ok) {
        throw new Error(`Request failed with status ${result.status}`);
      }
      const payload = (await result.json()) as RecommendationResponse;
      setResponse(payload);
    } catch (err) {
      setResponse(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Survivors Helper</h1>
      <p>Path helper controls wired to dynamic backend recommendation query parameters.</p>

      <section>
        <h2>Inputs</h2>
        <label>
          Completed unlock IDs (comma-separated):
          <input
            value={completedUnlockIds}
            onChange={(event) => setCompletedUnlockIds(event.target.value)}
            placeholder="base-wings,secret-marrabbio"
          />
        </label>
        <label>
          Include secrets:
          <input
            type="checkbox"
            checked={includeSecrets}
            onChange={(event) => setIncludeSecrets(event.target.checked)}
          />
        </label>
        <label>
          Limit:
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(event) => {
              const nextLimit = Number(event.target.value);
              if (!Number.isFinite(nextLimit)) return;
              setLimit(Math.min(Math.max(nextLimit, 1), 100));
            }}
          />
        </label>
      </section>

      <section>
        <h2>Owned DLC Groups</h2>
        {dlcGroups.map((group) => (
          <label key={group} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={ownedGroups.includes(group)}
              onChange={() => toggleGroup(group)}
            />
            {group}
          </label>
        ))}
      </section>

      <section>
        <h2>Weight Overrides</h2>
        <label>
          Effort
          <input type="number" step="0.01" value={weightEffort} onChange={(e) => setWeightEffort(Number(e.target.value))} />
        </label>
        <label>
          Depth
          <input type="number" step="0.01" value={weightDepth} onChange={(e) => setWeightDepth(Number(e.target.value))} />
        </label>
        <label>
          Utility
          <input type="number" step="0.01" value={weightUtility} onChange={(e) => setWeightUtility(Number(e.target.value))} />
        </label>
        <label>
          Chain
          <input type="number" step="0.01" value={weightChain} onChange={(e) => setWeightChain(Number(e.target.value))} />
        </label>
        <label>
          DLC Availability
          <input
            type="number"
            step="0.01"
            value={weightDlcAvailability}
            onChange={(e) => setWeightDlcAvailability(Number(e.target.value))}
          />
        </label>
        <label>
          Secret Complexity
          <input
            type="number"
            step="0.01"
            value={weightSecretComplexity}
            onChange={(e) => setWeightSecretComplexity(Number(e.target.value))}
          />
        </label>
      </section>

      <section>
        <h2>Request</h2>
        <code>/api/recommendations?{queryPreview}</code>
        <div>
          <button onClick={() => void runRecommendations()} disabled={loading}>
            {loading ? "Loading..." : "Get Recommendations"}
          </button>
        </div>
        {error && <p role="alert">Error: {error}</p>}
      </section>

      <section>
        <h2>Results</h2>
        {response ? (
          <>
            <p>Total candidates: {response.totalCandidates}</p>
            <ul>
              {response.recommendations.map((item) => (
                <li key={item.unlockId}>
                  <strong>{item.unlockId}</strong> - score {item.finalScore} - why: {item.why.join(", ") || "n/a"}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No recommendations loaded yet.</p>
        )}
      </section>
    </main>
  );
}
