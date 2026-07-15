import React from "react";
import ReactDOM from "react-dom/client";
import AppWrapper from "./App.jsx";
import { AppProvider } from "./AppContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AppProvider>
      <AppWrapper />
    </AppProvider>
  </ErrorBoundary>,
);
