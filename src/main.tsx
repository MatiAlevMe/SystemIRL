import React from "react";
import ReactDOM from "react-dom/client";
import { PortalProvider } from "@portalsdk/react";
import App from "./App";
import { portalClient } from "./portal";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {portalClient ? (
      <PortalProvider client={portalClient}>
        <App />
      </PortalProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
