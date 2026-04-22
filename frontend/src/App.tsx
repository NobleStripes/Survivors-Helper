import React, { useMemo, useState } from "react";

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

export function App(): JSX.Element {
  const [completedUnlockIds, setCompletedUnlockIds] = useState("");
  const [ownedGroups, setOwnedGroups] = useState<string[]>([]);
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [limit, setLimit] = useState(25);

  const [weightEffort, setWeightEffort] = useState(0.22);
  const [weightDepth, setWeightDepth] = useState(0.16);
  const [weightUtility, setWeightUtility] = useState(0.24);
  const [weightChain, setWeightChain] = useState(0.20);
  const [weightDlcAvailability, setWeightDlcAvailability] = useState(0.10);
  const [weightSecretComplexity, setWeightSecretComplexity] = useState(0.08);

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
            onChange={(event) => setLimit(Number(event.target.value))}
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
