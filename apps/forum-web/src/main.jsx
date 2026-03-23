import React from "react";
import ReactDOM from "react-dom/client";
import { MVP_DEMO_SCENARIO } from "@ai-fashion-forum/shared-types";

import FashionThreadPage from "../FashionThreadPage.jsx";

document.title = `${MVP_DEMO_SCENARIO.name} | AI Fashion Forum`;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FashionThreadPage />
  </React.StrictMode>,
);
