"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "ADMIN" | "SUPERVISOR" | "WORKER";
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();

  useEffect(() => {
    // Simple: after hydration, if not authenticated, redirect
    if (hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Check role if required
  if (
    requiredRole &&
    user &&
    user.role !== requiredRole &&
    user.role !== "ADMIN"
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading only while hydrating
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // After hydration, if authenticated, show content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Redirecting to login...
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Redirecting...</div>
    </div>
  );
}
