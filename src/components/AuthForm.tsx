"use client";

import React, { useState } from "react";
import { signIn, signUp } from "@/services/auth/auth-client";


export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (isSignUp) {
      const res = await signUp.email({
        email,
        password,
        name: name || "User",
      });
      if (res.error) {
        setErrorMsg(res.error.message || "Sign up failed");
      } else {
        window.location.reload();
      }
    } else {
      const res = await signIn.email({
        email,
        password,
      });
      if (res.error) {
        setErrorMsg(res.error.message || "Sign in failed");
      } else {
        window.location.reload();
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full mx-auto space-y-6 shadow-2xl">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-100">
          {isSignUp ? "Create JobPilot Account" : "Sign In to JobPilot"}
        </h2>
        <p className="text-sm text-slate-400">Personal job search automation pipeline</p>
      </div>

      {errorMsg && (
        <div id="auth-error-msg" role="alert" aria-live="polite" className="p-3 bg-rose-950 text-rose-300 border border-rose-800 text-xs rounded-lg font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="auth-name-input" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Name
            </label>
            <input
              id="auth-name-input"
              type="text"
              required
              aria-required="true"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email-input" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
            Email
          </label>
          <input
            id="auth-email-input"
            type="email"
            required
            aria-required="true"
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={errorMsg ? "auth-error-msg" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="auth-password-input" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
            Password
          </label>
          <input
            id="auth-password-input"
            type="password"
            required
            aria-required="true"
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={errorMsg ? "auth-error-msg" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {isLoading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
