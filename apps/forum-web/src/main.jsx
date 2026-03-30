import React from "react";
import ReactDOM from "react-dom/client";
import FashionThreadPage from "../FashionThreadPage.jsx";

document.title = "AI Fashion Forum";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FashionThreadPage />
  </React.StrictMode>,
);
