/// <reference types="vitest" />
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App, STORAGE_KEY } from "../src/App.js";

afterEach(() => {
  cleanup();
  globalThis.localStorage.clear();
});

describe("App localStorage persistence", () => {
  it("hydrates filter settings from localStorage", () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedUnlockIds: "base-wings,base-dairy-plant",
        ownedGroups: ["moonspell", "foscari"],
        includeSecrets: false,
        limit: 12,
        weights: {
          effort: 0.31,
          depth: 0.12,
          utility: 0.27,
          chain: 0.19,
          dlcAvailability: 0.07,
          secretComplexity: 0.04
        }
      })
    );

    render(<App />);

    const completedInput = screen.getByLabelText(/Completed unlock IDs/i) as HTMLInputElement;
    const includeSecretsInput = screen.getByLabelText(/Include secrets/i) as HTMLInputElement;
    const limitInput = screen.getByLabelText(/Limit/i) as HTMLInputElement;
    const moonspellInput = screen.getByLabelText("moonspell") as HTMLInputElement;
    const foscariInput = screen.getByLabelText("foscari") as HTMLInputElement;
    const effortInput = screen.getByLabelText(/Effort/i) as HTMLInputElement;

    expect(completedInput.value).toBe("base-wings,base-dairy-plant");
    expect(includeSecretsInput.checked).toBe(false);
    expect(limitInput.value).toBe("12");
    expect(moonspellInput.checked).toBe(true);
    expect(foscariInput.checked).toBe(true);
    expect(effortInput.value).toBe("0.31");
  });

  it("persists updated filter settings to localStorage", async () => {
    render(<App />);

    const completedInput = screen.getByLabelText(/Completed unlock IDs/i) as HTMLInputElement;
    const includeSecretsInput = screen.getByLabelText(/Include secrets/i) as HTMLInputElement;
    const limitInput = screen.getByLabelText(/Limit/i) as HTMLInputElement;
    const moonspellInput = screen.getByLabelText("moonspell") as HTMLInputElement;
    const utilityInput = screen.getByLabelText(/Utility/i) as HTMLInputElement;

    fireEvent.change(completedInput, { target: { value: "base-wings" } });
    fireEvent.click(includeSecretsInput);
    fireEvent.change(limitInput, { target: { value: "5" } });
    fireEvent.click(moonspellInput);
    fireEvent.change(utilityInput, { target: { value: "0.4" } });

    await waitFor(() => {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw ?? "{}");
      expect(parsed.completedUnlockIds).toBe("base-wings");
      expect(parsed.includeSecrets).toBe(false);
      expect(parsed.limit).toBe(5);
      expect(parsed.ownedGroups).toContain("moonspell");
      expect(parsed.weights.utility).toBe(0.4);
    });
  });
});
