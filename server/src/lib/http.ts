import type { Context } from "hono";

export interface ApiErrorBody {
  error: { code: string; message: string; champ?: string };
}

/** Format d'erreur unique de l'API (§8.2) : `{error:{code,message,champ?}}`. */
export function erreurApi(
  c: Context,
  status: 401 | 403 | 404 | 409 | 422 | 400 | 429 | 500 | 501 | 503,
  code: string,
  message: string,
  champ?: string,
) {
  return c.json<ApiErrorBody>({ error: { code, message, ...(champ ? { champ } : {}) } }, status);
}
