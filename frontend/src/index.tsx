import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";

const rootNode = globalThis.document?.getElementById("root");
if (rootNode) {
  createRoot(rootNode).render(<App />);
}
