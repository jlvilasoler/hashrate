const API_BASE = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export type ClientsResponse = { clients: Array<{ id: number; code: string; name: string; phone?: string; email?: string; address?: string; city?: string }> };
export type ClientResponse = { client: { id: number; code: string; name: string; phone?: string; email?: string; address?: string; city?: string } };

export function getClients(): Promise<ClientsResponse> {
  return api<ClientsResponse>("/api/clients");
}

export function createClient(body: { code: string; name: string; phone?: string; email?: string; address?: string; city?: string }): Promise<ClientResponse> {
  return api<ClientResponse>("/api/clients", { method: "POST", body: JSON.stringify(body) });
}

export function updateClient(id: number, body: { code?: string; name?: string; phone?: string; email?: string; address?: string; city?: string }): Promise<ClientResponse> {
  return api<ClientResponse>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
