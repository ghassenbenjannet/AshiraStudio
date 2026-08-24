export class ApiError extends Error {
  code: string;
  status: number;
  champ?: string;

  constructor(status: number, code: string, message: string, champ?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.champ = champ;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

export async function api<T>(chemin: string, options: ApiOptions = {}): Promise<T> {
  const reponse = await fetch(`/api${chemin}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (reponse.status === 204) return undefined as T;

  const donnees = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    const err = donnees?.error ?? { code: "erreur_inconnue", message: "Une erreur est survenue" };
    throw new ApiError(reponse.status, err.code, err.message, err.champ);
  }

  return donnees as T;
}
