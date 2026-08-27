const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || "";
const API_BASE_URL = rawApiUrl
  ? rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")
    ? rawApiUrl
    : `https://${rawApiUrl}`
  : "";

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

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
