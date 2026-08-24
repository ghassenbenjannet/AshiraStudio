function champCsv(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur);
  if (/[",\n;]/.test(texte)) return `"${texte.replace(/"/g, '""')}"`;
  return texte;
}

/** Sérialise une liste d'objets en CSV (en-tête = colonnes explicites, séparateur `,`). */
export function versCsv(lignes: Record<string, unknown>[], colonnes: string[]): string {
  const entete = colonnes.join(",");
  const corps = lignes.map((ligne) => colonnes.map((cle) => champCsv(ligne[cle])).join(","));
  return [entete, ...corps].join("\n");
}
