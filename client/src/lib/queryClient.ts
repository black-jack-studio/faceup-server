import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "./apiBase";

// 🔍 DEBUG: Utility to format errors for logging (avoid empty {} in logs)
export function formatErrorForLog(error: any): string {
  if (!error) return 'Unknown error';

  // If it's an Error object, extract useful properties
  if (error instanceof Error) {
    return JSON.stringify({
      ...error, // Include any custom properties first
      message: error.message, // Then override with standard properties
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
    }, null, 2);
  }

  // If it's already an object, stringify it
  if (typeof error === 'object') {
    return JSON.stringify(error, null, 2);
  }

  // Otherwise, convert to string
  return String(error);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse JSON error response first
      const errorData = await res.json();
      const error = new Error(errorData.message || res.statusText);
      // Preserve additional error properties like errorType
      Object.assign(error, errorData);
      throw error;
    } catch (parseError) {
      // If JSON parsing fails, create a generic error with status
      throw new Error(`${res.status}: ${res.statusText} `);
    }
  }
}

// 🔒 CSRF Token Cache for secure requests
let csrfTokenCache: { token: string | null; expires: number } = { token: null, expires: 0 };

// 🔒 Fetch CSRF token from server with caching
export async function fetchCSRFToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (5 min cache)
  if (csrfTokenCache.token && now < csrfTokenCache.expires) {
    return csrfTokenCache.token;
  }

  console.log("🔒 Fetching fresh CSRF token...");
  const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
    credentials: 'include',
    headers: await getManualCookieHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.status} `);
  }

  const { csrfToken } = await response.json();

  // Cache token for 5 minutes
  csrfTokenCache = {
    token: csrfToken,
    expires: now + 5 * 60 * 1000
  };

  console.log("✅ CSRF token cached successfully");
  return csrfToken;
}

// 🔒 Invalidate CSRF token cache (e.g., after login/register/logout)
export function invalidateCSRFToken() {
  csrfTokenCache = { token: null, expires: 0 };
  console.log("🔄 CSRF token cache invalidated");
}

import { CapacitorCookies } from '@capacitor/core';

// ...

// 🍪 MANUAL COOKIE INJECTION (fix for CapacitorHttp 401 issues — on native builds,
// `credentials: "include"` alone doesn't reliably attach the session cookie, so it's read
// explicitly and sent as a header instead). Needed on every request, GET included — this was
// previously only applied in apiRequest (POST/PUT/DELETE/PATCH), leaving every useQuery GET
// (stats, owned avatars, daily challenges, ...) silently 401ing on native builds instead.
//
// CapacitorCookies.getCookies() crosses the JS-to-native bridge, which has real per-call
// latency on iOS (negligible on web, where it just reads document.cookie). A page like home
// fires several queries in parallel on mount (challenges, stats, profile, coins), each
// independently calling this — a short-lived cache collapses that burst into a single native
// call instead of one per query. The cookie only ever changes on login/logout, both of which
// invalidate it explicitly, so a small TTL here is purely about coalescing concurrent reads.
let cookieHeaderCache: { promise: Promise<Record<string, string>>; expires: number } | null = null;

export function invalidateManualCookieCache() {
  cookieHeaderCache = null;
}

async function getManualCookieHeader(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cookieHeaderCache && now < cookieHeaderCache.expires) {
    return cookieHeaderCache.promise;
  }

  const promise = (async (): Promise<Record<string, string>> => {
    try {
      const cookies = await CapacitorCookies.getCookies({ url: API_BASE_URL });
      const cookieString = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      return cookieString ? { Cookie: cookieString } : {};
    } catch (cookieError) {
      console.warn("⚠️ Failed to manually inject cookies:", cookieError);
      return {};
    }
  })();

  cookieHeaderCache = { promise, expires: now + 2000 };
  return promise;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { skipCSRF?: boolean }
): Promise<Response> {
  const headers: Record<string, string> = {};

  // Add Content-Type for requests with body
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // 🔒 SECURITY: Add CSRF token for POST/PUT/DELETE requests
  if (!options?.skipCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    try {
      const csrfToken = await fetchCSRFToken();
      headers["X-CSRF-Token"] = csrfToken;
      console.log(`🔒 Added CSRF token to ${method} ${url}`);
    } catch (error) {
      console.error("❌ Failed to get CSRF token:", formatErrorForLog(error));
      throw new Error("Unable to secure request - please refresh the page");
    }
  }

  Object.assign(headers, await getManualCookieHeader());

  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // 🔍 Enhanced error logging for debugging
    console.error(`❌ API Request Failed: ${method} ${url}`);
    console.error(`🔍 Error details: `, formatErrorForLog(error));
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      // Use only the first segment as URL, ignore additional segments used for cache isolation
      const [url] = queryKey as [string, ...unknown[]];
      const headers = await getManualCookieHeader();
      const res = await fetch(`${API_BASE_URL}${url as string}`, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
