import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 30000, // 30 seconds for sync operations
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth tokens, set default headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Handle 401 - Unauthorized (simple: just logout and redirect)
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Simple: 401 means not authenticated, redirect to login
      localStorage.removeItem("auth_token");
      const { useAuthStore } = await import("@/stores/auth-store");
      useAuthStore.getState().logout();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Transform error to user-friendly message
    const errorMessage = error.response?.data
      ? (error.response.data as { message?: string }).message ||
        "An error occurred"
      : error.message || "Network error";

    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  }
);

// Retry wrapper with exponential backoff
export const axiosWithRetry = async <T>(
  request: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (
        axios.isAxiosError(error) &&
        error.response?.status &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export default axiosInstance;
