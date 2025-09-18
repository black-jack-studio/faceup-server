import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  const response = await fetch('/api/csrf-token', { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.status}`);
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
      console.error("❌ Failed to get CSRF token:", error);
      throw new Error("Unable to secure request - please refresh the page");
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use only the first segment as URL, ignore additional segments used for cache isolation
    const [url] = queryKey as [string, ...unknown[]];
    const res = await fetch(url as string, {
      credentials: "include",
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
