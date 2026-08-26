import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const application = (
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>
  ) : (
    application
  )
);
