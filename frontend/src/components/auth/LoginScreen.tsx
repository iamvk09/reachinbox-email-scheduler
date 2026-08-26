import React, { useState } from "react";
import { Mail, ShieldCheck, Zap } from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../context/AuthContext";

interface GoogleJwtPayload {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      login(decoded.name, decoded.email, decoded.picture);
    } catch (err: any) {
      console.error("Google login decode error:", err);
      setError("Unable to read the Google account profile. Please try again.");
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed or was closed. Please try again.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Mail className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">
          ReachInbox Email Scheduler
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          High-throughput email queuing powered by BullMQ & Redis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 backdrop-blur-xl sm:px-10 space-y-6">
          {/* Google Identity Services OAuth login */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
              Sign in with Google OAuth
            </label>
            {googleClientId ? (
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signin_with"
                  width="340"
                />
              </div>
            ) : (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-300">
                Google sign-in is not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> in
                <code>frontend/.env</code> and restart the frontend.
              </p>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Google OAuth Enabled
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              BullMQ Engine Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
