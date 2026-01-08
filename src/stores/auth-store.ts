import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "@/lib/api/axios";
import { syncPalmsToCache } from "@/lib/offline/palms";

export interface User {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  username: string;
  role: "ADMIN" | "SUPERVISOR" | "WORKER";
  phone?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,

      setHasHydrated: () => set({ hasHydrated: true }),

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axiosInstance.post("/api/auth/login", {
            username,
            password,
          });

          const { user, accessToken } = response.data;

          // Store token in localStorage for axios interceptor
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", accessToken);
          }

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Trigger palm sync in background after successful login
          if (typeof window !== "undefined" && navigator.onLine) {
            syncPalmsToCache().catch((err) => {
              console.error("Background palm sync failed:", err);
              // Don't block login if sync fails
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            (error as { response?: { data?: { error?: string } } })?.response
              ?.data?.error || "Login failed. Please try again.";
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        try {
          await axiosInstance.post("/api/auth/logout");
        } catch {
          // Ignore logout errors
        } finally {
          // Clear token from localStorage
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
          }

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await axiosInstance.post("/api/auth/refresh");
          const { accessToken } = response.data;

          // Update token in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", accessToken);
          }

          set({ accessToken });
        } catch {
          // Refresh failed, logout user
          get().logout();
        }
      },

      checkAuth: async () => {
        // No API call - just use persisted state
        // Axios interceptor handles 401s during actual API calls
        const { accessToken, user } = get();
        if (!accessToken || !user) {
          set({ isAuthenticated: false, user: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated after rehydration completes
        if (state) {
          state.setHasHydrated();
        }
      },
    }
  )
);
