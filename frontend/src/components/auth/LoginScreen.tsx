import React, { useState } from "react";
import { Mail, ShieldCheck, Zap, ArrowRight, User } from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

interface GoogleJwtPayload {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [name, setName] = useState("Vibhor Kumar");
  const [email, setEmail] = useState("kumarvibhor23@gmail.com");
  const [error, setError] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
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
    setError("Google Sign-In was closed or cancelled. You can also sign in directly below.");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    login(name.trim(), email.trim());
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
          
          {/* Real Google OAuth Login if client ID is configured */}
          {googleClientId && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                Sign in with Google
              </label>
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-xs uppercase font-medium">Or</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          {/* Quick Sign-In Options */}
          {!showCustomForm ? (
            <div className="space-y-3">
              <Button
                type="button"
                variant="primary"
                className="w-full justify-center shadow-lg shadow-indigo-600/20"
                onClick={() => login(name, email)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign in as {name}
              </Button>

              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                Sign in with different name / email
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleCustomSubmit}>
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vibhor Kumar"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Sender Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@reachinbox.test"
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Will be used as your default 'from' address."
                required
              />

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-1/3 justify-center"
                  onClick={() => setShowCustomForm(false)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-2/3 justify-center"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue
                </Button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Google OAuth Ready
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
