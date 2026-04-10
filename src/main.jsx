import React from "react";
import ReactDOM from "react-dom/client";
import AppWrapper from "./App.jsx";
import { AppProvider } from "./AppContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AppProvider>
    <AppWrapper />
  </AppProvider>
);
