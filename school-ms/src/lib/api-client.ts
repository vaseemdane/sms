/**
 * Production-ready centralized API client for EduPulse SMS frontend.
 * Handles base URL, auth token header, token refresh on 401, and request correlation.
 */

const API_BASE_URL = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");
const STORAGE_KEY = "edupulse_sms_session_v1";

export interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code: string = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { params, headers = {}, ...customConfig } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Retrieve stored token
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const rawSession = localStorage.getItem(STORAGE_KEY);
      if (rawSession) {
        const session = JSON.parse(rawSession);
        token = session.token || null;
      }
    } catch {
      // Fallback
    }
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
  };

  let response = await fetch(url, config);

  // Handle 401 Unauthorized -> Attempt token refresh
  if (response.status === 401 && typeof window !== "undefined" && !endpoint.includes("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const rawSession = localStorage.getItem(STORAGE_KEY);
        const session = rawSession ? JSON.parse(rawSession) : null;
        const refreshToken = session?.refreshToken;

        if (refreshToken) {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.data.token;
            const newRefreshToken = refreshData.data.refreshToken;

            // Update session
            session.token = newToken;
            session.refreshToken = newRefreshToken;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            document.cookie = `edupulse_auth_token=${newToken}; path=/; max-age=2592000; SameSite=Lax`;

            onRefreshed(newToken);
            isRefreshing = false;

            // Retry original request
            reqHeaders["Authorization"] = `Bearer ${newToken}`;
            return (await fetch(url, { ...config, headers: reqHeaders })).json();
          }
        }

        localStorage.removeItem(STORAGE_KEY);
        document.cookie = "edupulse_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        document.cookie = "edupulse_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for refresh to complete then retry
      return new Promise<T>((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          reqHeaders["Authorization"] = `Bearer ${newToken}`;
          const retryRes = await fetch(url, { ...config, headers: reqHeaders });
          resolve(await retryRes.json());
        });
      });
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.detail || `HTTP ${response.status} Request Failed`;
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details);
  }

  return data as T;
}

apiClient.get = function <T = unknown>(endpoint: string, options: ApiClientOptions = {}) {
  return apiClient<T>(endpoint, { ...options, method: "GET" });
};

apiClient.post = function <T = unknown>(endpoint: string, data?: unknown, options: ApiClientOptions = {}) {
  return apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
};

apiClient.put = function <T = unknown>(endpoint: string, data?: unknown, options: ApiClientOptions = {}) {
  return apiClient<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
};

apiClient.patch = function <T = unknown>(endpoint: string, data?: unknown, options: ApiClientOptions = {}) {
  return apiClient<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
};

apiClient.delete = function <T = unknown>(endpoint: string, options: ApiClientOptions = {}) {
  return apiClient<T>(endpoint, { ...options, method: "DELETE" });
};
