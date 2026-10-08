import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ProfileProvider } from "./content/ProfileContext";
import "./styles/global.css";

// The admin page is a separate bundle, only downloaded when someone opens /admin.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const isAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <ProfileProvider>
        <App />
      </ProfileProvider>
    )}
  </StrictMode>,
);
