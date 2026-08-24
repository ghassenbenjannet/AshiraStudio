import PDFDocument from "pdfkit";

export interface CallSheetData {
  campagneNom: string;
  titre: string;
  date: string;
  lieu: string | null;
  heureLumiere: string | null;
  photographe: { nom: string; telephone?: string | null } | null;
  modeles: { nom: string; telephone?: string | null; tailles: Record<string, string | null | undefined> }[];
  pieces: { label: string; taille: string }[];
  looks: { nom: string; items: string[] }[];
  poses: { ordre: number; description: string; dureeMin?: number | null }[];
  materiel: { libelle: string; coche: boolean }[];
}

/** Export call sheet PDF 1 page (§4.4) : équipe avec tailles, pièces, looks, shot list, matériel, contacts. */
export function genererCallSheetPdf(donnees: CallSheetData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 36, autoFirstPage: true });

  doc.fontSize(18).text(`${donnees.titre}`, { continued: false });
  doc.fontSize(10).fillColor("#666").text(`${donnees.campagneNom} — ${donnees.date}${donnees.lieu ? ` — ${donnees.lieu}` : ""}`);
  if (donnees.heureLumiere) doc.text(`Lumière : ${donnees.heureLumiere}`);
  doc.fillColor("#000").moveDown(0.5);

  function titreSection(texte: string) {
    doc.moveDown(0.5).fontSize(12).fillColor("#000").text(texte, { underline: true }).fontSize(9).moveDown(0.2);
  }

  titreSection("Équipe");
  if (donnees.photographe) doc.text(`Photographe : ${donnees.photographe.nom}${donnees.photographe.telephone ? ` — ${donnees.photographe.telephone}` : ""}`);
  donnees.modeles.forEach((m) => {
    const tailles = Object.entries(m.tailles)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    doc.text(`Modèle : ${m.nom}${m.telephone ? ` — ${m.telephone}` : ""}${tailles ? ` (${tailles})` : ""}`);
  });

  titreSection("Pièces à apporter");
  if (donnees.pieces.length === 0) doc.text("—");
  donnees.pieces.forEach((p) => doc.text(`• ${p.label} — taille ${p.taille}`));

  titreSection("Looks");
  donnees.looks.forEach((l) => doc.text(`${l.nom} : ${l.items.join(" + ") || "—"}`));

  titreSection("Shot list");
  donnees.poses
    .sort((a, b) => a.ordre - b.ordre)
    .forEach((p) => doc.text(`${p.ordre + 1}. ${p.description}${p.dureeMin ? ` (${p.dureeMin} min)` : ""}`));

  titreSection("Matériel");
  donnees.materiel.forEach((m) => doc.text(`${m.coche ? "[x]" : "[ ]"} ${m.libelle}`));

  doc.end();
  return doc;
}
