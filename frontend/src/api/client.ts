const API_BASE_URL = import.meta.env.VITE_API_URL || "";

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
      `The API returned an invalid response (HTTP ${response.status}). Check that the backend is running on port 4000.`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
        (rawBody
          ? `HTTP ${response.status}: Failed request`
          : `The API returned no response (HTTP ${response.status}). Check that the backend is running on port 4000.`)
    );
  }

  return data;
}
