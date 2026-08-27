export function getApiBaseUrl(): string {
  // 1. Check if custom override is stored in localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("reachinbox_api_url");
    if (stored && stored.trim()) {
      return stored.trim().replace(/\/+$/, "");
    }
  }

  // 2. Check environment variable
  let rawEnv = import.meta.env.VITE_API_URL?.trim();
  if (rawEnv) {
    // If Render provided internal host name without domain (e.g. "reachinbox-backend-0zh6")
    if (!rawEnv.includes(".") && !rawEnv.startsWith("localhost")) {
      rawEnv = `${rawEnv}.onrender.com`;
    }
    if (rawEnv.startsWith("http://") || rawEnv.startsWith("https://")) {
      return rawEnv.replace(/\/+$/, "");
    }
    return `https://${rawEnv}`.replace(/\/+$/, "");
  }

  // 3. Automatic detection from browser hostname on Render:
  // e.g. reachinbox-frontend-xxxx.onrender.com -> reachinbox-backend-xxxx.onrender.com
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    return window.location.origin.replace("reachinbox-frontend", "reachinbox-backend");
  }

  // 4. Default fallback for local development (Vite proxy)
  return "";
}

export function setCustomApiUrl(url: string): void {
  if (typeof window !== "undefined") {
    const cleanUrl = url.trim().replace(/\/+$/, "");
    if (cleanUrl) {
      localStorage.setItem("reachinbox_api_url", cleanUrl);
    } else {
      localStorage.removeItem("reachinbox_api_url");
    }
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  console.log(`[API REQUEST] Fetching ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
  } catch (networkError: any) {
    console.error(`[API NETWORK ERROR] Failed to connect to ${url}:`, networkError);
    throw new Error(
      `Failed to connect to backend (${baseUrl || "localhost:4000"}). If your Render backend is waking up from idle, please allow ~20-30 seconds and retry.`
    );
  }

  const rawBody = await response.text();
  let data: { success?: boolean; error?: string } & T;

  try {
    data = rawBody ? JSON.parse(rawBody) : ({} as T);
  } catch {
    throw new Error(
      `The API returned an invalid response (HTTP ${response.status}). Check that the backend is running.`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
        (rawBody
          ? `HTTP ${response.status}: Failed request`
          : `The API returned no response (HTTP ${response.status}). Check that the backend is running.`)
    );
  }

  return data;
}
