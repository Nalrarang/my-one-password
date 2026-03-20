import { useState } from "react";
import { signIn, signUp } from "../services/auth";

type AuthMode = "signin" | "signup";

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && masterPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (masterPassword.length < 8) {
      setError("Master password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, masterPassword);
      } else {
        await signIn(email, masterPassword);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
    setConfirmPassword("");
  }

  const isSignUp = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            my-one-password
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp
              ? "Create an account to secure your vault."
              : "Enter your credentials to unlock your vault."}
          </p>
        </div>

        {/* Mode tabs */}
        <div
          className="flex rounded-lg border border-slate-700 bg-slate-800"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !isSignUp
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => {
              setMode("signin");
              setError(null);
              setConfirmPassword("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isSignUp
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="master-password"
                className="block text-sm font-medium text-slate-300"
              >
                Master Password
              </label>
              <input
                id="master-password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Enter your master password"
              />
            </div>

            {isSignUp && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Confirm Master Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Confirm your master password"
                />
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isSignUp ? "Creating account..." : "Deriving keys..."}
              </>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Unlock"
            )}
          </button>

          <p className="text-center text-sm text-slate-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
