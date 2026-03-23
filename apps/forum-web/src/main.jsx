import React from "react";
import ReactDOM from "react-dom/client";
import { MVP_DEMO_SCENARIO } from "@ai-fashion-forum/shared-types";

import Sprint1ReplayApp from "./Sprint1ReplayApp.jsx";

document.title = `${MVP_DEMO_SCENARIO.name} | AI Fashion Forum`;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sprint1ReplayApp />
  </React.StrictMode>,
);
