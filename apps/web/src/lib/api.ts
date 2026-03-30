const API_FETCH_TIMEOUT_MS = 10_000;

function createRequestSignal(signal?: AbortSignal | null) {
  const timeoutSignal = AbortSignal.timeout(API_FETCH_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function getTextErrorMessage(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    return "errors.api";
  }

  return trimmed.slice(0, 200);
}

export async function apiFetch<T>(input: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined;
  const headers = new Headers(init?.headers);

  headers.set("X-Requested-With", "webapp-v2");
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
    signal: createRequestSignal(init?.signal),
  });

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const rawText = await response.text();
  let data: T | { message?: string } | null = null;
  let jsonParseFailed = false;

  if (rawText) {
    if (contentType.includes("application/json") || contentType.includes("+json")) {
      try {
        data = JSON.parse(rawText) as T | { message?: string };
      } catch (error) {
        jsonParseFailed = true;
        console.error("Failed to parse API JSON response", {
          input,
          status: response.status,
          contentType,
          error,
          bodyPreview: rawText.slice(0, 200),
        });
      }
    } else if (!response.ok) {
      console.error("Received non-JSON API error response", {
        input,
        status: response.status,
        contentType,
        bodyPreview: rawText.slice(0, 200),
      });
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : jsonParseFailed
          ? "errors.api"
          : getTextErrorMessage(rawText);
    throw new Error(message ?? "errors.api");
  }

  return (data ?? (rawText as T)) as T;
}
