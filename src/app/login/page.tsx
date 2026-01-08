"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username || !password) {
      setLocalError("Please enter both username and password");
      return;
    }

    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              RoyalPalm Agro
            </h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {(error || localError) && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error || localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border placeholder:text-gray-800 placeholder-shown:text-gray-800 text-gray-800 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border placeholder:text-gray-800 border-gray-300 text-gray-800 placeholder-shown:text-gray-800 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700  disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Test credentials:</p>
            <p className="mt-2 space-y-1">
              <span className="block">Admin: admin@royalpalm.com</span>
              <span className="block">Supervisor: supervisor@royalpalm.com</span>
              <span className="block">Worker: worker@royalpalm.com</span>
              <span className="block font-semibold">Password: password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
