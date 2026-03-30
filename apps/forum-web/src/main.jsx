import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import ForumApp, { queryClient } from "./ForumApp.jsx";

document.title = "AI Fashion Forum";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ForumApp />
    </QueryClientProvider>
  </React.StrictMode>,
);
