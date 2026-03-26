import React from "react";
import ReactDOM from "react-dom/client";
import ForumApp from "./ForumApp.jsx";

document.title = "AI Fashion Forum";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ForumApp />
  </React.StrictMode>,
);
