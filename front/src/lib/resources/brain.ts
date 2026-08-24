import { api } from "../api.js";

export interface BriefQuotidien {
  date: string;
  constats: string[];
  actions: { titre: string; description: string }[];
}

export const clientBrain = {
  brief: (force = false) => api<{ donnees: BriefQuotidien }>(`/brain/brief${force ? "?force=1" : ""}`, { method: "POST" }).then((r) => r.donnees),
  question: (question: string, campagneId?: string | null) =>
    api<{ donnees: { contenu: string } }>("/brain/question", { method: "POST", body: { question, campagne_id: campagneId } }).then((r) => r.donnees),
};
