export async function apiFetch<T>(input: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined;

  const response = await fetch(input, {
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? data.message : "Erreur API.";
    throw new Error(message ?? "Erreur API.");
  }

  return data as T;
}
