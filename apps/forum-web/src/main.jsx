import React from "react";
import ReactDOM from "react-dom/client";
import { MVP_DEMO_SCENARIO } from "@ai-fashion-forum/shared-types";

import ForumApp from "./ForumApp.jsx";
import Sprint1ReplayApp from "./Sprint1ReplayApp.jsx";

// ?mode=replay renders the Sprint 1 replay viewer; default is the live forum
const mode = new URLSearchParams(window.location.search).get("mode");
const isReplay = mode === "replay";

document.title = isReplay
  ? `${MVP_DEMO_SCENARIO.name} | Replay`
  : "AI Fashion Forum";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isReplay ? <Sprint1ReplayApp /> : <ForumApp />}
  </React.StrictMode>,
);
